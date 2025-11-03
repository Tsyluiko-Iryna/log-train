import { createElement, clearElement, setTextContent } from '../../utils/dom.js';
import { getSelection, clearSelection } from '../../store/session.js';
import { getTypeData, getAllWordsForLetter } from '../../data/wordSets.js';
import { texts } from '../../data/texts.js';
import { preloadImages } from '../../game/assetLoader.js';
import { createTrainManager } from '../../game/train/trainManager.js';
import { createSoundManager } from '../../game/soundManager.js';
import { createQuestionManager } from '../../game/questionManager.js';
import { createMemoryTest } from '../../game/memoryTest.js';
import { logError, logOK } from '../../utils/logger.js';
import { computeMemoryDistractors } from './distractors.js';
import { renderLockedTrain } from './trainRenderer.js';

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export default async function renderGame(appRoot, context) {
    const disposables = [];
    let trainManager = null;
    let questionManager = null;
    let memoryTest = null;
    let lockedTrain = null;
    let wagonListenersCleanup = () => {};

    try {
        const selection = getSelection();
        if (!selection) {
            context.navigate('home');
            return () => {};
        }
        const { letter, type } = selection;
        const typeData = getTypeData(letter, type);
        if (!typeData) {
            context.navigate('home');
            return () => {};
        }

        const allWords = getAllWordsForLetter(letter);
        const correctWords = typeData.correct.map(item => ({ text: item.text, file: item.file }));
        const requiredDistractors = Math.max(9 - correctWords.length, 0);

        const memoryDistractors = computeMemoryDistractors(letter, type, correctWords, requiredDistractors);

        const assets = new Set(['locomotive.png']);
        typeData.all.forEach(word => assets.add(word.file));
        memoryDistractors.forEach(word => assets.add(word.file));

        context.showLoader(texts.loader.fetchingAssets);
        await preloadImages(Array.from(assets));
        logOK('gameView', 'assetsLoaded', { count: assets.size });
        context.hideLoader();

        clearElement(appRoot);
        const stage = createElement('div', { classes: 'game-stage' });
        const toolbar = createElement('div', { classes: 'game-toolbar' });
        const backButton = createElement('button', {
            classes: ['game-toolbar__action', 'game-toolbar__action--back'],
            text: texts.game.back,
            attrs: { type: 'button' },
        });
        const info = createElement('div', {
            classes: 'game-toolbar__info',
            text: texts.game.infoTemplate(letter, type),
        });
        const checkButton = createElement('button', {
            classes: ['game-toolbar__action', 'game-toolbar__action--check'],
            text: texts.game.check,
            attrs: { type: 'button' },
        });
        toolbar.append(backButton, info, checkButton);

        // A11y: живий регіон для коротких статусних повідомлень (без зміни візуальної логіки)
        const message = createElement('div', {
            classes: 'game-stage__message',
            attrs: { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
        });
        const footer = createElement('div', { classes: 'game-footer' });
        const authorTag = createElement('div', {
            classes: 'game-author-tag',
            text: texts.game.authorPlaceholder,
        });
        const legalTag = createElement('div', {
            classes: 'game-author-tag',
            text: texts.legal,
        });
        footer.append(authorTag, legalTag);

        stage.append(toolbar, message, footer);
        appRoot.append(stage);

    // Ініціалізуємо менеджер звуку: короткі сигнали успіху/помилки та зчеплення
    // Примітка: ресурс Web Audio буде звільнено у cleanup() через soundManager.dispose()
    const soundManager = createSoundManager();
    trainManager = createTrainManager({ stageEl: stage, letter, typeData, soundManager });
        await trainManager.init();

    // Коротке повідомлення про результат перевірки (успіх/помилка)
    let statusHideTimer = null; // запобігає накладанню таймерів приховування під час швидких повторів
    const showStatus = status => {
            message.classList.remove('is-success', 'is-error', 'is-visible');
            if (status === 'success') {
                setTextContent(message, texts.game.messageSuccess);
                message.classList.add('is-success');
            } else if (status === 'error') {
                setTextContent(message, texts.game.messageError);
                message.classList.add('is-error');
            }
            message.classList.add('is-visible');
            if (statusHideTimer) {
                clearTimeout(statusHideTimer);
                statusHideTimer = null;
            }
            statusHideTimer = setTimeout(() => {
                message.classList.remove('is-success', 'is-error', 'is-visible');
                statusHideTimer = null;
            }, 1000);
        };

        const handleBack = () => {
            try {
                cleanup();
                clearSelection();
                context.navigate('home');
            } catch (error) {
                logError('game.back', error);
            }
        };

        const handleCheck = () => {
            try {
                const result = trainManager.validateTrain();
                if (!result.success) {
                    soundManager.playError();
                    showStatus('error');
                    return;
                }
                logOK('gameView', 'trainValidated', { wagons: result.order.length });
                soundManager.playSuccess();
                showStatus('success');
                checkButton.remove();
                handleTrainAssembled(result.order);
            } catch (error) {
                logError('game.check', error);
            }
        };

        backButton.addEventListener('click', handleBack);
        checkButton.addEventListener('click', handleCheck);
        disposables.push(() => backButton.removeEventListener('click', handleBack));
        disposables.push(() => checkButton.removeEventListener('click', handleCheck));

        function handleTrainAssembled(orderNodes) {
            try {
                const orderData = orderNodes.map(node => ({
                    text: node.text,
                    file: node.file,
                    type: node.type,
                    isCorrect: node.isCorrect,
                }));
                // Перед переходом до опитувань: прибираємо замки та розбираємо перетягуваний поїзд
                trainManager.detachAllLocks();
                trainManager.destroy();
                trainManager = null;
                const locked = renderLockedTrain(stage, orderData);
                lockedTrain = locked;
                setupQuestions(locked, orderData.slice(1));
            } catch (error) {
                logError('game.handleTrainAssembled', error);
            }
        }

        function setupQuestions(locked, wagons) {
            // Слухачі кліків по вагончиках у зафіксованому потязі
            wagonListenersCleanup = () => locked.removeListeners();
            questionManager = createQuestionManager({
                stageEl: stage,
                wagons,
                soundManager,
                onComplete: () => {
                    wagonListenersCleanup();
                    questionManager?.destroy();
                    locked.destroy();
                    lockedTrain = null;
                    startMemoryTest(wagons, memoryDistractors);
                },
            });

            locked.addWagonListener(car => {
                const word = car.element.dataset.word;
                const result = questionManager.evaluate(word);
                car.element.classList.add(result.correct ? 'is-correct' : 'is-error');
                setTimeout(() => {
                    car.element.classList.remove('is-correct', 'is-error');
                }, 400);
            });
        }

        function startMemoryTest(wagons, presetDistractors) {
            try {
                questionManager = null;
                memoryTest = createMemoryTest({
                    stageEl: stage,
                    letter,
                    correctWagons: wagons,
                    allWords,
                    distractors: presetDistractors,
                    soundManager,
                    onComplete: () => {
                        memoryTest?.destroy();
                        memoryTest = null;
                        renderFinalScreen();
                    },
                });
            } catch (error) {
                logError('game.startMemoryTest', error);
            }
        }

        function renderFinalScreen() {
            const finalContainer = createElement('div', { classes: 'final-screen' });
            const title = createElement('h2', { classes: 'final-screen__title', text: texts.finalScreen.title });
            const actions = createElement('div', { classes: 'final-screen__actions' });
            const back = createElement('button', {
                text: texts.finalScreen.back,
                attrs: { type: 'button' },
            });
            actions.append(back);
            finalContainer.append(title, actions);
            stage.append(finalContainer);

            const handleFinalBack = () => {
                cleanup();
                clearSelection();
                context.navigate('home');
            };
            back.addEventListener('click', handleFinalBack);
            disposables.push(() => back.removeEventListener('click', handleFinalBack));
        }

        function cleanup() {
            try {
                disposables.splice(0).forEach(dispose => {
                    try {
                        dispose();
                    } catch (error) {
                        logError('game.dispose', error);
                    }
                });
                // Погашаємо можливий активний таймер статусу, щоб уникнути гонок при переходах
                if (statusHideTimer) {
                    clearTimeout(statusHideTimer);
                    statusHideTimer = null;
                }
                wagonListenersCleanup();
                questionManager?.destroy?.();
                memoryTest?.destroy?.();
                trainManager?.destroy?.();
                lockedTrain?.destroy?.();
                // Акуратно звільняємо Web Audio ресурси (не змінює поведінку, лише прибирання)
                soundManager?.dispose?.();
                // Звільняємо посилання та ресурси після завершення етапів
                questionManager = null;
                memoryTest = null;
                trainManager = null;
                lockedTrain = null;
            } catch (error) {
                logError('game.cleanup', error);
            }
        }

        return cleanup;
    } catch (error) {
        logError('game.render', error);
        return () => {};
    }
}

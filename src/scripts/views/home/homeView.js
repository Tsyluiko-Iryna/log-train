import { createElement, clearElement } from '../../utils/dom.js';
import { texts } from '../../data/texts.js';
import { setSelection, clearSelection } from '../../store/session.js';
import { logError, logOK } from '../../utils/logger.js';
import { getImageUrl } from '../../utils/assets.js';
import { createSelectionState } from './selectionState.js';
import {
    populateLetters,
    populateTypesLexical,
    populateTypesPos,
    populatePairsDiff,
    populateTypesDiff,
} from './populators.js';

export default function renderHome(appRoot, context) {
    const disposables = [];
    let wrapper = null;
    try {
        clearSelection();
        clearElement(appRoot);

        wrapper = createElement('div', { classes: 'home-scale-wrapper' });
        const container = createElement('div', { classes: 'home-container' });
        const header = createElement('header', { classes: 'home-header' });
        const title = createElement('h1', { classes: 'home-header__title', text: texts.siteTitle });
        header.append(title);

        const gameCard = createElement('section', { classes: 'game-card' });
        const visual = createElement('div', { classes: 'game-card__visual' });
        const visualImg = createElement('img', {
            attrs: {
                src: getImageUrl('potyah.png'),
                alt: texts.images.trainAlt,
                loading: 'lazy',
            },
        });
        visual.append(visualImg);

    const cardBody = createElement('div', { classes: 'game-card__body' });
    const cardTitle = createElement('h2', { classes: 'game-card__title', text: texts.gameCard.title });
    const cardTagline = createElement('p', { classes: 'game-card__tagline', text: texts.gameCard.tagline });
    const cardDescription = createElement('p', { classes: 'game-card__description', text: texts.gameCard.description });
    cardBody.append(cardTitle, cardTagline, cardDescription);
        gameCard.append(visual, cardBody);

    // Розділ лексики (заголовок)
        const selectorsWrapper = createElement('section', { classes: 'selector-section' });
        const letterLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.lexicalLetterLabel || texts.selectors.letterLabel });
        const letterGrid = createElement('div', { classes: 'selector-grid' });
        selectorsWrapper.append(letterLabel, letterGrid);

        const typeWrapper = createElement('section', { classes: 'selector-section' });
        const typeLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel });
        const typeGrid = createElement('div', { classes: 'selector-grid' });
        typeWrapper.append(typeLabel, typeGrid);

    // Розділ позицій звука (фонеміка) під тією ж літерою
        const typeWrapperPos = createElement('section', { classes: 'selector-section' });
        const typeLabelPos = createElement('div', { classes: 'selector-section__label', text: texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel });
        const typeGridPos = createElement('div', { classes: 'selector-grid' });
        typeWrapperPos.append(typeLabelPos, typeGridPos);

    // Розділ диференціації (лише заголовок секції)
    const selectorsWrapperDiff = createElement('section', { classes: 'selector-section' });
    const pairLabelDiff = createElement('div', { classes: 'selector-section__label', text: texts.selectors.differentiationLetterLabel || texts.selectors.letterLabel });
    const pairGridDiff = createElement('div', { classes: 'selector-grid' });
    selectorsWrapperDiff.append(pairLabelDiff, pairGridDiff);

    const typeWrapperDiffTopics = createElement('section', { classes: 'selector-section' });
    const typeLabelDiffTopics = createElement('div', { classes: 'selector-section__label', text: texts.selectors.differentiationTopicLabel || texts.selectors.typeLabel });
    const typeGridDiffTopics = createElement('div', { classes: 'selector-grid' });
    typeWrapperDiffTopics.append(typeLabelDiffTopics, typeGridDiffTopics);

    const typeWrapperDiffPositions = createElement('section', { classes: 'selector-section' });
    const typeLabelDiffPositions = createElement('div', { classes: 'selector-section__label', text: texts.selectors.differentiationPositionLabel || texts.selectors.typeLabel });
    const typeGridDiffPositions = createElement('div', { classes: 'selector-grid' });
    typeWrapperDiffPositions.append(typeLabelDiffPositions, typeGridDiffPositions);

        const actionsUnified = createElement('div', { classes: 'home-actions' });
        const startButton = createElement('button', {
            text: texts.selectors.startButton,
            attrs: { type: 'button', disabled: 'true' },
        });
        actionsUnified.append(startButton);

    // Видалено необов'язковий опис під кнопкою запуску для чистішого макета

    // Нижні позначки як на ігровому екрані: автор і правовий текст у правому нижньому куті
        const gameStyleFooter = createElement('div', { classes: 'game-footer' });
        const authorTag = createElement('div', {
            classes: 'game-author-tag',
            text: texts.game.authorPlaceholder,
        });
        const legalTag = createElement('div', {
            classes: 'game-author-tag',
            text: texts.legal,
        });
        gameStyleFooter.append(authorTag, legalTag);

        container.append(
            header,
            gameCard,
            selectorsWrapper,
            typeWrapper,
            typeWrapperPos,
            selectorsWrapperDiff,
            typeWrapperDiffTopics,
            typeWrapperDiffPositions,
            actionsUnified,
            gameStyleFooter
        );
        wrapper.append(container);
        appRoot.append(wrapper);

    const state = createSelectionState();

        function refreshStartButton() {
            const ready = state.isReady();
            startButton.disabled = !ready.anyReady;
        }

        // Helper: очистити всі активні класи у type grids
        function clearAllTypeSelections() {
            [typeGrid, typeGridPos, typeGridDiffTopics, typeGridDiffPositions].forEach(grid => {
                Array.from(grid.children).forEach(child => child.classList.remove('is-active'));
            });
        }

        function handleStartClick() {
            try {
                const selection = state.getSelection();
                if (!selection) {
                    logError('home.handleStartClick', new Error('No selection available'));
                    return;
                }

                const { letter, type } = selection;

                logOK('homeView', 'startGame', { letter, type });
                // Зберігаємо вибір до навігації, щоб gameView міг його отримати
                setSelection({ letter, type });

                // Навігація запустить showLoader через роутер
                if (context?.navigate) {
                    context.navigate('game');
                }
            } catch (error) {
                logError('home.handleStartClick', error);
            }
        }

        function handleLetterClick(event) {
            try {
                const button = event.currentTarget;
                const letter = button.dataset.letter;
                state.setLetterSelection(letter);

                Array.from(letterGrid.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');

                populateTypesLexical(letter, typeGrid, typeLabel, handleTypeClick, disposables);
                populateTypesPos(letter, typeGridPos, typeLabelPos, handleTypeClickPos, disposables);
                refreshStartButton();
            } catch (error) {
                logError('home.handleLetterClick', error);
            }
        }

        function handleTypeClick(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                state.setTypeSelection(type);
                clearAllTypeSelections();
                button.classList.add('is-active');
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClick', error);
            }
        }
        
        function handleTypeClickPos(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                state.setTypePosSelection(type);
                clearAllTypeSelections();
                button.classList.add('is-active');
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClickPos', error);
            }
        }

        function handlePairClickDiff(event) {
            try {
                const button = event.currentTarget;
                const pair = button.dataset.pair;
                state.setPairSelection(pair);
                Array.from(pairGridDiff.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                populateTypesDiff(pair, typeGridDiffTopics, typeGridDiffPositions, typeLabelDiffTopics, typeLabelDiffPositions, handleTypeClickDiff, disposables);
                refreshStartButton();
            } catch (error) {
                logError('home.handleLetterClickDiff', error);
            }
        }

        function handleTypeClickDiff(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                state.setTypeDiffSelection(type);
                clearAllTypeSelections();
                button.classList.add('is-active');
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClickDiff', error);
            }
        }

    // Заповнюємо всі списки
    const defaultLetter = populateLetters(letterGrid, handleLetterClick, disposables);
    const defaultPair = populatePairsDiff(pairGridDiff, handlePairClickDiff, disposables);

    // Додаємо обробник кнопки старту
    startButton.addEventListener('click', handleStartClick);
    disposables.push(() => startButton.removeEventListener('click', handleStartClick));

    // Автоматично обираємо першу літеру
    if (defaultLetter) {
        const firstBtn = letterGrid.querySelector('button');
        if (firstBtn) {
            firstBtn.classList.add('is-active');
            state.setLetterSelection(defaultLetter);
            populateTypesLexical(defaultLetter, typeGrid, typeLabel, handleTypeClick, disposables);
            populateTypesPos(defaultLetter, typeGridPos, typeLabelPos, handleTypeClickPos, disposables);
        }
    }

    // Автоматично обираємо першу пару для диференціації
    if (defaultPair) {
        const firstBtn = pairGridDiff.querySelector('button');
        if (firstBtn) {
            firstBtn.classList.add('is-active');
            state.setPairSelection(defaultPair);
            populateTypesDiff(defaultPair, typeGridDiffTopics, typeGridDiffPositions, typeLabelDiffTopics, typeLabelDiffPositions, handleTypeClickDiff, disposables);
        }
    }

    refreshStartButton();
    } catch (error) {
        logError('home.render', error);
    }

    return function cleanup() {
        disposables.forEach(dispose => {
            try {
                dispose();
            } catch (error) {
                logError('home.cleanup', error);
            }
        });
        wrapper?.remove?.();
    };
}

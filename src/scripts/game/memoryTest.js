import { createElement, setTextContent } from '../utils/dom.js';
import { texts } from '../data/texts.js';
import { logError } from '../utils/logger.js';
import { getImageUrl } from '../utils/assets.js';

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function createMemoryTest({ stageEl, letter, correctWagons, allWords, soundManager, distractors = [], onComplete }) {
    const container = createElement('section', { classes: 'memory-test' });
    const title = createElement('h3', { classes: 'memory-test__title', text: texts.memory.title });
    const grid = createElement('div', { classes: 'memory-test__grid' });
    const feedback = createElement('div', { classes: 'memory-test__feedback', text: '' });
    const actions = createElement('div', { classes: 'memory-test__actions' });
    const checkButton = createElement('button', {
        text: texts.memory.check,
        attrs: { type: 'button' },
    });
    actions.append(checkButton);
    container.append(title, grid, feedback, actions);

    stageEl.append(container);

    const correctSet = new Set(correctWagons.map(item => item.text));
    const totalCards = 9;
    const distractorCount = Math.max(totalCards - correctSet.size, 0);
    const preselected = distractors
        .filter(item => !correctSet.has(item.text))
        .slice(0, distractorCount);

    // Supplemental pool should only come from correct words of other groups, never from originally incorrect items
    const distractorPool = allWords.filter(item => item.isCorrect && !correctSet.has(item.text) && !preselected.some(sel => sel.text === item.text));
    const missing = Math.max(distractorCount - preselected.length, 0);
    const supplemental = missing > 0 ? shuffle(distractorPool).slice(0, missing) : [];
    const effectiveDistractors = [...preselected, ...supplemental];

    const cards = shuffle([
        ...correctWagons.map(item => ({ ...item, isCorrect: true })),
        ...effectiveDistractors.map(item => ({ text: item.text, file: item.file, isCorrect: false })),
    ]);

    const selected = new Set();

    const listeners = [];

    const cardElements = cards.map(card => {
        const cardEl = createElement('div', { classes: 'memory-test__card' });
        const img = createElement('img', {
            classes: 'memory-test__card-image',
            attrs: {
                src: getImageUrl(card.file),
                alt: card.text,
                loading: 'lazy',
            },
        });
        const label = createElement('div', {
            classes: 'memory-test__card-label',
            text: card.text,
        });
        cardEl.append(img, label);
        cardEl.dataset.word = card.text;
        const handler = () => toggleCard(cardEl);
        cardEl.addEventListener('click', handler);
        listeners.push(() => cardEl.removeEventListener('click', handler));
        grid.append(cardEl);
        return { data: card, element: cardEl };
    });

    function toggleCard(cardEl) {
        try {
            const word = cardEl.dataset.word;
            if (selected.has(word)) {
                selected.delete(word);
                cardEl.classList.remove('is-active');
            } else {
                selected.add(word);
                cardEl.classList.add('is-active');
            }
        } catch (error) {
            logError('memory.toggleCard', error);
        }
    }

    function resetFeedback(state, message) {
        feedback.classList.remove('is-success', 'is-error');
        if (state) {
            feedback.classList.add(state);
        }
        setTextContent(feedback, message ?? '');
    }

    function evaluate() {
        try {
            const selectedWords = Array.from(selected.values());
            const hasAllCorrect = selectedWords.every(word => correctSet.has(word));
            const hasDuplicates = selectedWords.length !== new Set(selectedWords).size;
            const missing = correctSet.size !== selectedWords.filter(word => correctSet.has(word)).length;
            const extra = selectedWords.some(word => !correctSet.has(word));
            const success = hasAllCorrect && !missing && !extra && !hasDuplicates && selectedWords.length === correctSet.size;
            if (success) {
                resetFeedback('is-success', texts.memory.success);
                soundManager.playSuccess?.();
                finalize();
            } else {
                resetFeedback('is-error', texts.memory.error);
                soundManager.playError?.();
            }
        } catch (error) {
            logError('memory.evaluate', error);
        }
    }

    function finalize() {
        cardElements.forEach(({ element }) => {
            element.classList.remove('is-active');
            element.classList.add('is-blocked');
            element.style.pointerEvents = 'none';
        });
        checkButton.disabled = true;
        listeners.forEach(remove => {
            try {
                remove();
            } catch (error) {
                logError('memory.finalizeListener', error);
            }
        });
        listeners.length = 0;
        setTimeout(() => {
            container.remove();
            onComplete?.();
        }, 900);
    }

    checkButton.addEventListener('click', evaluate);

    return {
        destroy() {
            listeners.forEach(remove => {
                try {
                    remove();
                } catch (error) {
                    logError('memory.destroyListener', error);
                }
            });
            listeners.length = 0;
            checkButton.removeEventListener('click', evaluate);
            container.remove();
        },
    };
}

import { createElement, clearElement, setTextContent } from '../../utils/dom.js';
import { texts } from '../../data/texts.js';
import { listLetters, listTypes } from '../../data/wordSets.js';
import { setSelection, clearSelection } from '../../store/session.js';
import { logError } from '../../utils/logger.js';
import { attachHeightScaler } from '../../utils/scaler.js';

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
                src: '../images/potyah.png',
                alt: 'Потяг',
                loading: 'lazy',
            },
        });
        visual.append(visualImg);

        const cardBody = createElement('div', { classes: 'game-card__body' });
        const cardTitle = createElement('h2', { classes: 'game-card__title', text: texts.gameCard.title });
        const cardDescription = createElement('p', { classes: 'game-card__description', text: texts.gameCard.description });
        cardBody.append(cardTitle, cardDescription);
        gameCard.append(visual, cardBody);

        const selectorsWrapper = createElement('section', { classes: 'selector-section' });
        const letterLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.letterLabel });
        const letterGrid = createElement('div', { classes: 'selector-grid' });
        selectorsWrapper.append(letterLabel, letterGrid);

        const typeWrapper = createElement('section', { classes: 'selector-section' });
        const typeLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.typeLabel });
        const typeGrid = createElement('div', { classes: 'selector-grid' });
        typeWrapper.append(typeLabel, typeGrid);

        const actions = createElement('div', { classes: 'home-actions' });
        const startButton = createElement('button', {
            text: texts.selectors.startButton,
            attrs: { type: 'button', disabled: 'true' },
        });
        actions.append(startButton);

        const summary = createElement('p', {
            classes: 'home-summary',
            html: texts.siteSummary,
        });

        const footer = createElement('footer', {
            classes: 'home-footer',
            text: texts.legal,
        });

        container.append(header, gameCard, selectorsWrapper, typeWrapper, actions, summary, footer);
        wrapper.append(container);
        appRoot.append(wrapper);

        const scaler = attachHeightScaler(container, { margin: 16, minScale: 0.5 });
        disposables.push(() => scaler.dispose());

        let selectedLetter = null;
        let selectedType = null;

        function refreshStartButton() {
            const ready = Boolean(selectedLetter && selectedType);
            startButton.disabled = !ready;
        }

        function handleLetterClick(event) {
            try {
                const button = event.currentTarget;
                const letter = button.dataset.letter;
                selectedLetter = letter;
                selectedType = null;

                Array.from(letterGrid.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');

                populateTypes(letter);
                refreshStartButton();
            } catch (error) {
                logError('home.handleLetterClick', error);
            }
        }

        function handleTypeClick(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                selectedType = type;

                Array.from(typeGrid.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClick', error);
            }
        }

        function populateLetters() {
            try {
                clearElement(letterGrid);
                const letters = listLetters();
                letters.forEach(letter => {
                    const button = createElement('button', {
                        text: letter,
                        attrs: { type: 'button' },
                        dataset: { letter },
                    });
                    button.addEventListener('click', handleLetterClick);
                    disposables.push(() => button.removeEventListener('click', handleLetterClick));
                    letterGrid.append(button);
                });
            } catch (error) {
                logError('home.populateLetters', error);
            }
        }

        function populateTypes(letter) {
            try {
                clearElement(typeGrid);
                const types = listTypes(letter);
                if (!types.length) {
                    setTextContent(typeLabel, `${texts.selectors.typeLabel} (немає варіантів)`);
                    return;
                }
                setTextContent(typeLabel, texts.selectors.typeLabel);
                types.forEach(typeName => {
                    const button = createElement('button', {
                        text: typeName,
                        attrs: { type: 'button' },
                        dataset: { type: typeName },
                    });
                    button.addEventListener('click', handleTypeClick);
                    disposables.push(() => button.removeEventListener('click', handleTypeClick));
                    typeGrid.append(button);
                });
            } catch (error) {
                logError('home.populateTypes', error);
            }
        }

        const handleStartClick = () => {
            try {
                if (!selectedLetter || !selectedType) {
                    return;
                }
                context.showLoader(texts.loader.preparing);
                setSelection({ letter: selectedLetter, type: selectedType });
                context.navigate('game');
            } catch (error) {
                logError('home.start', error);
            }
        };

        startButton.addEventListener('click', handleStartClick);
        disposables.push(() => startButton.removeEventListener('click', handleStartClick));

        populateLetters();
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

import { createElement, clearElement, setTextContent } from '../../utils/dom.js';
import { texts } from '../../data/texts.js';
import { listLetters, listTypes } from '../../data/wordSets.js';
import { setSelection, clearSelection } from '../../store/session.js';
import { logError } from '../../utils/logger.js';
import { attachHeightScaler } from '../../utils/scaler.js';
import { getImageUrl } from '../../utils/assets.js';

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

        // LEXICAL SECTION
        const lexicalHeader = createElement('h3', { classes: 'selector-section__label', text: texts.selectors.lexicalTitle });
        const selectorsWrapper = createElement('section', { classes: 'selector-section' });
        const letterLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.lexicalLetterLabel || texts.selectors.letterLabel });
        const letterGrid = createElement('div', { classes: 'selector-grid' });
        selectorsWrapper.append(letterLabel, letterGrid);

        const typeWrapper = createElement('section', { classes: 'selector-section' });
        const typeLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel });
        const typeGrid = createElement('div', { classes: 'selector-grid' });
        typeWrapper.append(typeLabel, typeGrid);

        const actions = createElement('div', { classes: 'home-actions' });
        const startButtonLexical = createElement('button', {
            text: texts.selectors.startLexical || texts.selectors.startButton,
            attrs: { type: 'button', disabled: 'true' },
        });
        actions.append(startButtonLexical);

        // PHONEMIC SECTION
        const phonHeader = createElement('h3', { classes: 'selector-section__label', text: texts.selectors.phonemicTitle });
        const selectorsWrapperPh = createElement('section', { classes: 'selector-section' });
        const letterLabelPh = createElement('div', { classes: 'selector-section__label', text: texts.selectors.phonemicLetterLabel || texts.selectors.letterLabel });
        const letterGridPh = createElement('div', { classes: 'selector-grid' });
        selectorsWrapperPh.append(letterLabelPh, letterGridPh);

        const typeWrapperPh = createElement('section', { classes: 'selector-section' });
        const typeLabelPh = createElement('div', { classes: 'selector-section__label', text: texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel });
        const typeGridPh = createElement('div', { classes: 'selector-grid' });
        typeWrapperPh.append(typeLabelPh, typeGridPh);

        const actionsPh = createElement('div', { classes: 'home-actions' });
        const startButtonPh = createElement('button', {
            text: texts.selectors.startPhonemic || texts.selectors.startButton,
            attrs: { type: 'button', disabled: 'true' },
        });
        actionsPh.append(startButtonPh);

        const summary = createElement('p', {
            classes: 'home-summary',
            html: texts.siteSummary,
        });

        // Footer tags like on game screen: author + legal in bottom-right
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
            lexicalHeader,
            selectorsWrapper,
            typeWrapper,
            actions,
            phonHeader,
            selectorsWrapperPh,
            typeWrapperPh,
            actionsPh,
            summary,
            gameStyleFooter
        );
        wrapper.append(container);
        appRoot.append(wrapper);

    // Disable animation to avoid layout thrashing when content height changes (e.g., long type names)
    const scaler = attachHeightScaler(container, { margin: 16, minScale: 0.5, widthOffset: 10, animate: false });
        disposables.push(() => scaler.dispose());

    let selectedLetter = null; // lexical
    let selectedType = null;   // lexical
    let selectedLetterPh = null; // phonemic
    let selectedTypePh = null;   // phonemic

        function refreshStartButtons() {
            startButtonLexical.disabled = !(selectedLetter && selectedType);
            startButtonPh.disabled = !(selectedLetterPh && selectedTypePh);
        }

        function handleLetterClick(event) {
            try {
                const button = event.currentTarget;
                const letter = button.dataset.letter;
                selectedLetter = letter;
                selectedType = null;

                Array.from(letterGrid.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');

                populateTypesLexical(letter);
                refreshStartButtons();
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
                refreshStartButtons();
            } catch (error) {
                logError('home.handleTypeClick', error);
            }
        }

        function handleLetterClickPh(event) {
            try {
                const button = event.currentTarget;
                const letter = button.dataset.letter;
                selectedLetterPh = letter;
                selectedTypePh = null;

                Array.from(letterGridPh.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');

                populateTypesPhon(letter);
                refreshStartButtons();
            } catch (error) {
                logError('home.handleLetterClickPh', error);
            }
        }

        function handleTypeClickPh(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                selectedTypePh = type;

                Array.from(typeGridPh.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                refreshStartButtons();
            } catch (error) {
                logError('home.handleTypeClickPh', error);
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

        function populateLettersPh() {
            try {
                clearElement(letterGridPh);
                const letters = listLetters();
                letters.forEach(letter => {
                    const button = createElement('button', {
                        text: letter,
                        attrs: { type: 'button' },
                        dataset: { letter },
                    });
                    button.addEventListener('click', handleLetterClickPh);
                    disposables.push(() => button.removeEventListener('click', handleLetterClickPh));
                    letterGridPh.append(button);
                });
            } catch (error) {
                logError('home.populateLettersPh', error);
            }
        }

        function populateTypesLexical(letter) {
            try {
                clearElement(typeGrid);
                const types = listTypes(letter);
                if (!types.length) {
                    setTextContent(typeLabel, `${(texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
                    return;
                }
                setTextContent(typeLabel, texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel);
                const filtered = types.filter(name => !/^Звук\s/.test(name));
                filtered.forEach(typeName => {
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
                logError('home.populateTypesLexical', error);
            }
        }

        function populateTypesPhon(letter) {
            try {
                clearElement(typeGridPh);
                const all = listTypes(letter);
                const wanted = ['Звук на початку', 'Звук в середині', 'Звук у кінці'];
                const types = wanted.filter(t => all.includes(t));
                if (!types.length) {
                    setTextContent(typeLabelPh, `${(texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
                    return;
                }
                setTextContent(typeLabelPh, texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel);
                types.forEach(typeName => {
                    const button = createElement('button', {
                        text: typeName,
                        attrs: { type: 'button' },
                        dataset: { type: typeName },
                    });
                    button.addEventListener('click', handleTypeClickPh);
                    disposables.push(() => button.removeEventListener('click', handleTypeClickPh));
                    typeGridPh.append(button);
                });
            } catch (error) {
                logError('home.populateTypesPhon', error);
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

        const handleStartClickPh = () => {
            try {
                if (!selectedLetterPh || !selectedTypePh) {
                    return;
                }
                context.showLoader(texts.loader.preparing);
                setSelection({ letter: selectedLetterPh, type: selectedTypePh });
                context.navigate('game');
            } catch (error) {
                logError('home.startPh', error);
            }
        };

        startButtonLexical.addEventListener('click', handleStartClick);
        disposables.push(() => startButtonLexical.removeEventListener('click', handleStartClick));
        startButtonPh.addEventListener('click', handleStartClickPh);
        disposables.push(() => startButtonPh.removeEventListener('click', handleStartClickPh));

    populateLetters();
    populateLettersPh();
    refreshStartButtons();
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

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

    // LEXICAL SECTION (title label only)
        const selectorsWrapper = createElement('section', { classes: 'selector-section' });
        const letterLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.lexicalLetterLabel || texts.selectors.letterLabel });
        const letterGrid = createElement('div', { classes: 'selector-grid' });
        selectorsWrapper.append(letterLabel, letterGrid);

        const typeWrapper = createElement('section', { classes: 'selector-section' });
        const typeLabel = createElement('div', { classes: 'selector-section__label', text: texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel });
        const typeGrid = createElement('div', { classes: 'selector-grid' });
        typeWrapper.append(typeLabel, typeGrid);

        // We'll add a single Start button after both sections below

    // PHONEMIC SECTION (title label only)
        const selectorsWrapperPh = createElement('section', { classes: 'selector-section' });
        const letterLabelPh = createElement('div', { classes: 'selector-section__label', text: texts.selectors.phonemicLetterLabel || texts.selectors.letterLabel });
        const letterGridPh = createElement('div', { classes: 'selector-grid' });
        selectorsWrapperPh.append(letterLabelPh, letterGridPh);

        const typeWrapperPh = createElement('section', { classes: 'selector-section' });
        const typeLabelPh = createElement('div', { classes: 'selector-section__label', text: texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel });
        const typeGridPh = createElement('div', { classes: 'selector-grid' });
        typeWrapperPh.append(typeLabelPh, typeGridPh);

        // DIFFERENTIATION SECTION (title label only)
        const selectorsWrapperDiff = createElement('section', { classes: 'selector-section' });
        const letterLabelDiff = createElement('div', { classes: 'selector-section__label', text: texts.selectors.differentiationLetterLabel || texts.selectors.letterLabel });
        const letterGridDiff = createElement('div', { classes: 'selector-grid' });
        selectorsWrapperDiff.append(letterLabelDiff, letterGridDiff);

        const typeWrapperDiff = createElement('section', { classes: 'selector-section' });
        const typeLabelDiff = createElement('div', { classes: 'selector-section__label', text: texts.selectors.differentiationTypeLabel || texts.selectors.typeLabel });
        const typeGridDiff = createElement('div', { classes: 'selector-grid' });
        typeWrapperDiff.append(typeLabelDiff, typeGridDiff);

        const actionsUnified = createElement('div', { classes: 'home-actions' });
        const startButton = createElement('button', {
            text: texts.selectors.startButton,
            attrs: { type: 'button', disabled: 'true' },
        });
        actionsUnified.append(startButton);

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
            selectorsWrapper,
            typeWrapper,
            // unified start button placed after both sections
            selectorsWrapperPh,
            typeWrapperPh,
            selectorsWrapperDiff,
            typeWrapperDiff,
            actionsUnified,
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
    let selectedLetterDiff = null; // differentiation
    let selectedTypeDiff = null;   // differentiation
    let activeSection = null; // 'lex' | 'ph' | 'diff'

        function refreshStartButton() {
            const readyLex = Boolean(selectedLetter && selectedType);
            const readyPh = Boolean(selectedLetterPh && selectedTypePh);
            const readyDiff = Boolean(selectedLetterDiff && selectedTypeDiff);
            startButton.disabled = !(readyLex || readyPh || readyDiff);
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
                // Clear selection in the other section so only one theme is chosen overall
                selectedTypePh = null;
                Array.from(typeGridPh.children).forEach(child => child.classList.remove('is-active'));
                activeSection = 'lex';
                refreshStartButton();
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
                refreshStartButton();
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
                // Clear selection in the other section so only one theme is chosen overall
                selectedType = null;
                Array.from(typeGrid.children).forEach(child => child.classList.remove('is-active'));
                activeSection = 'ph';
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClickPh', error);
            }
        }

        function handleLetterClickDiff(event) {
            try {
                const button = event.currentTarget;
                const letter = button.dataset.letter;
                selectedLetterDiff = letter;
                selectedTypeDiff = null;
                Array.from(letterGridDiff.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                populateTypesDiff(letter);
                refreshStartButton();
            } catch (error) {
                logError('home.handleLetterClickDiff', error);
            }
        }

        function handleTypeClickDiff(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                selectedTypeDiff = type;
                Array.from(typeGridDiff.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                // Clear selection in the other two sections for exclusivity
                selectedType = null;
                Array.from(typeGrid.children).forEach(child => child.classList.remove('is-active'));
                selectedTypePh = null;
                Array.from(typeGridPh.children).forEach(child => child.classList.remove('is-active'));
                activeSection = 'diff';
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClickDiff', error);
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

        function populateTypesDiff(letter) {
            try {
                clearElement(typeGridDiff);
                const all = listTypes(letter);
                const types = all.filter(t => /^Диференціація/.test(t));
                if (!types.length) {
                    setTextContent(typeLabelDiff, `${(texts.selectors.differentiationTypeLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
                    return;
                }
                setTextContent(typeLabelDiff, texts.selectors.differentiationTypeLabel || texts.selectors.typeLabel);
                types.forEach(typeName => {
                    const button = createElement('button', {
                        text: typeName,
                        attrs: { type: 'button' },
                        dataset: { type: typeName },
                    });
                    button.addEventListener('click', handleTypeClickDiff);
                    disposables.push(() => button.removeEventListener('click', handleTypeClickDiff));
                    typeGridDiff.append(button);
                });
            } catch (error) {
                logError('home.populateTypesDiff', error);
            }
        }

        const handleStartClick = () => {
            try {
                const readyLex = selectedLetter && selectedType;
                const readyPh = selectedLetterPh && selectedTypePh;
                const readyDiff = selectedLetterDiff && selectedTypeDiff;
                if (!(readyLex || readyPh || readyDiff)) return;

                let use = activeSection;
                if (!use) {
                    // Fallback priority if none explicitly set: lex > ph > diff
                    use = readyLex ? 'lex' : (readyPh ? 'ph' : 'diff');
                }
                const letter = use === 'lex' ? selectedLetter : (use === 'ph' ? selectedLetterPh : selectedLetterDiff);
                const type = use === 'lex' ? selectedType : (use === 'ph' ? selectedTypePh : selectedTypeDiff);

                context.showLoader(texts.loader.preparing);
                setSelection({ letter, type });
                context.navigate('game');
            } catch (error) {
                logError('home.start', error);
            }
        };
        startButton.addEventListener('click', handleStartClick);
        disposables.push(() => startButton.removeEventListener('click', handleStartClick));

    populateLetters();
    populateLettersPh();
    // Differentiation uses the same letters
    function populateLettersDiff() {
        try {
            clearElement(letterGridDiff);
            const letters = listLetters();
            letters.forEach(letter => {
                const button = createElement('button', {
                    text: letter,
                    attrs: { type: 'button' },
                    dataset: { letter },
                });
                button.addEventListener('click', handleLetterClickDiff);
                disposables.push(() => button.removeEventListener('click', handleLetterClickDiff));
                letterGridDiff.append(button);
            });
        } catch (error) {
            logError('home.populateLettersDiff', error);
        }
    }
    populateLettersDiff();
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

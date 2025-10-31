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
            typeWrapperDiffTopics,
            typeWrapperDiffPositions,
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
    let selectedPairDiff = null; // e.g., 'Р-Л'
    let selectedLetterDiff = null; // first letter of pair
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
                // Also clear differentiation section for exclusivity across three
                selectedTypeDiff = null;
                Array.from(typeGridDiff?.children || []).forEach(child => child.classList.remove('is-active'));
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
                // Also clear differentiation section
                selectedTypeDiff = null;
                Array.from(typeGridDiff?.children || []).forEach(child => child.classList.remove('is-active'));
                activeSection = 'ph';
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClickPh', error);
            }
        }

        function handlePairClickDiff(event) {
            try {
                const button = event.currentTarget;
                const pair = button.dataset.pair;
                selectedPairDiff = pair;
                const [first] = pair.split('-');
                selectedLetterDiff = first;
                selectedTypeDiff = null;
                Array.from(pairGridDiff.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                populateTypesDiff(pair);
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
                // Clear both topics and positions highlights
                Array.from(typeGridDiffTopics.children).forEach(child => child.classList.remove('is-active'));
                Array.from(typeGridDiffPositions.children).forEach(child => child.classList.remove('is-active'));
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
                // Exclude phonemic-position and differentiation types from lexical list
                const filtered = types.filter(name => !/^Звук\s/.test(name) && !/^Диференціація/.test(name));
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

        function populateTypesDiff(pair) {
            try {
                clearElement(typeGridDiffTopics);
                clearElement(typeGridDiffPositions);
                const [a] = pair.split('-');
                const all = listTypes(a);
                const pairRe = new RegExp(`^Диференціація:\\s*${a}[-]${pair.split('-')[1]}\\s*—\\s*`);
                const matching = all.filter(t => pairRe.test(t));
                const topics = matching.filter(t => !/^(Диференціація:\s*[^—]+—\s*)?Звук/i.test(t));
                const positions = matching.filter(t => /Звук/i.test(t));

                if (!matching.length) {
                    setTextContent(typeLabelDiffTopics, `${(texts.selectors.differentiationTopicLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
                    setTextContent(typeLabelDiffPositions, `${(texts.selectors.differentiationPositionLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
                    return;
                }
                setTextContent(typeLabelDiffTopics, texts.selectors.differentiationTopicLabel || texts.selectors.typeLabel);
                setTextContent(typeLabelDiffPositions, texts.selectors.differentiationPositionLabel || texts.selectors.typeLabel);

                const addButtons = (list, grid) => {
                    list.forEach(typeName => {
                        const button = createElement('button', {
                            text: typeName.replace(pairRe, ''),
                            attrs: { type: 'button' },
                            dataset: { type: typeName },
                        });
                        button.addEventListener('click', handleTypeClickDiff);
                        disposables.push(() => button.removeEventListener('click', handleTypeClickDiff));
                        grid.append(button);
                    });
                };

                addButtons(topics, typeGridDiffTopics);
                addButtons(positions, typeGridDiffPositions);
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
    // Differentiation uses PAIRS instead of letters, e.g., 'Р-Л', 'Л-Р'
    function populatePairsDiff() {
        try {
            clearElement(pairGridDiff);
            const pairs = new Set();
            const letters = listLetters();
            const pairNameRe = /^Диференціація:\s*([А-ЯІЇЄҐA-Z])[-]([А-ЯІЇЄҐA-Z])\s*—/u;
            letters.forEach(letter => {
                const types = listTypes(letter);
                types.forEach(t => {
                    const m = t.match(pairNameRe);
                    if (m) {
                        pairs.add(`${m[1]}-${m[2]}`);
                    }
                });
            });
            Array.from(pairs).forEach(pair => {
                const button = createElement('button', {
                    text: pair,
                    attrs: { type: 'button' },
                    dataset: { pair },
                });
                button.addEventListener('click', handlePairClickDiff);
                disposables.push(() => button.removeEventListener('click', handlePairClickDiff));
                pairGridDiff.append(button);
            });
        } catch (error) {
            logError('home.populatePairsDiff', error);
        }
    }
    populatePairsDiff();
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

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

        // POSITIONS (phonemic) under the same letter selection
        const typeWrapperPos = createElement('section', { classes: 'selector-section' });
        const typeLabelPos = createElement('div', { classes: 'selector-section__label', text: texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel });
        const typeGridPos = createElement('div', { classes: 'selector-grid' });
        typeWrapperPos.append(typeLabelPos, typeGridPos);

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

        // Removed the optional summary text under the Start button for a cleaner layout

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
            typeWrapperPos,
            selectorsWrapperDiff,
            typeWrapperDiffTopics,
            typeWrapperDiffPositions,
            actionsUnified,
            gameStyleFooter
        );
        wrapper.append(container);
        appRoot.append(wrapper);

    // Disable animation to avoid layout thrashing when content height changes (e.g., long type names)
    const scaler = attachHeightScaler(container, { margin: 16, minScale: 0.5, widthOffset: 10, animate: false });
        disposables.push(() => scaler.dispose());

    let selectedLetter = null; // common for lexical and positions
    let selectedType = null;   // lexical
    let selectedTypePos = null;   // positions
    let selectedPairDiff = null; // e.g., 'Р-Л'
    let selectedLetterDiff = null; // first letter of pair
    let selectedTypeDiff = null;   // differentiation
    let activeSection = null; // 'lex' | 'pos' | 'diff'

        function refreshStartButton() {
            const readyLex = Boolean(selectedLetter && selectedType);
            const readyPos = Boolean(selectedLetter && selectedTypePos);
            const readyDiff = Boolean(selectedLetterDiff && selectedTypeDiff);
            startButton.disabled = !(readyLex || readyPos || readyDiff);
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
                populateTypesPos(letter);
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
                // Clear selection in the other section (positions) so only one theme is chosen overall
                selectedTypePos = null;
                Array.from(typeGridPos.children).forEach(child => child.classList.remove('is-active'));
                // Also clear differentiation section for exclusivity across three
                selectedTypeDiff = null;
                Array.from(typeGridDiffTopics.children).forEach(child => child.classList.remove('is-active'));
                Array.from(typeGridDiffPositions.children).forEach(child => child.classList.remove('is-active'));
                activeSection = 'lex';
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClick', error);
            }
        }
        function handleTypeClickPos(event) {
            try {
                const button = event.currentTarget;
                const type = button.dataset.type;
                selectedTypePos = type;
                Array.from(typeGridPos.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                // Clear selection in the other section (lexical)
                selectedType = null;
                Array.from(typeGrid.children).forEach(child => child.classList.remove('is-active'));
                // Also clear differentiation section
                selectedTypeDiff = null;
                Array.from(typeGridDiffTopics.children).forEach(child => child.classList.remove('is-active'));
                Array.from(typeGridDiffPositions.children).forEach(child => child.classList.remove('is-active'));
                activeSection = 'pos';
                refreshStartButton();
            } catch (error) {
                logError('home.handleTypeClickPos', error);
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
                // Clear Diff grid highlights
                Array.from(typeGridDiffTopics.children).forEach(child => child.classList.remove('is-active'));
                Array.from(typeGridDiffPositions.children).forEach(child => child.classList.remove('is-active'));
                button.classList.add('is-active');
                // Clear selection in the other two sections for exclusivity
                selectedType = null;
                Array.from(typeGrid.children).forEach(child => child.classList.remove('is-active'));
                selectedTypePos = null;
                Array.from(typeGridPos.children).forEach(child => child.classList.remove('is-active'));
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
        function populateTypesPos(letter) {
            try {
                clearElement(typeGridPos);
                const all = listTypes(letter);
                const wanted = ['Звук на початку', 'Звук в середині', 'Звук у кінці'];
                const types = wanted.filter(t => all.includes(t));
                if (!types.length) {
                    setTextContent(typeLabelPos, `${(texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
                    return;
                }
                setTextContent(typeLabelPos, texts.selectors.phonemicTypeLabel || texts.selectors.typeLabel);
                types.forEach(typeName => {
                    const button = createElement('button', {
                        text: typeName,
                        attrs: { type: 'button' },
                        dataset: { type: typeName },
                    });
                    button.addEventListener('click', handleTypeClickPos);
                    disposables.push(() => button.removeEventListener('click', handleTypeClickPos));
                    typeGridPos.append(button);
                });
            } catch (error) {
                logError('home.populateTypesPos', error);
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
                const readyPos = selectedLetter && selectedTypePos;
                const readyDiff = selectedLetterDiff && selectedTypeDiff;
                if (!(readyLex || readyPos || readyDiff)) return;

                let use = activeSection;
                if (!use) {
                    // Fallback priority if none explicitly set: lex > pos > diff
                    use = readyLex ? 'lex' : (readyPos ? 'pos' : 'diff');
                }
                const letter = use === 'diff' ? selectedLetterDiff : selectedLetter;
                const type = use === 'lex' ? selectedType : (use === 'pos' ? selectedTypePos : selectedTypeDiff);

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
            const list = Array.from(pairs).sort();
            list.forEach(pair => {
                const button = createElement('button', {
                    text: pair,
                    attrs: { type: 'button' },
                    dataset: { pair },
                });
                button.addEventListener('click', handlePairClickDiff);
                disposables.push(() => button.removeEventListener('click', handlePairClickDiff));
                pairGridDiff.append(button);
            });
            // Auto-select first pair to pre-populate diff types
            const firstBtn = pairGridDiff.querySelector('button');
            if (firstBtn) {
                firstBtn.classList.add('is-active');
                const pair = firstBtn.dataset.pair;
                selectedPairDiff = pair;
                const [first] = pair.split('-');
                selectedLetterDiff = first;
                populateTypesDiff(pair);
            }
        } catch (error) {
            logError('home.populatePairsDiff', error);
        }
    }
    populatePairsDiff();

    // Auto-select first letter to pre-populate lexical/position grids
    (function autoSelectDefaultLetter() {
        const firstBtn = letterGrid.querySelector('button');
        if (!firstBtn) return;
        firstBtn.classList.add('is-active');
        const letter = firstBtn.dataset.letter;
        selectedLetter = letter;
        populateTypesLexical(letter);
        populateTypesPos(letter);
    })();

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

// populators.js — функції заповнення списків літер, типів, пар
import { createElement, clearElement, setTextContent } from '../../utils/dom.js';
import { listLetters, listTypes } from '../../data/wordSets.js';
import { texts } from '../../data/texts.js';
import { logError } from '../../utils/logger.js';

export function populateLetters(letterGrid, onLetterClick, disposables) {
    try {
        clearElement(letterGrid);
        const letters = listLetters();
        letters.forEach(letter => {
            const button = createElement('button', {
                text: letter,
                attrs: { type: 'button' },
                dataset: { letter },
            });
            button.addEventListener('click', onLetterClick);
            disposables.push(() => button.removeEventListener('click', onLetterClick));
            letterGrid.append(button);
        });
        return letters[0] || null;
    } catch (error) {
        logError('home.populateLetters', error);
        return null;
    }
}

export function populateTypesLexical(letter, typeGrid, typeLabel, onTypeClick, disposables) {
    try {
        clearElement(typeGrid);
        const types = listTypes(letter);
        if (!types.length) {
            setTextContent(typeLabel, `${(texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel)} ${texts.selectors.noOptionsNote}`);
            return;
        }
        setTextContent(typeLabel, texts.selectors.lexicalTypeLabel || texts.selectors.typeLabel);
        const filtered = types.filter(name => !/^Звук\s/.test(name) && !/^Диференціація/.test(name));
        filtered.forEach(typeName => {
            const button = createElement('button', {
                text: typeName,
                attrs: { type: 'button' },
                dataset: { type: typeName },
            });
            button.addEventListener('click', onTypeClick);
            disposables.push(() => button.removeEventListener('click', onTypeClick));
            typeGrid.append(button);
        });
    } catch (error) {
        logError('home.populateTypesLexical', error);
    }
}

export function populateTypesPos(letter, typeGridPos, typeLabelPos, onTypeClickPos, disposables) {
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
            button.addEventListener('click', onTypeClickPos);
            disposables.push(() => button.removeEventListener('click', onTypeClickPos));
            typeGridPos.append(button);
        });
    } catch (error) {
        logError('home.populateTypesPos', error);
    }
}

export function populatePairsDiff(pairGridDiff, onPairClickDiff, disposables) {
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
            button.addEventListener('click', onPairClickDiff);
            disposables.push(() => button.removeEventListener('click', onPairClickDiff));
            pairGridDiff.append(button);
        });
        return list[0] || null;
    } catch (error) {
        logError('home.populatePairsDiff', error);
        return null;
    }
}

export function populateTypesDiff(pair, typeGridDiffTopics, typeGridDiffPositions, typeLabelDiffTopics, typeLabelDiffPositions, onTypeClickDiff, disposables) {
    try {
        clearElement(typeGridDiffTopics);
        clearElement(typeGridDiffPositions);
        const [a, b] = pair.split('-');
        const all = listTypes(a);
        const pairRe = new RegExp(`^Диференціація:\\s*${a}[-]${b}\\s*—\\s*`);
        
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
                button.addEventListener('click', onTypeClickDiff);
                disposables.push(() => button.removeEventListener('click', onTypeClickDiff));
                grid.append(button);
            });
        };

        addButtons(topics, typeGridDiffTopics);
        addButtons(positions, typeGridDiffPositions);
    } catch (error) {
        logError('home.populateTypesDiff', error);
    }
}

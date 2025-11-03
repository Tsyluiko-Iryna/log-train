// api.js — публічне API для доступу до даних слів
import { logError } from '../../utils/logger.js';
import { transformData } from './transform.js';

export const wordSets = transformData();

export function listLetters() {
    return Object.keys(wordSets);
}

export function listTypes(letter) {
    try {
        const entry = wordSets[letter];
        return entry ? Object.keys(entry.types) : [];
    } catch (error) {
        logError('wordSets.listTypes', error);
        return [];
    }
}

export function getTypeData(letter, typeName) {
    try {
        const entry = wordSets[letter];
        if (!entry) {
            return null;
        }
        return entry.types[typeName] || null;
    } catch (error) {
        logError('wordSets.getTypeData', error);
        return null;
    }
}

export function getAllWordsForLetter(letter) {
    try {
        const entry = wordSets[letter];
        if (!entry) {
            return [];
        }
        const seen = new Map();
        Object.values(entry.types).forEach(group => {
            group.all.forEach(wordEntry => {
                if (!seen.has(wordEntry.text)) {
                    seen.set(wordEntry.text, {
                        text: wordEntry.text,
                        file: wordEntry.file,
                        isCorrect: wordEntry.isCorrect,
                    });
                }
            });
        });
        return Array.from(seen.values());
    } catch (error) {
        logError('wordSets.getAllWordsForLetter', error);
        return [];
    }
}

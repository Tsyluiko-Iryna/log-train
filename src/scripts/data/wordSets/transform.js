// transform.js — трансформація сирих даних у уніфіковану структуру
import { resolveImage } from '../imageMap.js';
import { logError } from '../../utils/logger.js';
import { singleLetterWordData } from '../words/singleLetter.js';
import { pairWordData } from '../words/pairs.js';

function buildWordEntry(word, isCorrect) {
    return {
        text: word,
        file: resolveImage(word),
        isCorrect,
    };
}

export function transformData() {
    const result = {};
    try {
        // Побудова базових наборів для окремих літер (лексичні теми + позиції звука)
        Object.entries(singleLetterWordData).forEach(([letter, groups]) => {
            const types = {};
            Object.entries(groups).forEach(([typeName, payload]) => {
                const rawCorrect = Array.isArray(payload?.correct) ? payload.correct : [];
                const rawIncorrect = Array.isArray(payload?.incorrect) ? payload.incorrect : [];
                const correct = rawCorrect.map(word => buildWordEntry(word, true));
                const incorrect = rawIncorrect.map(word => buildWordEntry(word, false));
                types[typeName] = {
                    type: typeName,
                    correct,
                    incorrect,
                    all: [...correct, ...incorrect],
                };
            });
            result[letter] = {
                letter,
                types,
            };
        });

        // Додавання наборів "Диференціація" (пари)
        Object.entries(pairWordData).forEach(([pairKey, payload]) => {
            const m = pairKey.match(/^\s*([А-ЯІЇЄҐA-Z])\s*-\s*([А-ЯІЇЄҐA-Z])\s*$/u);
            if (!m) return;
            const a = m[1].toUpperCase();
            const b = m[2].toUpperCase();
            const items = Array.isArray(payload?.items) ? payload.items : [];
            if (!items.length) return;
            if (!result[a]) {
                result[a] = { letter: a, types: {} };
            }
            items.forEach(({ label, correct = [], incorrect = [] }) => {
                const typeNameA = `Диференціація: ${a}-${b} — ${label}`;
                const srcCorrect = Array.isArray(correct) ? correct : [];
                const srcIncorrect = Array.isArray(incorrect) ? incorrect : [];
                const c = srcCorrect.map(w => buildWordEntry(w, true));
                const i = srcIncorrect.map(w => buildWordEntry(w, false));
                result[a].types[typeNameA] = { type: typeNameA, correct: c, incorrect: i, all: [...c, ...i] };
            });
        });
    } catch (error) {
        logError('wordSets.transformData', error);
    }
    return result;
}

// catalog.js — нормалізований каталог (read-only) для зручної навігації по даним
import { wordSets } from './api.js';

let catalogCache = null;

function makeWord(entry) {
    return { text: entry.text, file: entry.file, isCorrect: !!entry.isCorrect };
}

function detectModeAndMeta(letter, typeName) {
    const posRe = /^Звук\s/i;
    if (posRe.test(typeName)) {
        return { mode: 'position', label: typeName, pair: null, primaryLetter: letter };
    }
    const diffRe = /^Диференціація:\s*([А-ЯІЇЄҐA-Z])[-]([А-ЯІЇЄҐA-Z])\s*—\s*(.+)$/u;
    const m = typeName.match(diffRe);
    if (m) {
        const a = m[1].toUpperCase();
        const b = m[2].toUpperCase();
        const pair = `${a}-${b}`;
        const label = m[3].trim();
        return { mode: 'diff', label, pair, primaryLetter: a };
    }
    return { mode: 'lexical', label: typeName, pair: null, primaryLetter: letter };
}

function buildCatalog() {
    const letters = Object.keys(wordSets);
    const byLetter = {};
    const types = {};
    letters.forEach(letter => {
        const entry = wordSets[letter];
        if (!entry) return;
        if (!byLetter[letter]) {
            byLetter[letter] = {
                letter,
                types: {
                    lexical: [],
                    positions: [],
                },
                pairs: {},
            };
        }
        Object.entries(entry.types).forEach(([typeName, data]) => {
            const meta = detectModeAndMeta(letter, typeName);
            const id = `${letter}|${typeName}`;
            const norm = {
                id,
                fullName: typeName,
                mode: meta.mode,
                label: meta.label,
                letters: meta.pair ? meta.pair.split('-') : [letter],
                primaryLetter: meta.primaryLetter,
                pair: meta.pair,
                correct: data.correct.map(makeWord),
                incorrect: data.incorrect.map(makeWord),
                all: data.all.map(makeWord),
            };
            types[id] = norm;
            if (meta.mode === 'lexical') {
                byLetter[letter].types.lexical.push(id);
            } else if (meta.mode === 'position') {
                byLetter[letter].types.positions.push(id);
            } else {
                const pairKey = meta.pair;
                if (!byLetter[letter].pairs[pairKey]) {
                    byLetter[letter].pairs[pairKey] = { topics: [], positions: [] };
                }
                const bucket = /^Звук/i.test(meta.label) ? 'positions' : 'topics';
                byLetter[letter].pairs[pairKey][bucket].push(id);
            }
        });
    });
    // Детерміноване сортування
    const sortByLabel = (a, b) => {
        const A = types[a].label.toLocaleLowerCase();
        const B = types[b].label.toLocaleLowerCase();
        return A.localeCompare(B);
    };
    Object.values(byLetter).forEach(b => {
        b.types.lexical.sort(sortByLabel);
        b.types.positions.sort(sortByLabel);
        Object.values(b.pairs).forEach(p => {
            p.topics.sort(sortByLabel);
            p.positions.sort(sortByLabel);
        });
    });
    return { letters, byLetter, types };
}

export function invalidateCatalog() {
    catalogCache = null;
}

export function getCatalog() {
    if (!catalogCache) {
        catalogCache = buildCatalog();
    }
    return catalogCache;
}

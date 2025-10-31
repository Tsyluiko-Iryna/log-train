import { resolveImage } from './imageMap.js';
import { logError } from '../utils/logger.js';
import { singleLetterWordData } from './words/singleLetter.js';
import { pairWordData } from './words/pairs.js';

function buildWordEntry(word, isCorrect) {
    return {
        text: word,
        file: resolveImage(word),
        isCorrect,
    };
}

function transformData() {
    const result = {};
    try {
        // Build base single-letter datasets (lexical + positions)
        Object.entries(singleLetterWordData).forEach(([letter, groups]) => {
            const types = {};
            Object.entries(groups).forEach(([typeName, payload]) => {
                const correct = payload.correct.map(word => buildWordEntry(word, true));
                const incorrect = payload.incorrect.map(word => buildWordEntry(word, false));
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

        // Inject Differentiation (pairs) datasets from external module
        // Expect keys like 'С-Ш' and items: [{ label, correct, incorrect }]
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
                const c = correct.map(w => buildWordEntry(w, true));
                const i = incorrect.map(w => buildWordEntry(w, false));
                result[a].types[typeNameA] = { type: typeNameA, correct: c, incorrect: i, all: [...c, ...i] };
            });
        });
    } catch (error) {
        logError('wordSets.transformData', error);
    }
    return result;
}

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

// --- Differentiation loader from text file ---

function normalizeWordToken(token) {
    return token
        .replace(/[\.\!\?]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function parseWordList(segment) {
    // segment is the part after "Правильні:" або "Неправильні:"
    const primary = segment.split(',');
    const tokens = primary.length > 1 ? primary : segment.split(/\s+/);
    return tokens.map(normalizeWordToken).filter(Boolean);
}

function ensureLetterEntry(letter) {
    if (!wordSets[letter]) {
        wordSets[letter] = { letter, types: {} };
    }
    return wordSets[letter];
}

function upsertDiffType(letter, typeName, correctWords, incorrectWords) {
    const entry = ensureLetterEntry(letter);
    const uniq = arr => Array.from(new Set(arr));
    const c = uniq(correctWords).map(w => buildWordEntry(w, true));
    const i = uniq(incorrectWords).map(w => buildWordEntry(w, false));
    entry.types[typeName] = { type: typeName, correct: c, incorrect: i, all: [...c, ...i] };
}

function parseDifferentiationText(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let current = null;
    const headerRe = /^\s*Диференціація\s+([А-ЯІЇЄҐA-Z])\s*[-—]\s*([А-ЯІЇЄҐA-Z])\s*$/u;
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        const m = line.match(headerRe);
        if (m) {
            if (current) blocks.push(current);
            current = { a: m[1].toUpperCase(), b: m[2].toUpperCase(), items: [] };
            continue;
        }
        if (!current) continue;
        // Expect pattern: "Label(.|:) Правильні: ... Неправильні: ..."
        const labelMatch = line.match(/^([^\.:]+)\s*[\.:]\s*(.*)$/);
        if (!labelMatch) continue;
        const label = labelMatch[1].trim();
        const rest = labelMatch[2];
        const correctIdx = rest.indexOf('Правильні:');
        const incorrectIdx = rest.indexOf('Неправильні:');
        let correct = [];
        let incorrect = [];
        if (correctIdx !== -1) {
            const after = rest.slice(correctIdx + 'Правильні:'.length);
            // If there's also "Неправильні:" after, limit to that
            const upto = incorrectIdx !== -1 ? rest.slice(correctIdx + 'Правильні:'.length, incorrectIdx) : after;
            correct = parseWordList(upto);
        }
        if (incorrectIdx !== -1) {
            const after = rest.slice(incorrectIdx + 'Неправильні:'.length);
            incorrect = parseWordList(after);
        }
        if (correct.length || incorrect.length) {
            current.items.push({ label, correct, incorrect });
        }
    }
    if (current) blocks.push(current);
    return blocks;
}

export async function loadDifferentiationFromFile(path = 'words/Диференціація.txt') {
    try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) return false;
        const text = await res.text();
        const blocks = parseDifferentiationText(text);
        blocks.forEach(({ a, b, items }) => {
            items.forEach(({ label, correct, incorrect }) => {
                const nameA = `Диференціація: ${a}-${b} — ${label}`;
                const nameB = `Диференціація: ${b}-${a} — ${label}`;
                upsertDiffType(a, nameA, correct, incorrect);
                // якщо для B ще немає цього типу — створимо дзеркально
                if (!(wordSets[b]?.types?.[nameB])) {
                    upsertDiffType(b, nameB, incorrect, correct);
                }
            });
        });
        // Invalidate catalog cache after mutation
        invalidateCatalog();
        return true;
    } catch (error) {
        logError('wordSets.loadDifferentiationFromFile', error);
        return false;
    }
}

// ---------------- Normalized Catalog (read-only) ----------------
// Provide a single, well-structured view over all game data: lexical, positions, differentiation.
// Backward-compat API (listLetters/listTypes/getTypeData) stays intact.

let catalogCache = null;

function makeWord(entry) {
    return { text: entry.text, file: entry.file, isCorrect: !!entry.isCorrect };
}

function detectModeAndMeta(letter, typeName) {
    // Returns { mode: 'lexical'|'position'|'diff', label, pair: 'A-B'|null, primaryLetter: string }
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
                pairs: {}, // pairKey => { topics:[], positions:[] }
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
    // Sort deterministically
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

function invalidateCatalog() {
    catalogCache = null;
}

export function getCatalog() {
    if (!catalogCache) {
        catalogCache = buildCatalog();
    }
    return catalogCache;
}

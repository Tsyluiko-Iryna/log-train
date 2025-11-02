import { resolveImage } from './imageMap.js';
import { logError, logInfo } from '../utils/logger.js';
import { singleLetterWordData } from './words/singleLetter.js';
import { pairWordData } from './words/pairs.js';

function buildWordEntry(word, isCorrect) {
    // Уніфікований запис слова: текст, шлях до файлу зображення та ознака правильності
    return {
        text: word,
        file: resolveImage(word),
        isCorrect,
    };
}

function transformData() {
    const result = {};
    try {
        // Побудова базових наборів для окремих літер (лексичні теми + позиції звука)
        Object.entries(singleLetterWordData).forEach(([letter, groups]) => {
            const types = {};
            Object.entries(groups).forEach(([typeName, payload]) => {
                // Страхуємося від некоректних структур даних
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

        // Додавання наборів "Диференціація" (пари) з зовнішнього модуля
        // Очікуються ключі виду 'С-Ш' та items: [{ label, correct, incorrect }]
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

export const wordSets = transformData();

export function listLetters() {
    // Повертає список усіх літер, для яких зібрані набори слів
    return Object.keys(wordSets);
}

export function listTypes(letter) {
    try {
        // Повертає всі типи (лексичні/позиційні/диференціація) для заданої літери
        const entry = wordSets[letter];
        return entry ? Object.keys(entry.types) : [];
    } catch (error) {
        logError('wordSets.listTypes', error);
        return [];
    }
}

export function getTypeData(letter, typeName) {
    try {
        // Повертає структуру даних за назвою типу для конкретної літери або null
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
        // Агрегує всі слова для літери без дублікатів (за текстом слова)
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

// --- Завантаження "Диференціації" з текстового файлу ---

function normalizeWordToken(token) {
    return token
        .replace(/[\.\!\?]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function parseWordList(segment) {
    // segment — частина після "Правильні:" або "Неправильні:"
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
        // Очікується формат: "Label(.|:) Правильні: ... Неправильні: ..."
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
            // Якщо далі є "Неправильні:", обмежуємо сегмент до цієї позиції
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
        let upserted = 0;
        let blockCount = 0;
        let itemCount = 0;
        blocks.forEach(({ a, b, items }) => {
            blockCount += 1;
            items.forEach(({ label, correct, incorrect }) => {
                itemCount += 1;
                const nameA = `Диференціація: ${a}-${b} — ${label}`;
                const nameB = `Диференціація: ${b}-${a} — ${label}`;
                const hadA = !!(wordSets[a]?.types?.[nameA]);
                upsertDiffType(a, nameA, correct, incorrect);
                if (!hadA) upserted += 1;
                // Якщо для B ще немає цього типу — створимо дзеркально
                const hadB = !!(wordSets[b]?.types?.[nameB]);
                if (!hadB) {
                    upsertDiffType(b, nameB, incorrect, correct);
                    upserted += 1;
                }
            });
        });
        // Після модифікації даних — інвалідовуємо кеш каталогу
        invalidateCatalog();
        logInfo('wordSets.loadDifferentiationFromFile', `Завантажено з ${path}: блоків=${blockCount}, елементів=${itemCount}, upsert типів=${upserted}`);
        return true;
    } catch (error) {
        logError('wordSets.loadDifferentiationFromFile', error);
        return false;
    }
}

// ---------------- Нормалізований каталог (read-only) ----------------
// Надає єдиний, структурований вигляд усіх ігрових даних: лексика, позиції, диференціація.
// API для зворотної сумісності (listLetters/listTypes/getTypeData) лишається без змін.

let catalogCache = null;

function makeWord(entry) {
    // Створює копію об'єкта слова з уніфікованими полями
    return { text: entry.text, file: entry.file, isCorrect: !!entry.isCorrect };
}

function detectModeAndMeta(letter, typeName) {
    // Повертає { mode: 'lexical'|'position'|'diff', label, pair: 'A-B'|null, primaryLetter: string }
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
                const bucket = /^Звук/i.test(meta.label) ? 'positions' : 'topics'; // класифікація у межах пари
                byLetter[letter].pairs[pairKey][bucket].push(id);
            }
        });
    });
    // Детерміноване сортування для стабільного порядку відображення
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

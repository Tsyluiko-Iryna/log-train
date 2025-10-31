import { resolveImage } from './imageMap.js';
import { logError } from '../utils/logger.js';

const rawWordData = {
    'С': {
        'Овочі': {
            correct: ['капуста', 'редиска', 'часник', 'спаржа', 'квасоля'],
            incorrect: ['сова', 'стакан'],
        },
        'Фрукти': {
            correct: ['слива', 'ананас', 'апельсин', 'персик', 'абрикос'],
            incorrect: ['костюм', 'собака'],
        },
        'Одяг': {
            correct: ['костюм', 'спідниця', 'сорочка', 'светр', 'сукня'],
            incorrect: ['часник', 'гуска'],
        },
        'Тварини': {
            correct: ['собака', 'лось', 'лисиця', 'носоріг', 'слон'],
            incorrect: ['капуста', 'светр'],
        },
        'Птахи': {
            correct: ['сова', 'сорока', 'снігур', 'ластівка', 'страус'],
            incorrect: ['спідниця', 'апельсин'],
        },
        'Посуд': {
            correct: ['стакан', 'салатниця', 'каструля', 'термос', 'сковорідка'],
            incorrect: ['квасоля', 'лисиця'],
        },
        'Звук на початку': {
            correct: ['сік', 'склянка', 'стіл', 'стілець', 'сумка'],
            incorrect: ['посилка', 'насіння'],
        },
        'Звук в середині': {
            correct: ['веселка', 'оса', 'носоріг', 'косичка', 'осел'],
            incorrect: ['сапка', 'стакан'],
        },
        'Звук у кінці': {
            correct: ['автобус', 'ананас', 'ніс', 'кокос', 'термос'],
            incorrect: ['самокат', 'сонце'],
        },
    },
    'Ш': {
        'Фрукти': {
            correct: ['шовковиця', 'груша', 'черешня', 'вишня'],
            incorrect: ['каша', 'миша', 'шапка'],
        },
        'Одяг': {
            correct: ['шорти', 'штани', 'шуба', 'шапка', 'шарф'],
            incorrect: ['вишня', 'кішка'],
        },
        'Тварини': {
            correct: ['миша', 'шиншила', 'шимпанзе', 'кішка', 'мурашка'],
            incorrect: ['вишня', 'шапка'],
        },
        'Продукти': {
            correct: ['каша', 'лаваш', 'локшина', 'шоколад', 'горошок'],
            incorrect: ['миша', 'штани'],
        },
        'Звук на початку': {
            correct: ['шафа', 'шишка', 'шуруп', 'шолом', 'шахи'],
            incorrect: ['чашка', 'мішок'],
        },
        'Звук в середині': {
            correct: ['миша', 'кошеня', 'зошит', 'дошка', 'машина'],
            incorrect: ['шапка', 'шоколад'],
        },
        'Звук у кінці': {
            correct: ['душ', 'ківш', 'аркуш', 'гуаш', 'фініш'],
            incorrect: ['гроші', 'шоколад'],
        },
    },
    'Р': {
        'Овочі': {
            correct: ['редиска', 'буряк', 'перець', 'морква', 'картопля', 'помідор'],
            incorrect: ['жираф'],
        },
        'Фрукти': {
            correct: ['смородина', 'персик', 'абрикос', 'груша', 'аґрус', 'гранат'],
            incorrect: ['сорока'],
        },
        'Одяг': {
            correct: ['сорочка', 'светр', 'сарафан', 'рукавиці', 'ремінь'],
            incorrect: ['баран', 'морква'],
        },
        'Тварини': {
            correct: ['носоріг', 'рись', 'корова', 'баран', 'тигр', 'жираф'],
            incorrect: ['рукавиці'],
        },
        'Птахи': {
            correct: ['сорока', 'снігур', 'ворона', 'журавель', 'горобець'],
            incorrect: ['помідор', 'сарафан'],
        },
        'Посуд': {
            correct: ['каструля', 'термос', 'тертка', 'сковорідка', 'тарілка'],
            incorrect: ['баран', 'картопля'],
        },
        'Звук на початку': {
            correct: ['рак', 'риба', 'ранець', 'ракета', 'равлик'],
            incorrect: ['мурашка', 'гора'],
        },
        'Звук в середині': {
            correct: ['фарба', 'курка', 'парк', 'корж', 'морж'],
            incorrect: ['риба', 'річка'],
        },
        'Звук у кінці': {
            correct: ['сир', 'катер', 'буквар', 'комар', 'бобер', 'мухомор'],
            incorrect: ['рак'],
        },
    },
    'З': {
        'Тварини': {
            correct: ['зебра', 'коза', 'зубр', 'заєць', 'змія'],
            incorrect: ['гарбуз', 'кукурудза'],
        },
        'Птахи': {
            correct: ['зозуля', 'фазан', 'зяблик', 'дрізд'],
            incorrect: ['рюкзак', 'зима', 'дзеркало'],
        },
        'Їжа': {
            correct: ['морозиво', 'зефір', 'лазанья', 'бринза', 'майонез'],
            incorrect: ['газета', 'козак'],
        },
        'Звук на початку': {
            correct: ['зубр', 'замок', 'зошит', 'зоопарк', 'закладка'],
            incorrect: ['водолаз', 'рюкзак'],
        },
        'Звук в середині': {
            correct: ['гніздо', 'козак', 'мозаїка', 'динозавр', 'рюкзак'],
            incorrect: ['зефір', 'гарбуз'],
        },
        'Звук у кінці': {
            correct: ['приз', 'гарбуз', 'мороз', 'віз', 'водолаз'],
            incorrect: ['змія', 'морозиво'],
        },
    },
    'Ж': {
        'Овочі': {
            correct: ['баклажан', 'спаржа'],
            incorrect: ['кажан', 'їжак', 'пиріжок', 'жолудь', 'гараж'],
        },
        'Одяг': {
            correct: ['піжама', 'піджак', 'жакет', 'жилетка', 'джинси'],
            incorrect: ['жук', 'баклажан'],
        },
        'Тварини': {
            correct: ['жук', 'жаба', 'їжак', 'вуж', 'морж', 'жираф'],
            incorrect: ['журнал'],
        },
        'Птахи': {
            correct: ['жайворонок', 'журавель', 'стриж', 'чиж', 'кажан'],
            incorrect: ['жаба', 'пиріжок'],
        },
        'Їжа': {
            correct: ['жуйка', 'пиріжок', 'жовток', 'ріжок', 'драже', 'желе'],
            incorrect: ['жираф'],
        },
        'Звук на початку': {
            correct: ['жакет', 'жолудь', 'жираф', 'жук', 'жовтий'],
            incorrect: ['ведмежа', 'калюжа'],
        },
        'Звук в середині': {
            correct: ['сніжок', 'баклажан', 'лежак', 'кажан', 'їжак'],
            incorrect: ['журавель', 'журнал'],
        },
        'Звук у кінці': {
            correct: ['вуж', 'морж', 'ніж', 'гараж', 'йорж'],
            incorrect: ['ложка', 'ножиці'],
        },
    },
    'Л': {
        'Тварини': {
            correct: ['лисиця', 'білка', 'лев', 'лось', 'лама', 'осел'],
            incorrect: ['лимон'],
        },
        'Їжа': {
            correct: ['картопля', 'квасоля', 'апельсин', 'слива', 'яблуко', 'малина'],
            incorrect: ['стіл'],
        },
        'Одяг': {
            correct: ['футболка', 'халат', 'лосини', 'блузка', 'жилетка'],
            incorrect: ['лев', 'велосипед'],
        },
        'Звук на початку': {
            correct: ['ліс', 'лід', 'ліки', 'лампа', 'лев'],
            incorrect: ['молоко', 'плов'],
        },
        'Звук в середині': {
            correct: ['булочка', 'телефон', 'палець', 'гойдалка', 'молоко', 'малина'],
            incorrect: ['лев'],
        },
        'Звук у кінці': {
            correct: ['пенал', 'стіл', 'дятел', 'осел', 'віл', 'овал'],
            incorrect: ['халат'],
        },
    },
};

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
        Object.entries(rawWordData).forEach(([letter, groups]) => {
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

        // Auto-generate "Differentiation" types from available datasets
        // Pairs target commonly confused sounds and reuse existing words/images
        // Each pair is symmetric: we add a type to both letters of the pair
        const DIFF_PAIRS = [
            ['С', 'Ш'],
            ['Р', 'Л'],
            ['З', 'Ж'],
        ];

        // Helper to gather a pool of correct words for a letter (exclude phonemic "Звук …" groups)
        const collectPool = (letter) => {
            const entry = result[letter];
            if (!entry) return [];
            const pool = [];
            Object.entries(entry.types).forEach(([t, data]) => {
                if (/^Звук\s/.test(t)) return; // skip phonemic-position groups
                data.correct.forEach(w => pool.push(w.text));
            });
            // De-duplicate while preserving order
            return Array.from(new Set(pool));
        };

        DIFF_PAIRS.forEach(([a, b]) => {
            const poolA = collectPool(a).slice(0, 8); // cap to keep trains manageable
            const poolB = collectPool(b).slice(0, 8);
            if (!poolA.length || !poolB.length) return;

            const typeNameA = `Диференціація: ${a} ↔ ${b}`;
            const typeNameB = `Диференціація: ${b} ↔ ${a}`;

            const makeType = (correctWords, incorrectWords, typeName) => {
                const correct = correctWords.map(w => buildWordEntry(w, true));
                const incorrect = incorrectWords.map(w => buildWordEntry(w, false));
                return { type: typeName, correct, incorrect, all: [...correct, ...incorrect] };
            };

            // Attach to A
            if (result[a]) {
                result[a].types[typeNameA] = makeType(poolA, poolB, typeNameA);
            }
            // Attach to B (mirrored)
            if (result[b]) {
                result[b].types[typeNameB] = makeType(poolB, poolA, typeNameB);
            }
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
            current = { a: m[1].toUpperCase(), b: m[2].toUpperCase(), correct: [], incorrect: [] };
            continue;
        }
        if (!current) continue;
        const correctIdx = line.indexOf('Правильні:');
        const incorrectIdx = line.indexOf('Неправильні:');
        if (correctIdx !== -1) {
            const part = line.slice(correctIdx + 'Правильні:'.length);
            current.correct.push(...parseWordList(part));
        }
        if (incorrectIdx !== -1) {
            const part = line.slice(incorrectIdx + 'Неправильні:'.length);
            current.incorrect.push(...parseWordList(part));
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
        blocks.forEach(({ a, b, correct, incorrect }) => {
            const nameA = `Диференціація: ${a} ↔ ${b}`;
            const nameB = `Диференціація: ${b} ↔ ${a}`;
            // Для блоку "A-B": правильні слова належать A, неправильні — B
            upsertDiffType(a, nameA, correct, incorrect);
            // Зворотній напрям, якщо у файлі немає окремого блоку — сформуємо симетрично
            if (!(wordSets[b]?.types?.[nameB])) {
                upsertDiffType(b, nameB, incorrect, correct);
            }
        });
        return true;
    } catch (error) {
        logError('wordSets.loadDifferentiationFromFile', error);
        return false;
    }
}

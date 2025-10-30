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

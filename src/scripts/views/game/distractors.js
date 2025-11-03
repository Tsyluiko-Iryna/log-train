// distractors.js — обчислення відволікачів для memory test
import { getCatalog } from '../../data/wordSets.js';

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function uniqByText(list) {
    const seen = new Set();
    const out = [];
    list.forEach(it => {
        if (!seen.has(it.text)) {
            seen.add(it.text);
            out.push({ text: it.text, file: it.file });
        }
    });
    return out;
}

function wordsFromTypeIds(catalog, ids) {
    const acc = [];
    ids.forEach(id => {
        const t = catalog.types[id];
        if (t?.correct?.length) {
            t.correct.forEach(w => acc.push({ text: w.text, file: w.file }));
        }
    });
    return uniqByText(acc);
}

function allCorrectWordsGlobal(catalog) {
    const acc = [];
    Object.values(catalog.types).forEach(t => {
        if (t?.correct?.length) {
            t.correct.forEach(w => acc.push({ text: w.text, file: w.file }));
        }
    });
    return uniqByText(acc);
}

export function computeMemoryDistractors(letter, typeName, correctWords, needed) {
    const catalog = getCatalog();
    const id = `${letter}|${typeName}`;
    const meta = catalog.types[id];
    
    if (!meta) {
        // Якщо немає метаданих для типу: використовуємо глобальний пул лише правильних слів, виключивши поточні
        let pool = allCorrectWordsGlobal(catalog).filter(item => !correctWords.some(w => w.text === item.text));
        return shuffle(pool).slice(0, needed);
    }
    
    let pool = [];
    if (meta.mode === 'lexical') {
        const others = catalog.byLetter[letter]?.types?.lexical?.filter(tid => tid !== id) || [];
        pool = wordsFromTypeIds(catalog, others);
        if (pool.length < needed) {
            // Розширюємо до позицій цієї ж літери (все ще тільки правильні слова)
            const posIds = catalog.byLetter[letter]?.types?.positions || [];
            const extra = wordsFromTypeIds(catalog, posIds);
            const merged = [...pool, ...extra];
            pool = uniqByText(merged);
        }
    } else if (meta.mode === 'position') {
        const others = catalog.byLetter[letter]?.types?.positions?.filter(tid => tid !== id) || [];
        pool = wordsFromTypeIds(catalog, others);
        if (pool.length < needed) {
            // Розширюємо до лексичних тем цієї ж літери (тільки правильні слова)
            const lexIds = catalog.byLetter[letter]?.types?.lexical || [];
            const extra = wordsFromTypeIds(catalog, lexIds);
            const merged = [...pool, ...extra];
            pool = uniqByText(merged);
        }
    } else if (meta.mode === 'diff') {
        const [a, b] = (meta.pair || '').split('-');
        const reverse = `${b}-${a}`;
        const bucket = /^Звук/i.test(meta.label) ? 'positions' : 'topics';
        const container = catalog.byLetter[b]?.pairs?.[reverse];
        const ids = container ? (container[bucket] || []) : [];
        pool = wordsFromTypeIds(catalog, ids);
        if (pool.length < needed) {
            // Розширюємо до іншого кошика (тематики/позиції) для другої літери
            const otherBucket = bucket === 'topics' ? 'positions' : 'topics';
            const ids2 = container ? (container[otherBucket] || []) : [];
            const extra = wordsFromTypeIds(catalog, ids2);
            pool = uniqByText([...pool, ...extra]);
        }
        if (pool.length < needed) {
            // Останній крок: додати правильні слова з основної літери (лексика та позиції)
            const lexIdsA = catalog.byLetter[a]?.types?.lexical || [];
            const posIdsA = catalog.byLetter[a]?.types?.positions || [];
            const extraA = wordsFromTypeIds(catalog, [...lexIdsA, ...posIdsA]);
            pool = uniqByText([...pool, ...extraA]);
        }
    }
    
    // Виключаємо поточні правильні слова з пулу відволікачів
    pool = pool.filter(item => !correctWords.some(w => w.text === item.text));
    if (pool.length < needed) {
        // Глобальний запасний варіант: усі правильні слова (без поточних)
        const global = allCorrectWordsGlobal(catalog).filter(item => !correctWords.some(w => w.text === item.text));
        const extra = global.filter(x => !pool.some(p => p.text === x.text));
        pool = [...pool, ...extra];
    }
    
    return shuffle(pool).slice(0, needed);
}

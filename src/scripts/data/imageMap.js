const overrides = new Map([
    ['жираф', 'жирафа.png'],
    // Узгодження словоформи: використовуємо наявне ім'я салатниця.png для слова "салатник"
    ['салатник', 'салатниця.png'],
]);

function normalize(word) {
    // Нормалізація слова для відображення у файловій назві:
    // - безпечне приведення до рядка (null/undefined -> '')
    // - нижній регістр
    // - видалення всіх пробілів
    const text = String(word ?? '').toLowerCase();
    return text.replace(/\s+/g, '');
}

export function resolveImage(word) {
    // Повертає ім'я файлу зображення для заданого слова з урахуванням overrides
    const normalized = normalize(word);
    if (overrides.has(normalized)) {
        return overrides.get(normalized);
    }
    return `${normalized}.png`;
}

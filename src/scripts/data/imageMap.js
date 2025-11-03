function normalize(word) {
    // Нормалізація слова для відображення у файловій назві:
    // - безпечне приведення до рядка (null/undefined -> '')
    // - нижній регістр
    // - видалення всіх пробілів
    const text = String(word ?? '').toLowerCase();
    return text.replace(/\s+/g, '');
}

export function resolveImage(word) {
    // Повертає ім'я файлу зображення для заданого слова
    const normalized = normalize(word);
    return `${normalized}.png`;
}

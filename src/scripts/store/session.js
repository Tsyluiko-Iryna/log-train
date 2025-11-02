// Локальний простір збереження для поточної сесії в пам'яті (не персистентний)
// Використовується для збереження вибору користувача між екранами або компонентами
const store = {
    selection: null, // поточний вибір (будь-який об'єкт або примітив)
};

/**
 * Встановити selection у тимчасовому сховищі сесії
 * @param {any} payload - довільні дані вибору (наприклад, об'єкт опцій гри)
 */
export function setSelection(payload) {
    store.selection = payload;
}

/**
 * Повернути поточний selection
 * @returns {any|null} значення selection або null якщо не встановлено
 */
export function getSelection() {
    return store.selection;
}

/**
 * Очистити selection (скинути до null)
 * Викликайте цю функцію коли потрібно почистити стан між сесіями/грами
 */
export function clearSelection() {
    store.selection = null;
}

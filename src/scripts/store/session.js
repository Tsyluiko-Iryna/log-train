// Локальний простір збереження для поточної сесії в пам'яті (не персистентний)
// Використовується для збереження вибору користувача між екранами або компонентами
const store = {
    selection: null, // поточний вибір (будь-який об'єкт або примітив)
};

/**
 * Валідує selection payload для game screen
 * @param {any} payload 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSelection(payload) {
    if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Selection must be an object' };
    }

    const requiredFields = ['letter', 'type'];
    const missingFields = requiredFields.filter(field => !(field in payload));
    
    if (missingFields.length > 0) {
        return { 
            valid: false, 
            error: `Missing required fields: ${missingFields.join(', ')}` 
        };
    }

    // Перевірка що letter не пустий
    if (typeof payload.letter !== 'string' || !payload.letter.trim()) {
        return { 
            valid: false, 
            error: `Invalid letter: must be a non-empty string` 
        };
    }

    // Перевірка що type не пустий
    if (typeof payload.type !== 'string' || !payload.type.trim()) {
        return { 
            valid: false, 
            error: `Invalid type: must be a non-empty string` 
        };
    }

    return { valid: true };
}

/**
 * Встановити selection у тимчасовому сховищі сесії
 * @param {any} payload - довільні дані вибору (наприклад, об'єкт опцій гри)
 * @throws {Error} Якщо payload не пройшов валідацію
 */
export function setSelection(payload) {
    const validation = validateSelection(payload);
    
    if (!validation.valid) {
        throw new Error(`[Session] Invalid selection: ${validation.error}`);
    }

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

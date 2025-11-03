const createTimestamp = () => new Date().toISOString();

const resolveDefaultInfoEnabled = () => {
    try {
        if (typeof window !== 'undefined' && 'LOG_INFO_ENABLED' in window) {
            return window.LOG_INFO_ENABLED !== false;
        }
    } catch {}
    try {
        if (typeof process !== 'undefined' && process.env && 'LOG_INFO_ENABLED' in process.env) {
            return process.env.LOG_INFO_ENABLED !== 'false';
        }
    } catch {}
    return true;
};

const DEFAULT_OPTIONS = {
    info: resolveDefaultInfoEnabled(),
};

let logOptions = { ...DEFAULT_OPTIONS };

export function logError(origin, error) {
    try {
        const details = error instanceof Error ? error : new Error(String(error));
        // eslint-disable-next-line no-console
        console.error(`[${createTimestamp()}][${origin}]`, details);
    } catch (consoleFailure) {
        // eslint-disable-next-line no-console
        console.error('LoggerFailure', consoleFailure);
    }
}

export function logInfo(origin, message, payload) {
    if (!logOptions.info) {
        return;
    }
    try {
        const timestamp = createTimestamp();
        if (payload !== undefined) {
            // eslint-disable-next-line no-console
            console.info(`[${timestamp}][${origin}] ${message}`, payload);
        } else {
            // eslint-disable-next-line no-console
            console.info(`[${timestamp}][${origin}] ${message}`);
        }
    } catch (consoleFailure) {
        // eslint-disable-next-line no-console
        console.error('LoggerFailure', consoleFailure);
    }
}

/**
 * Логування успішних операцій
 * @param {string} origin - Модуль/контекст
 * @param {string} action - Дія що виконана
 * @param {*} [data] - Опціональні дані
 */
export function logOK(origin, action, data) {
    if (!logOptions.info) {
        return;
    }
    try {
        const timestamp = createTimestamp();
        const prefix = `✅ OK [${timestamp}][${origin}] ${action}`;
        if (data !== undefined) {
            // eslint-disable-next-line no-console
            console.info(prefix, data);
        } else {
            // eslint-disable-next-line no-console
            console.info(prefix);
        }
    } catch (consoleFailure) {
        // eslint-disable-next-line no-console
        console.error('LoggerFailure', consoleFailure);
    }
}

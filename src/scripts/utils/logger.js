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

export function configureLogger(options = {}) {
    logOptions = {
        ...logOptions,
        ...options,
    };
}

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

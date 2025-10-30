const createTimestamp = () => new Date().toISOString();

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

import { logError } from '../utils/logger.js';

export async function preloadImages(fileNames, { onProgress } = {}) {
    const unique = Array.from(new Set(fileNames));
    const total = unique.length;
    let loaded = 0;

    const update = () => {
        loaded += 1;
        if (typeof onProgress === 'function') {
            onProgress(loaded, total);
        }
    };

    const tasks = unique.map(fileName => new Promise(resolve => {
        try {
            const img = new Image();
            img.onload = () => {
                update();
                resolve({ fileName, status: 'loaded' });
            };
            img.onerror = () => {
                logError('assetLoader.preloadImages', new Error(`Не вдалося завантажити ${fileName}`));
                update();
                resolve({ fileName, status: 'error' });
            };
            img.src = `../images/${fileName}`;
        } catch (error) {
            logError('assetLoader.task', error);
            update();
            resolve({ fileName, status: 'exception' });
        }
    }));

    return Promise.all(tasks);
}

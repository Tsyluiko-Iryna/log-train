import { logError } from '../utils/logger.js';
import { texts } from '../data/texts.js';
import { getImageUrl } from '../utils/assets.js';

export async function preloadImages(fileNames, { onProgress } = {}) {
    // 1) Унікалізуємо список і відкидаємо невалідні значення
    const unique = Array.from(new Set(Array.isArray(fileNames) ? fileNames : [])).filter(v => v != null);
    // 2) Вираховуємо валідні URL заздалегідь; порожні ігноруємо, щоб не створювати помилкові запити
    const entries = unique.map(name => ({ name, url: getImageUrl(name) }))
        .filter(item => typeof item.url === 'string' && item.url.length > 0);

    const total = entries.length;
    let loaded = 0;

    const update = () => {
        loaded += 1;
        if (typeof onProgress === 'function') {
            onProgress(loaded, total);
        }
    };

    if (total === 0) {
        // Нема чого завантажувати — віддаємо порожній результат і повідомляємо прогрес (0/0)
        if (typeof onProgress === 'function') {
            onProgress(0, 0);
        }
        return [];
    }

    const tasks = entries.map(({ name, url }) => new Promise(resolve => {
        try {
            const img = new Image();
            // Подія завантаження
            img.onload = () => {
                update();
                resolve({ fileName: name, status: 'loaded' });
            };
            // Подія помилки — лог і перехід далі без зриву всієї партії
            img.onerror = () => {
                logError('assetLoader.preloadImages', new Error(texts.errors.assetLoadFailed(name)));
                update();
                resolve({ fileName: name, status: 'error' });
            };
            // Примітка: URL уже нормалізовано в getImageUrl
            img.src = url;
        } catch (error) {
            logError('assetLoader.task', error);
            update();
            resolve({ fileName: name, status: 'exception' });
        }
    }));

    return Promise.all(tasks);
}

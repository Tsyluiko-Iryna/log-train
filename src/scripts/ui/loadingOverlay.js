import { createElement, setTextContent } from '../utils/dom.js';
import { texts } from '../data/texts.js';
import { logError } from '../utils/logger.js';

export function createLoadingOverlay(parent = document.body) {
    try {
        const overlay = createElement('div', { classes: 'loader-overlay' });
        const box = createElement('div', { classes: 'loader-box' });
        const spinner = createElement('div', { classes: 'loader-spinner' });
    // Повідомлення за замовчуванням бере з texts; у разі відсутності — використовується простий рядок
    const defaultMessage = (texts && texts.loader && texts.loader.loading) ? texts.loader.loading : 'Loading…';
        const text = createElement('div', { classes: 'loader-text', text: defaultMessage });
        const progress = createElement('div', { classes: 'loader-progress', text: '' });

    // Мінімальні атрибути доступності (не ламають існуючий API)
    // Стан видимості оверлею відображається в aria-* при show/hide
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-busy', 'false');
    // Spinner є декоративним елементом — приховуємо його від AT
    spinner.setAttribute('aria-hidden', 'true');
    // Повідомлення про завантаження оголошуються коректно для допоміжних технологій
    text.setAttribute('role', 'status');
    text.setAttribute('aria-live', 'polite');

        box.append(spinner, text, progress);
        overlay.append(box);
        parent.append(overlay);

        const api = {
            element: overlay,
            show(message) {
                if (message) {
                    setTextContent(text, message);
                }
                overlay.classList.add('is-active');
                overlay.setAttribute('aria-hidden', 'false');
                overlay.setAttribute('aria-busy', 'true');
            },
            hide() {
                overlay.classList.remove('is-active');
                overlay.setAttribute('aria-hidden', 'true');
                overlay.setAttribute('aria-busy', 'false');
            },
            updateProgress(current, total) {
                if (typeof current === 'number' && typeof total === 'number' && total > 0) {
                    setTextContent(progress, `${current} / ${total}`);
                } else {
                    setTextContent(progress, '');
                }
            },
        };

        return api;
    } catch (error) {
        logError('createLoadingOverlay', error);
        return {
            element: null,
            show() {},
            hide() {},
            updateProgress() {},
        };
    }
}

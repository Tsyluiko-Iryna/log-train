import { createElement, setTextContent } from '../utils/dom.js';
import { texts } from '../data/texts.js';
import { logError } from '../utils/logger.js';

export function createLoadingOverlay(parent = document.body) {
    try {
        const overlay = createElement('div', { classes: 'loader-overlay' });
        const box = createElement('div', { classes: 'loader-box' });
        const spinner = createElement('div', { classes: 'loader-spinner' });
    const text = createElement('div', { classes: 'loader-text', text: texts.loader.loading });
        const progress = createElement('div', { classes: 'loader-progress', text: '' });

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
            },
            hide() {
                overlay.classList.remove('is-active');
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

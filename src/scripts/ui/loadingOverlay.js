import { createElement, setTextContent } from '../utils/dom.js';
import { texts } from '../data/texts.js';
import { logError } from '../utils/logger.js';

export function createLoadingOverlay(parent = document.body) {
    try {
        const overlay = createElement('div', { classes: 'loader-overlay' });
        const box = createElement('div', { classes: 'loader-box' });
        const spinner = createElement('div', { classes: 'loader-spinner' });
        const defaultMessage = (texts && texts.loader && texts.loader.loading) ? texts.loader.loading : 'Loading…';
        const text = createElement('div', { classes: 'loader-text', text: defaultMessage });

        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-busy', 'false');
        spinner.setAttribute('aria-hidden', 'true');
        text.setAttribute('role', 'status');
        text.setAttribute('aria-live', 'polite');

        box.append(spinner, text);
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
        };

        return api;
    } catch (error) {
        logError('createLoadingOverlay', error);
        return {
            element: null,
            show() {},
            hide() {},
        };
    }
}


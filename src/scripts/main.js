import { createLoadingOverlay } from './ui/loadingOverlay.js';
import { initRouter } from './router.js';
import { logError } from './utils/logger.js';
import { texts } from './data/texts.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const appRoot = document.getElementById('app');
        if (!appRoot) {
            throw new Error('App root not found');
        }

        // Ensure document title comes from centralized texts
        try {
            if (texts?.siteTitle) {
                document.title = texts.siteTitle;
            }
        } catch {}

        const loader = createLoadingOverlay(document.body);
        initRouter({
            appRoot,
            showLoader: loader.show,
            hideLoader: loader.hide,
            updateProgress: loader.updateProgress,
        });
    } catch (error) {
        logError('main.init', error);
    }
});

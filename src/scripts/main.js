import { createLoadingOverlay } from './ui/loadingOverlay.js';
import { initRouter } from './router.js';
import { logError } from './utils/logger.js';
import { texts } from './data/texts.js';
// Differentiation data now comes from src/scripts/data/words/pairs.js via wordSets.
// No need to prefetch from text file on startup.

document.addEventListener('DOMContentLoaded', async () => {
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

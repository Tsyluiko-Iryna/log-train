import { createLoadingOverlay } from './ui/loadingOverlay.js';
import { initRouter } from './router.js';
import { logError } from './utils/logger.js';
import { texts } from './data/texts.js';
import { loadDifferentiationFromFile } from './data/wordSets.js';

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
        try {
            loader.show(texts.loader.preparing);
            await loadDifferentiationFromFile();
        } catch (e) {
            logError('main.loadDifferentiation', e);
        } finally {
            loader.hide();
        }

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

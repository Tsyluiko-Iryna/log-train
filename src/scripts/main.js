import { createLoadingOverlay } from './ui/loadingOverlay.js';
import { initRouter } from './router.js';
import { logError } from './utils/logger.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const appRoot = document.getElementById('app');
        if (!appRoot) {
            throw new Error('App root not found');
        }

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

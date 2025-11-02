import { createLoadingOverlay } from './ui/loadingOverlay.js';
import { initRouter } from './router.js';
import { logError } from './utils/logger.js';
import { texts } from './data/texts.js';
// Differentiation data now comes from src/scripts/data/words/pairs.js via wordSets.
// No need to prefetch from text file on startup.

// Robust bootstrap: handle DOM readiness, protect against failing loader,
// await router init if it returns a Promise, and ensure loader is hidden.
async function bootstrap() {
    const appRoot = document.getElementById('app');
    if (!appRoot) {
        throw new Error('App root not found');
    }

    // Create loader with safe fallback
    let loader;
    try {
        loader = createLoadingOverlay(document.body) || {};
    } catch (err) {
        logError('main.createLoadingOverlay', err);
        loader = { show: () => {}, hide: () => {}, updateProgress: () => {} };
    }

    const showLoader = typeof loader.show === 'function' ? loader.show.bind(loader) : () => {};
    const hideLoader = typeof loader.hide === 'function' ? loader.hide.bind(loader) : () => {};
    const updateProgress = typeof loader.updateProgress === 'function' ? loader.updateProgress.bind(loader) : () => {};

    try {
        // Show loader while router initializes
        try { showLoader(); } catch (e) { /* ignore show errors */ }

        // Set document title defensively
        try {
            if (texts && typeof texts.siteTitle === 'string' && texts.siteTitle.trim()) {
                document.title = texts.siteTitle;
            }
        } catch (err) {
            logError('main.setTitle', err);
        }

        // Allow initRouter to be sync or async — await Promise.resolve
        await Promise.resolve(initRouter({
            appRoot,
            showLoader,
            hideLoader,
            updateProgress,
        }));

        // Focus the app root after router mounts content for better a11y
        try { appRoot.focus(); } catch (e) { /* ignore focus errors */ }
    } catch (error) {
        logError('main.init', error);
    } finally {
        try { hideLoader(); } catch (e) { /* ignore hide errors */ }
    }
}

// Run bootstrap now or when DOM ready — protects against missed DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrap().catch(e => logError('main.bootstrap', e)));
} else {
    bootstrap().catch(e => logError('main.bootstrap', e));
}

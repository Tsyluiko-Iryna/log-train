import { logError } from './utils/logger.js';
import { texts } from './data/texts.js';

const ROUTE_LOADERS = {
    home: () => import('./views/home/homeView.js'),
    game: () => import('./views/game/gameView.js'),
};

function normalizeHash(hash) {
    if (!hash || hash === '#/' || hash === '#') {
        return 'home';
    }
    if (hash.startsWith('#/game')) {
        return 'game';
    }
    return 'home';
}

export function initRouter({ appRoot, showLoader, hideLoader, updateProgress }) {
    let currentCleanup = null;
    let isNavigating = false;

    // Fallback no-op handlers to improve robustness if not provided
    showLoader = typeof showLoader === 'function' ? showLoader : () => {};
    hideLoader = typeof hideLoader === 'function' ? hideLoader : () => {};
    updateProgress = typeof updateProgress === 'function' ? updateProgress : () => {};

    const context = {
        showLoader,
        hideLoader,
        updateProgress,
        navigate: navigateTo,
        get isNavigating() {
            return isNavigating;
        },
    };

    async function renderRoute(routeName) {
        try {
            isNavigating = true;
            showLoader(texts?.loader?.pageLoading || 'Loading...');
            if (currentCleanup) {
                try {
                    await Promise.resolve(currentCleanup());
                } catch (cleanupErr) {
                    logError('router.cleanup', cleanupErr);
                } finally {
                    currentCleanup = null;
                }
            }
            const loadModule = ROUTE_LOADERS[routeName] || ROUTE_LOADERS.home;
            const module = await loadModule();
            const render = module?.default;
            if (typeof render === 'function') {
                currentCleanup = await render(appRoot, context);
            }
        } catch (error) {
            logError('router.renderRoute', error);
        } finally {
            hideLoader();
            updateProgress();
            isNavigating = false;
        }
    }

    function navigateTo(route) {
        if (route === 'home') {
            window.location.hash = '#/';
        } else if (route === 'game') {
            window.location.hash = '#/game';
        } else {
            window.location.hash = '#/';
        }
    }

    async function handleHashChange() {
        const routeName = normalizeHash(window.location.hash);
        await renderRoute(routeName);
    }

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange().catch(error => logError('router.init', error));

    return {
        destroy() {
            window.removeEventListener('hashchange', handleHashChange);
            if (currentCleanup) {
                currentCleanup();
                currentCleanup = null;
            }
        },
    };
}

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
    let nextRoute = null; // when a navigation arrives during an ongoing navigation, queue it

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
            } else {
                // Missing render function for route — log to aid debugging
                logError('router.noRender', { routeName, module });
            }
        } catch (error) {
            logError('router.renderRoute', error);
        } finally {
            hideLoader();
            updateProgress();
            isNavigating = false;
            // If a new navigation request arrived while we were rendering,
            // handle it now (FIFO single-slot queue). This avoids parallel
            // renderRoute executions and redundant dynamic imports.
            if (nextRoute) {
                const pending = nextRoute;
                nextRoute = null;
                // fire-and-forget the pending route (it will set isNavigating)
                renderRoute(pending).catch(err => logError('router.renderPending', err));
            }
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
        // If navigation already in progress, queue the latest requested route
        if (isNavigating) {
            nextRoute = routeName;
            return;
        }
        await renderRoute(routeName);
    }

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange().catch(error => logError('router.init', error));

    return {
        // destroy may be async if the current cleanup returns a promise
        async destroy() {
            window.removeEventListener('hashchange', handleHashChange);
            // clear any queued navigation
            nextRoute = null;
            if (currentCleanup) {
                try {
                    await Promise.resolve(currentCleanup());
                } catch (err) {
                    logError('router.destroy.cleanup', err);
                } finally {
                    currentCleanup = null;
                }
            }
        },
    };
}

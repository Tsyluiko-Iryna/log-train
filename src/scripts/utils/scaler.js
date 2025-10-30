import { logError } from './logger.js';

export function attachHeightScaler(element, { margin = 32, minScale = 0.6 } = {}) {
    if (!element) {
        return { dispose() {} };
    }

    let frame = null;
    let currentScale = 1;
    let baseWidth = null;
    let baseMaxWidth = null;

    let resizeObserver = null;
    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => schedule());
        resizeObserver.observe(element);
    }

    window.addEventListener('resize', schedule);

    function schedule() {
        if (frame) {
            return;
        }
        frame = requestAnimationFrame(() => {
            frame = null;
            applyScale();
        });
    }

    function applyScale() {
        try {
            element.style.transform = 'none';
            if (baseWidth === null) {
                baseWidth = element.offsetWidth;
            }
            if (baseMaxWidth === null) {
                const maxWidthValue = window.getComputedStyle(element).maxWidth;
                const parsed = parseFloat(maxWidthValue);
                baseMaxWidth = Number.isFinite(parsed) ? parsed : element.offsetWidth;
            }

            const fullHeight = Math.max(element.scrollHeight, element.offsetHeight);
            if (!fullHeight) {
                currentScale = 1;
                element.style.transform = 'scale(1)';
                element.style.width = '';
                element.style.maxWidth = '';
                return;
            }

            const available = Math.max(window.innerHeight - margin, 0);
            const nextScale = Math.min(1, Math.max(minScale, available / fullHeight));
            currentScale = nextScale;
            element.style.transformOrigin = 'top center';

            if (currentScale < 0.999) {
                element.style.transform = `scale(${currentScale})`;
                if (baseWidth) {
                    element.style.width = `${baseWidth / currentScale}px`;
                }
                if (baseMaxWidth) {
                    element.style.maxWidth = `${baseMaxWidth / currentScale}px`;
                }
            } else {
                currentScale = 1;
                element.style.transform = 'scale(1)';
                element.style.width = '';
                element.style.maxWidth = '';
            }

            element.dataset.scale = String(currentScale);
        } catch (error) {
            logError('attachHeightScaler.applyScale', error);
        }
    }

    schedule();

    return {
        dispose() {
            try {
                if (frame) {
                    cancelAnimationFrame(frame);
                }
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
                window.removeEventListener('resize', schedule);
                element.style.transform = 'none';
                element.style.removeProperty('transform-origin');
                element.style.width = '';
                element.style.maxWidth = '';
                delete element.dataset.scale;
            } catch (error) {
                logError('attachHeightScaler.dispose', error);
            }
        },
    };
}

import { logError } from './logger.js';

export function attachHeightScaler(element, { margin = 32, minScale = 0.6, widthOffset = 0, animate = true, duration = 220, adjustWidth = true } = {}) {
    if (!element) {
        return { dispose() {} };
    }

    let frame = null;
    let currentScale = 1;
    let baseWidth = null;
    let baseMaxWidth = null;
    let didFirstApply = false;

    // Animation state
    let animRaf = null;
    let animFrom = 1;
    let animTo = 1;
    let animStart = 0;
    let animDuration = duration;

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
            // Recompute the element's natural width based on current transform scale to support window resizes
            const rect = element.getBoundingClientRect();
            if (rect && rect.width > 0 && currentScale > 0) {
                baseWidth = rect.width / currentScale;
            } else if (baseWidth === null) {
                baseWidth = element.offsetWidth;
            }
            // Max width can be derived from computed style once; if not set, fall back to current width
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
            element.style.transformOrigin = 'top center';

            // Cancel any running animation if target changes significantly
            if (animRaf) {
                cancelAnimationFrame(animRaf);
                animRaf = null;
            }

            const applyAt = (scale) => {
                if (scale < 0.999) {
                    element.style.transform = `scale(${scale})`;
                    if (adjustWidth && baseWidth) {
                        const targetWidth = (baseWidth + widthOffset) / scale;
                        element.style.width = `${targetWidth}px`;
                    }
                    if (adjustWidth && baseMaxWidth) {
                        const targetMaxWidth = (baseMaxWidth + widthOffset) / scale;
                        element.style.maxWidth = `${targetMaxWidth}px`;
                    }
                } else {
                    element.style.transform = 'scale(1)';
                    if (adjustWidth) {
                        element.style.width = '';
                        element.style.maxWidth = '';
                    }
                    scale = 1;
                }
                currentScale = scale;
                element.dataset.scale = String(currentScale);
            };

            // First paint: render at final scale, then reveal to avoid visible jump
            if (!didFirstApply) {
                applyAt(nextScale);
                if (element.style.opacity === '') {
                    // If author CSS doesn't set opacity, we can fade in gently
                    element.style.opacity = '1';
                }
                didFirstApply = true;
                return;
            }

            if (!animate) {
                applyAt(nextScale);
                return;
            }

            const delta = Math.abs(nextScale - currentScale);
            if (delta < 0.01) {
                // Tiny change – apply directly to avoid micro-jitters
                applyAt(nextScale);
                return;
            }

            // Smoothly animate scale to reduce abrupt "jump"
            animFrom = currentScale;
            animTo = nextScale;
            animStart = performance.now();
            animDuration = duration;

            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
            const step = (now) => {
                const t = Math.min(1, (now - animStart) / animDuration);
                const eased = easeOutCubic(t);
                const s = animFrom + (animTo - animFrom) * eased;
                applyAt(s);
                if (t < 1) {
                    animRaf = requestAnimationFrame(step);
                } else {
                    animRaf = null;
                }
            };
            animRaf = requestAnimationFrame(step);
        } catch (error) {
            logError('attachHeightScaler.applyScale', error);
        }
    }

    // Hide initially to prevent first-frame size pop, then reveal on first apply
    try {
        if (!element.style.opacity) {
            element.style.opacity = '0';
            // Reveal will happen in first apply
            requestAnimationFrame(() => {
                // Ensure opacity transition is smooth if author CSS defines it
                element.style.opacity = '1';
            });
        }
    } catch {}

    schedule();

    return {
        dispose() {
            try {
                if (frame) {
                    cancelAnimationFrame(frame);
                }
                if (animRaf) {
                    cancelAnimationFrame(animRaf);
                    animRaf = null;
                }
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
                window.removeEventListener('resize', schedule);
                element.style.transform = 'none';
                element.style.removeProperty('transform-origin');
                element.style.width = '';
                element.style.maxWidth = '';
                element.style.removeProperty('opacity');
                delete element.dataset.scale;
            } catch (error) {
                logError('attachHeightScaler.dispose', error);
            }
        },
    };
}

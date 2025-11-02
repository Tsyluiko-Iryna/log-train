import { logError } from './logger.js';

/**
 * Підключає ресайзер/скейлер висоти до елемента.
 * Задача: підлаштовувати масштаб (scale) елемента, щоб він вміщувався у видиму висоту вікна.
 * Параметри налаштовують відступи, мінімальний масштаб, анімацію та корекцію ширини.
 * preserveLayout=true залишає ширину/макс. ширину недоторканими; onScaleChange викликається при зміні масштабу.
 */
export function attachHeightScaler(
    element,
    {
        margin = 32,
        minScale = 0.6,
        widthOffset = 0,
        animate = true,
        duration = 220,
        adjustWidth = true,
        preserveLayout = false,
        onScaleChange = null,
    } = {},
) {
    if (!element) {
        return { dispose() {} };
    }

    let frame = null;
    let currentScale = 1;
    let baseWidth = null;
    let baseMaxWidth = null;
    let didFirstApply = false;

    // Стан анімації (для плавного переходу масштабу)
    let animRaf = null;
    let animFrom = 1;
    let animTo = 1;
    let animStart = 0;
    let animDuration = duration;

    // Використовуємо ResizeObserver за наявності для швидкого реагування на зміну розміру елемента
    let resizeObserver = null;
    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => schedule());
        resizeObserver.observe(element);
    }

    // Слідкуємо також за зміню розміру вікна
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
                if (adjustWidth && !preserveLayout) {
                    element.style.width = '';
                    element.style.maxWidth = '';
                }
                return;
            }

            const available = Math.max(window.innerHeight - margin, 0);
            const nextScale = Math.min(1, Math.max(minScale, available / fullHeight));
            // Встановлюємо точку трансформації у верхній центр для коректного масштабування
            element.style.transformOrigin = 'top center';

            // Скасовуємо поточну анімацію, якщо ціль змінилась
            if (animRaf) {
                cancelAnimationFrame(animRaf);
                animRaf = null;
            }

            // Функція застосування масштабу до елемента (без анімації)
            const applyAt = (scale) => {
                const previousScale = currentScale;
                if (scale < 0.999) {
                    element.style.transform = `scale(${scale})`;
                    if (adjustWidth && !preserveLayout && baseWidth) {
                        const targetWidth = (baseWidth + widthOffset) / scale;
                        element.style.width = `${targetWidth}px`;
                    }
                    if (adjustWidth && !preserveLayout && baseMaxWidth) {
                        const targetMaxWidth = (baseMaxWidth + widthOffset) / scale;
                        element.style.maxWidth = `${targetMaxWidth}px`;
                    }
                } else {
                    element.style.transform = 'scale(1)';
                    if (adjustWidth && !preserveLayout) {
                        element.style.width = '';
                        element.style.maxWidth = '';
                    }
                    scale = 1;
                }
                currentScale = scale;
                element.dataset.scale = String(currentScale);
                if (typeof onScaleChange === 'function' && previousScale !== currentScale) {
                    try {
                        onScaleChange(currentScale);
                    } catch (callbackError) {
                        logError('attachHeightScaler.onScaleChange', callbackError);
                    }
                }
            };

            // Перший рендер: одразу застосовуємо остаточний масштаб і відкриваємо елемент, щоб уникнути візуального стрибка
            if (!didFirstApply) {
                applyAt(nextScale);
                if (element.style.opacity === '') {
                    // If author CSS doesn't set opacity, we can fade in gently
                    element.style.opacity = '1';
                }
                didFirstApply = true;
                return;
            }

            // Якщо анімація вимкнена, відразу застосовуємо масштаб
            if (!animate) {
                applyAt(nextScale);
                return;
            }

            const delta = Math.abs(nextScale - currentScale);
            if (delta < 0.01) {
                // Дуже мала різниця — застосовуємо одразу, щоб уникнути мікро-коливань
                applyAt(nextScale);
                return;
            }

            // Smoothly animate scale to reduce abrupt "jump"
            animFrom = currentScale;
            animTo = nextScale;
            animStart = performance.now();
            animDuration = duration;

            // Функція згладжування анімації
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

    // Приховуємо елемент на початку, щоб уникнути різкого стрибка розміру в першому кадрі,
    // потім плавно показуємо при першому застосуванні масштабу
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

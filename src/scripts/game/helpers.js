import { logError } from '../utils/logger.js';

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function nextFrame() {
    return new Promise(resolve => {
        try {
            requestAnimationFrame(() => resolve());
        } catch (error) {
            logError('helpers.nextFrame', error);
            resolve();
        }
    });
}

export function randomPosition(width, height, stageRect) {
    const maxX = Math.max(stageRect.width - width - 16, 0);
    const maxY = Math.max(stageRect.height - height - 16, 0);
    return {
        x: Math.random() * maxX + 8,
        y: Math.random() * maxY + 8,
    };
}

export function isWithinStage(rect, stageRect) {
    return (
        rect.left >= stageRect.left &&
        rect.top >= stageRect.top &&
        rect.right <= stageRect.right &&
        rect.bottom <= stageRect.bottom
    );
}

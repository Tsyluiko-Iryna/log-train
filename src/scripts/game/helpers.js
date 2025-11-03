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
    // Захисні перетворення: уникаємо NaN та відʼємних значень
    const w = Math.max(Number(width) || 0, 0);
    const h = Math.max(Number(height) || 0, 0);
    const rectW = Math.max(Number(stageRect?.width) || 0, 0);
    const rectH = Math.max(Number(stageRect?.height) || 0, 0);
    if (rectW <= 0 || rectH <= 0) {
        // Якщо розмір сцени невідомий — повертаємо нульову позицію в межах безпечного відступу
        return { x: 0, y: 0 };
    }
    const maxX = Math.max(rectW - w - 16, 0);
    const maxY = Math.max(rectH - h - 16, 0);
    return {
        x: Math.random() * maxX + 8,
        y: Math.random() * maxY + 8,
    };
}

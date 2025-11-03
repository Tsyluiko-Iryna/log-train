import { logError } from '../utils/logger.js';

export function createSoundManager() {
    let audioContext = null;
    const activeNodes = new Set(); // Зберігаємо активні ноди для cleanup

    function ensureContext() {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext?.state === 'suspended') {
                audioContext.resume().catch(error => logError('sound.resume', error));
            }
            return audioContext;
        } catch (error) {
            logError('sound.ensureContext', error);
            return null;
        }
    }

    function playTone({ frequency, duration, type = 'sine', volume = 0.3, fade = true }) {
        try {
            const ctx = ensureContext();
            if (!ctx) {
                return;
            }
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            const startTime = ctx.currentTime;
            const targetVolume = Math.max(volume, 0.001);
            gain.gain.setValueAtTime(targetVolume, startTime);
            if (fade) {
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            }
            oscillator.connect(gain).connect(ctx.destination);
            
            // Додаємо до активних нод
            const nodeSet = { oscillator, gain };
            activeNodes.add(nodeSet);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
            
            // Cleanup після завершення
            oscillator.addEventListener('ended', () => {
                try { oscillator.disconnect(); } catch {}
                try { gain.disconnect(); } catch {}
                // Видаляємо з активних нод
                activeNodes.delete(nodeSet);
            });
        } catch (error) {
            logError('sound.playTone', error);
        }
    }

    async function dispose() {
        // Очищаємо всі активні осцилятори перед закриттям контексту
        try {
            for (const { oscillator, gain } of activeNodes) {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                } catch {}
                try {
                    gain.disconnect();
                } catch {}
            }
            activeNodes.clear();
        } catch (error) {
            logError('sound.disposeNodes', error);
        }

        // Закриваємо аудіо контекст
        try {
            const ctx = audioContext;
            if (ctx && typeof ctx.close === 'function' && ctx.state !== 'closed') {
                await ctx.close();
            }
        } catch (error) {
            logError('sound.dispose', error);
        } finally {
            audioContext = null;
        }
    }

    return {
        playSuccess() {
            playTone({ frequency: 880, duration: 0.2, type: 'triangle', volume: 0.22 });
            setTimeout(() => playTone({ frequency: 1046, duration: 0.25, type: 'triangle', volume: 0.2 }), 90);
        },
        playError() {
            playTone({ frequency: 260, duration: 0.32, type: 'triangle', volume: 0.18 });
            setTimeout(() => playTone({ frequency: 196, duration: 0.36, type: 'sine', volume: 0.16 }), 120);
        },
        playAttach() {
            // Короткий «клік» з підтверджувальним обертоном
            playTone({ frequency: 520, duration: 0.07, type: 'square', volume: 0.18, fade: true });
            setTimeout(() => playTone({ frequency: 780, duration: 0.08, type: 'triangle', volume: 0.16, fade: true }), 40);
        },
        playDetach() {
            // Такий же звук як і при з'єднанні
            playTone({ frequency: 520, duration: 0.07, type: 'square', volume: 0.18, fade: true });
            setTimeout(() => playTone({ frequency: 780, duration: 0.08, type: 'triangle', volume: 0.16, fade: true }), 40);
        },
        // Нова можливість: вручну відпустити аудіо-ресурси після завершення гри
        dispose,
    };
}

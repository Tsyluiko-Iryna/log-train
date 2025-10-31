import { logError } from '../utils/logger.js';

export function createSoundManager() {
    let audioContext = null;

    function ensureContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext?.state === 'suspended') {
            audioContext.resume().catch(error => logError('sound.resume', error));
        }
        return audioContext;
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
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
            oscillator.addEventListener('ended', () => {
                oscillator.disconnect();
                gain.disconnect();
            });
        } catch (error) {
            logError('sound.playTone', error);
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
            // Short mechanical "click" + light confirmation overtone
            playTone({ frequency: 520, duration: 0.07, type: 'square', volume: 0.18, fade: true });
            setTimeout(() => playTone({ frequency: 780, duration: 0.08, type: 'triangle', volume: 0.16, fade: true }), 40);
        },
    };
}

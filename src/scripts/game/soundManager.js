import { logError, logInfo } from '../utils/logger.js';

export function createSoundManager() {
    let audioContext = null;
    // Simple audio player for pre-recorded word sounds
    const audioCache = new Map(); // key: word (lowercased) -> HTMLAudioElement
    let currentAudio = null;
    let lastPlayTs = 0;

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
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
            oscillator.addEventListener('ended', () => {
                try { oscillator.disconnect(); } catch {}
                try { gain.disconnect(); } catch {}
            });
        } catch (error) {
            logError('sound.playTone', error);
        }
    }

    async function dispose() {
        // Додатковий метод для звільнення ресурсів на мобільних/слабких пристроях
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

    // ---- Word audio playback ----
    function getWordKey(text) {
        return String(text || '').trim().toLowerCase();
    }

    function getWordUrl(text) {
        const key = getWordKey(text);
        try {
            // Файли очікуються у src/audio/words/{слово}.mp3 (у нижньому регістрі)
            return new URL(`../../audio/words/${encodeURIComponent(key)}.mp3`, import.meta.url).href;
        } catch {
            return '';
        }
    }

    function getAudioForWord(text) {
        const key = getWordKey(text);
        let audio = audioCache.get(key);
        if (!audio) {
            const src = getWordUrl(key);
            audio = new Audio(src);
            audio.preload = 'auto';
            audioCache.set(key, audio);
        }
        return audio;
    }

    async function speakWord(text) {
        try {
            const now = Date.now();
            // Дебаунс, щоб не дублювати під час утримання або дуже швидких клацань
            if (now - lastPlayTs < 120) {
                return;
            }
            lastPlayTs = now;

            const key = getWordKey(text);
            if (!key) {
                return;
            }

            // Зупиняємо попередній звук без помилок
            try {
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                }
            } catch {}

            const audio = getAudioForWord(key);
            currentAudio = audio;

            // Перезапуск з початку і відтворення
            try { audio.currentTime = 0; } catch {}
            audio.onended = () => logInfo('audio.onend', 'Playback finished', { word: key });
            audio.onerror = () => logInfo('audio.onerror', 'Playback error (file missing or blocked)', { word: key, src: audio.src });
            logInfo('audio.play', 'Attempt play', { word: key, src: audio.src });
            const p = audio.play();
            if (p && typeof p.catch === 'function') {
                p.catch(err => {
                    // Ігноруємо переривання/gesture помилки, просто логуємо для діагностики
                    logError('audio.play', err?.name || err?.message || err);
                });
            }
        } catch (error) {
            logError('audio.speakWord', error);
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
        speakWord,
        // Нова можливість: вручну відпустити аудіо-ресурси після завершення гри
        dispose,
    };
}
// (TTS debug helpers removed as we now use pre-recorded audio files)

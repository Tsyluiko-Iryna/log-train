import { logError, logInfo } from '../utils/logger.js';

export function createSoundManager() {
    let audioContext = null;
    // Web Speech API TTS
    let selectedVoice = null;
    let voicesLoaded = false;
    let voicesLoadPromise = null;

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

    // ---- Text-to-Speech (Web Speech API) ----
    function ensureVoices() {
        if (voicesLoaded && selectedVoice) {
            return Promise.resolve(selectedVoice);
        }
        if (!('speechSynthesis' in window)) {
            return Promise.resolve(null);
        }
        if (!voicesLoadPromise) {
            voicesLoadPromise = new Promise(resolve => {
                // Уникаємо TDZ: оголошуємо наперед, щоб onChange міг безпечно викликати clearTimeout
                let fallbackTimer = null;
                const pickVoice = () => {
                    try {
                        const voices = window.speechSynthesis.getVoices() || [];
                        if (!voices.length) {
                            return false;
                        }
                        // Пріоритет: жіночий uk-UA (часто "Google українська"), інакше перший uk-UA, інакше перший доступний
                        const isUk = v => (v.lang || '').toLowerCase().startsWith('uk');
                        // Жендер не стандартизований у Web Speech, намагаємося за назвою
                        const looksFemale = v => /female|жіноч/i.test(v.name || '');
                        let candidate = voices.find(v => isUk(v) && /google/i.test(v.name) && looksFemale(v))
                                      || voices.find(v => isUk(v) && looksFemale(v))
                                      || voices.find(v => isUk(v))
                                      || voices[0] || null;
                        selectedVoice = candidate || null;
                        if (selectedVoice) {
                            logInfo('tts.voices', 'Selected voice', { name: selectedVoice.name, lang: selectedVoice.lang });
                        } else {
                            logInfo('tts.voices', 'No explicit voice selected, will rely on default');
                        }
                        voicesLoaded = true;
                        return true;
                    } catch (e) {
                        logError('tts.pickVoice', e);
                        selectedVoice = null;
                        voicesLoaded = true;
                        return true;
                    }
                };
                // Деякі браузери завантажують голоси асинхронно
                if (!pickVoice()) {
                    const onChange = () => {
                        if (pickVoice()) {
                            window.speechSynthesis.removeEventListener('voiceschanged', onChange);
                            if (fallbackTimer) { clearTimeout(fallbackTimer); }
                            resolve(selectedVoice);
                        }
                    };
                    window.speechSynthesis.addEventListener('voiceschanged', onChange);
                    // Резерв: спробувати ще раз через мікрозатримку
                    setTimeout(() => {
                        if (pickVoice()) {
                            window.speechSynthesis.removeEventListener('voiceschanged', onChange);
                            if (fallbackTimer) { clearTimeout(fallbackTimer); }
                            resolve(selectedVoice);
                        }
                    }, 250);
                    // Остаточний таймаут: говоримо без явного голосу
                    fallbackTimer = setTimeout(() => {
                        try { window.speechSynthesis.removeEventListener('voiceschanged', onChange); } catch {}
                        voicesLoaded = true;
                        // залишаємо selectedVoice як null — браузер підбере дефолт
                        logInfo('tts.voices', 'Fallback timeout reached, using default voice');
                        resolve(null);
                    }, 900);
                    return;
                }
                resolve(selectedVoice);
            });
        }
        return voicesLoadPromise;
    }

    async function speakWord(text) {
        try {
            if (!text || !('speechSynthesis' in window)) {
                if (!('speechSynthesis' in window)) {
                    logInfo('tts.speak', 'speechSynthesis not supported');
                }
                return;
            }
            const voice = await ensureVoices();
            const utter = new SpeechSynthesisUtterance(String(text));
            utter.lang = (selectedVoice && selectedVoice.lang) || 'uk-UA';
            utter.voice = selectedVoice || null;
            utter.rate = 1.0;
            utter.pitch = 1.0;
            utter.volume = 1.0;
            logInfo('tts.speak', 'Attempt speak', { text, lang: utter.lang, voice: voice ? { name: voice.name, lang: voice.lang } : null });
            utter.onend = () => logInfo('tts.onend', 'Utterance finished', { text });
            utter.onerror = (e) => logError('tts.onerror', e.error || e);
            // Скасовуємо попереднє, щоб уникати накладань
            try { window.speechSynthesis.cancel(); } catch {}
            // Невелика затримка після cancel() у Chrome, щоб уникнути "проковтування" першого utterance
            setTimeout(() => {
                try {
                    window.speechSynthesis.speak(utter);
                    logInfo('tts.speak', 'Speak invoked');
                } catch (e) {
                    logError('tts.speak invoke', e);
                }
            }, 30);
        } catch (error) {
            logError('tts.speakWord', error);
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

import { logError } from '../utils/logger.js';

// No-op sound manager: removes word voice-over and file/audio dependencies.
// Keeps optional UI hooks to avoid touching other modules.
export function createSoundManager() {
    function noop() {}

    return {
        // UI feedback hooks (disabled): leaving as no-ops
        playSuccess: noop,
        playError: noop,
        playAttach: noop,
        // Word voice-over removed
        speakWord: noop,
        // Resource cleanup stub
        async dispose() { try { /* nothing */ } catch (e) { logError('sound.dispose', e); } }
    };
}

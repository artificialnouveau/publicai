/**
 * Will I Have A Job? - Audio System
 *
 * Web Audio API-based sound system with autoplay restrictions handling
 */

// ============================================
// Audio Manager
// ============================================

const AudioManager = {
    context: null,
    sounds: {
        slotMachine: null,
        winner: null,
        ding: null
    },
    buffers: {},
    enabled: true,
    unlocked: false,
    volume: 0.5,
    backgroundSource: null,
    overlay: null
};

// ============================================
// Sound File Paths
// ============================================

const SOUND_PATHS = {
    slotMachine: 'assets/sounds/slot-machine.mp3',
    winner: 'assets/sounds/winner.mp3',
    ding: 'assets/sounds/ding.mp3'
};

// ============================================
// Initialize Audio System
// ============================================

/**
 * Initialize audio system with autoplay handling
 */
function initAudio() {
    // Check for Web Audio API support
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('Web Audio API not supported');
        AudioManager.enabled = false;
        return;
    }

    // Create audio context
    try {
        AudioManager.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Failed to create audio context:', e);
        AudioManager.enabled = false;
        return;
    }

    // Get audio unlock overlay
    AudioManager.overlay = document.getElementById('audio-unlock-overlay');

    // Attempt to unlock audio
    attemptAudioUnlock();

    // Set up unlock button
    const unlockBtn = document.getElementById('audio-unlock-btn');
    if (unlockBtn) {
        unlockBtn.addEventListener('click', unlockAudio);
    }
}

/**
 * Attempt to unlock audio (may fail due to browser restrictions)
 */
async function attemptAudioUnlock() {
    if (!AudioManager.enabled || AudioManager.unlocked) return;

    try {
        // Try to resume context
        if (AudioManager.context.state === 'suspended') {
            await AudioManager.context.resume();
        }

        // Try to play a silent sound to unlock
        const buffer = AudioManager.context.createBuffer(1, 1, 22050);
        const source = AudioManager.context.createBufferSource();
        source.buffer = buffer;
        source.connect(AudioManager.context.destination);
        source.start(0);

        // If we get here, audio is unlocked
        AudioManager.unlocked = true;
        hideAudioOverlay();
        loadAllSounds();

    } catch (e) {
        // Audio unlock failed - show overlay for user interaction
        showAudioOverlay();
    }
}

/**
 * Unlock audio on user interaction
 */
async function unlockAudio() {
    if (!AudioManager.enabled) return;

    try {
        if (AudioManager.context.state === 'suspended') {
            await AudioManager.context.resume();
        }

        AudioManager.unlocked = true;
        hideAudioOverlay();
        loadAllSounds();

        // Start background music
        playBackgroundMusic();

    } catch (e) {
        console.error('Failed to unlock audio:', e);
    }
}

/**
 * Show audio unlock overlay
 */
function showAudioOverlay() {
    if (AudioManager.overlay) {
        AudioManager.overlay.classList.remove('hidden');
    }
}

/**
 * Hide audio unlock overlay
 */
function hideAudioOverlay() {
    if (AudioManager.overlay) {
        AudioManager.overlay.classList.add('hidden');
    }
}

// ============================================
// Sound Loading
// ============================================

/**
 * Load all sound files
 */
async function loadAllSounds() {
    if (!AudioManager.enabled || !AudioManager.unlocked) return;

    // Load each sound
    for (const [name, path] of Object.entries(SOUND_PATHS)) {
        try {
            await loadSound(name, path);
        } catch (e) {
            console.warn(`Failed to load sound ${name}:`, e);
        }
    }
}

/**
 * Load a single sound file
 * @param {string} name - Sound identifier
 * @param {string} path - Path to sound file
 */
async function loadSound(name, path) {
    if (!AudioManager.enabled) return;

    try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await AudioManager.context.decodeAudioData(arrayBuffer);

        AudioManager.buffers[name] = audioBuffer;

    } catch (e) {
        console.warn(`Could not load sound ${name} from ${path}:`, e);
        // Don't throw - allow site to function without audio
    }
}

// ============================================
// Sound Playback
// ============================================

/**
 * Play a sound effect
 * @param {string} name - Sound identifier
 * @param {number} volume - Volume (0-1), defaults to AudioManager.volume
 */
function playSound(name, volume = null) {
    if (!AudioManager.enabled || !AudioManager.unlocked) return;

    const buffer = AudioManager.buffers[name];
    if (!buffer) {
        // Sound not loaded - fail silently
        return;
    }

    try {
        const source = AudioManager.context.createBufferSource();
        const gainNode = AudioManager.context.createGain();

        source.buffer = buffer;
        gainNode.gain.value = volume !== null ? volume : AudioManager.volume;

        source.connect(gainNode);
        gainNode.connect(AudioManager.context.destination);

        source.start(0);

    } catch (e) {
        console.error('Error playing sound:', e);
    }
}

/**
 * Play background slot machine sound (looping)
 */
function playBackgroundMusic() {
    if (!AudioManager.enabled || !AudioManager.unlocked) return;
    if (AudioManager.backgroundSource) return; // Already playing

    const buffer = AudioManager.buffers.slotMachine;
    if (!buffer) {
        // Background music not loaded - fail silently
        return;
    }

    try {
        const source = AudioManager.context.createBufferSource();
        const gainNode = AudioManager.context.createGain();

        source.buffer = buffer;
        source.loop = true;
        gainNode.gain.value = AudioManager.volume * 0.3; // Lower volume for background

        source.connect(gainNode);
        gainNode.connect(AudioManager.context.destination);

        source.start(0);

        AudioManager.backgroundSource = { source, gainNode };

    } catch (e) {
        console.error('Error playing background music:', e);
    }
}

/**
 * Stop background music
 */
function stopBackgroundMusic() {
    if (!AudioManager.backgroundSource) return;

    try {
        AudioManager.backgroundSource.source.stop();
        AudioManager.backgroundSource = null;
    } catch (e) {
        console.error('Error stopping background music:', e);
    }
}

/**
 * Fade in background music
 * @param {number} duration - Fade duration in ms
 */
function fadeInBackgroundMusic(duration = 2000) {
    if (!AudioManager.backgroundSource) return;

    const gainNode = AudioManager.backgroundSource.gainNode;
    const targetVolume = AudioManager.volume * 0.3;
    const currentTime = AudioManager.context.currentTime;

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration / 1000);
}

/**
 * Fade out background music
 * @param {number} duration - Fade duration in ms
 */
function fadeOutBackgroundMusic(duration = 2000) {
    if (!AudioManager.backgroundSource) return;

    const gainNode = AudioManager.backgroundSource.gainNode;
    const currentTime = AudioManager.context.currentTime;

    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + duration / 1000);

    setTimeout(() => {
        stopBackgroundMusic();
    }, duration);
}

/**
 * Set master volume
 * @param {number} volume - Volume (0-1)
 */
function setVolume(volume) {
    AudioManager.volume = Math.max(0, Math.min(1, volume));

    // Update background music volume if playing
    if (AudioManager.backgroundSource) {
        AudioManager.backgroundSource.gainNode.gain.value = AudioManager.volume * 0.3;
    }
}

// ============================================
// Convenience Functions for UI
// ============================================

/**
 * Play winner sound effect
 */
function playWinnerSound() {
    playSound('winner', AudioManager.volume * 0.8);
}

/**
 * Play ding sound effect
 */
function playDingSound() {
    playSound('ding', AudioManager.volume * 0.6);
}

/**
 * Play slot machine sound effect (one-shot)
 */
function playSlotMachineSound() {
    playSound('slotMachine', AudioManager.volume * 0.5);
}

// ============================================
// User Interaction Unlock Handlers
// ============================================

/**
 * Set up event listeners for first user interaction
 */
function setupUserInteractionUnlock() {
    const events = ['click', 'touchstart', 'keydown'];

    const unlockHandler = () => {
        if (!AudioManager.unlocked) {
            attemptAudioUnlock();
        }

        // Remove listeners after first interaction
        events.forEach(event => {
            document.removeEventListener(event, unlockHandler);
        });
    };

    events.forEach(event => {
        document.addEventListener(event, unlockHandler, { once: true });
    });
}

// ============================================
// Fallback: Simple HTML5 Audio (if Web Audio fails)
// ============================================

/**
 * Fallback audio player using HTML5 Audio
 */
const FallbackAudio = {
    enabled: false,
    sounds: {},

    init() {
        this.enabled = true;

        // Create audio elements
        for (const [name, path] of Object.entries(SOUND_PATHS)) {
            const audio = new Audio(path);
            audio.volume = 0.5;
            audio.preload = 'auto';
            this.sounds[name] = audio;
        }
    },

    play(name) {
        if (!this.enabled || !this.sounds[name]) return;

        try {
            this.sounds[name].currentTime = 0;
            this.sounds[name].play().catch(e => {
                console.warn('Fallback audio play failed:', e);
            });
        } catch (e) {
            console.error('Error playing fallback audio:', e);
        }
    },

    playLoop(name) {
        if (!this.enabled || !this.sounds[name]) return;

        try {
            this.sounds[name].loop = true;
            this.sounds[name].play().catch(e => {
                console.warn('Fallback audio loop failed:', e);
            });
        } catch (e) {
            console.error('Error looping fallback audio:', e);
        }
    },

    stop(name) {
        if (!this.enabled || !this.sounds[name]) return;

        try {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        } catch (e) {
            console.error('Error stopping fallback audio:', e);
        }
    }
};

// ============================================
// Initialize on DOM Load
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAudio();
        setupUserInteractionUnlock();

        // If Web Audio fails, try fallback
        setTimeout(() => {
            if (!AudioManager.enabled && !FallbackAudio.enabled) {
                // Note: Fallback audio commented out as we don't have actual sound files yet
                // FallbackAudio.init();
            }
        }, 1000);
    });
} else {
    initAudio();
    setupUserInteractionUnlock();
}

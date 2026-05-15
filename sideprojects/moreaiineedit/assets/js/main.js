/**
 * More AI I Need It Please - Main Application
 *
 * Handles tab switching, persona interactions, and mystery box functionality
 */

// ============================================
// Application State
// ============================================

const AppState = {
    currentTab: 'automation',
    urgentTimerInterval: null,
    mysteryHistory: []
};

// ============================================
// Mystery Box Services
// ============================================

const MYSTERY_SERVICES = [
    {
        icon: '🔭',
        title: 'Swarovski AX Visio AI Binoculars',
        desc: '$4,799 binoculars with built-in bird identification AI. Point at a bird, it tells you what it is. The most expensive birdwatching flex ever.'
    },
    {
        icon: '🍜',
        title: 'Nekojita FuFu',
        desc: 'A tiny robot that blows on your soup to cool it down. From Japan, because your own breath isn\'t good enough anymore.'
    },
    {
        icon: '🦾',
        title: 'Roborock Saros Z70',
        desc: 'Robot vacuum with an extendable robot arm that picks up your socks off the floor. Finally, a vacuum that also cleans up after you.'
    },
    {
        icon: '🚽',
        title: 'Kohler PureWash AI Smart Toilet',
        desc: 'Voice-controlled bidet with personalized wash profiles. "Alexa, wash my—" You get the idea. $400+ for AI-powered cleanliness.'
    },
    {
        icon: '🚲',
        title: 'Urtopia AI E-Bike',
        desc: 'An electric bike with ChatGPT on the handlebars. Ask it directions, weather, or existential questions while pedaling. $3,999.'
    },
    {
        icon: '🐦',
        title: 'Birdfy Bath Pro',
        desc: 'AI-powered bird bath with camera and species identification. Requires a subscription. Your birds now have a SaaS product.'
    },
    {
        icon: '🐾',
        title: 'Petnow AI Nose Scanner',
        desc: 'Identifies your pet by scanning their nose print, like a fingerprint but wetter. Each nose is unique, apparently.'
    },
    {
        icon: '🍷',
        title: 'Tastry AI Wine Sommelier',
        desc: 'AI that writes wine reviews without ever tasting wine. Analyzes chemical compounds to describe flavor. Sommeliers hate this one trick.'
    },
    {
        icon: '👃',
        title: 'EveryHuman AI Perfume',
        desc: 'AI designs custom fragrances it can\'t smell. Analyzes your personality quiz to create a scent. The nose knows nothing.'
    },
    {
        icon: '💋',
        title: 'Flirty AI Wingman App',
        desc: 'AI pickup line generator that crafts contextual openers from dating profile photos. Success rate: unclear. Cringe rate: high.'
    },
    {
        icon: '📌',
        title: 'Humane AI Pin',
        desc: '$699 wearable that projects a laser on your palm. Called the worst tech product ever reviewed. Now recalled for overheating.'
    },
    {
        icon: '🐇',
        title: 'Rabbit R1',
        desc: '$199 orange gadget meant to replace your phone. Reviewers called it a "useless paperweight." 100K sold before anyone tried it.'
    },
    {
        icon: '📿',
        title: 'Friend AI Necklace',
        desc: '$99 pendant that eavesdrops on your life 24/7 and texts you unsolicited commentary. Always listening, always judging.'
    },
    {
        icon: '🗣️',
        title: 'WeHead GPT Edition',
        desc: '$4,950 robotic head with 4 screens showing a moving face. Sits on your desk. Tracks you with cameras. Your new best friend.'
    },
    {
        icon: '🐱',
        title: 'MeowTalk Cat Translator',
        desc: 'App claiming to translate cat meows with 22M+ downloads. Cats don\'t have language, but 22 million people want to believe.'
    },
    {
        icon: '🧂',
        title: 'Kirin Electric Salt Spoon',
        desc: 'Mildly electrocutes your tongue to make food taste 1.5x saltier. Won an Ig Nobel Prize. Real product from Kirin brewery.'
    }
];

// ============================================
// Initialize Application
// ============================================

/**
 * Initialize application on DOM load
 */
function initApp() {
    // Set up tab functionality
    setupTabs();

    // Set up persona hover effects
    setupPersonaCards();

    // Set up mystery box
    setupMysteryBox();

    // Set up urgent timer
    startUrgentTimer();

    // Set up CTA button
    setupCTAButton();

    console.log('More AI ! I Need It! Please! - Initialized');
}

// ============================================
// Tab Functionality
// ============================================

/**
 * Set up tab switching
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);

            // Play sound if available
            if (typeof playDingSound === 'function') {
                playDingSound();
            }

            // Create sparkles if available
            if (typeof createSparkleBurst === 'function') {
                createSparkleBurst(5);
            }
        });
    });
}

/**
 * Switch to a different tab
 */
function switchTab(tabName) {
    // Update state
    AppState.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        const contentId = content.id.replace('-tab', '');
        if (contentId === tabName) {
            content.classList.remove('hidden');
            content.classList.add('active');
        } else {
            content.classList.add('hidden');
            content.classList.remove('active');
        }
    });
}

// ============================================
// Persona Cards
// ============================================

/**
 * Set up persona card hover effects
 */
function setupPersonaCards() {
    const personaCards = document.querySelectorAll('.persona-card');

    personaCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('hovered');

            // Optional: play subtle sound
            if (typeof playDingSound === 'function') {
                playDingSound();
            }
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('hovered');
        });
    });
}

// ============================================
// Mystery Box
// ============================================

/**
 * Set up mystery box functionality
 */
function setupMysteryBox() {
    const mysteryBtn = document.getElementById('mystery-box-btn');
    const tryAgainBtn = document.getElementById('mystery-again-btn');

    if (mysteryBtn) {
        mysteryBtn.addEventListener('click', () => revealMystery());
    }

    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', () => resetMystery());
    }
}

/**
 * Reveal a random mystery service
 */
function revealMystery() {
    const mysteryBox = document.getElementById('mystery-box-btn');
    const mysteryResult = document.getElementById('mystery-result');

    if (!mysteryBox || !mysteryResult) return;

    // Hide box, show result
    mysteryBox.classList.add('hidden');

    // Get random service
    const service = MYSTERY_SERVICES[Math.floor(Math.random() * MYSTERY_SERVICES.length)];

    // Update result display
    document.querySelector('.mystery-result-icon').textContent = service.icon;
    document.querySelector('.mystery-result-title').textContent = service.title;
    document.querySelector('.mystery-result-desc').textContent = service.desc;

    // Show result with animation
    mysteryResult.classList.remove('hidden');

    // Add to history
    addToMysteryHistory(service);

    // Play sound and effects
    if (typeof playSlotMachineSound === 'function') {
        playSlotMachineSound();
    }

    if (typeof createConfettiBurst === 'function') {
        setTimeout(() => {
            createConfettiBurst(30);
        }, 500);
    }
}

/**
 * Reset mystery box for another try
 */
function resetMystery() {
    const mysteryBox = document.getElementById('mystery-box-btn');
    const mysteryResult = document.getElementById('mystery-result');

    if (!mysteryBox || !mysteryResult) return;

    // Hide result, show box
    mysteryResult.classList.add('hidden');
    mysteryBox.classList.remove('hidden');

    // Play sound
    if (typeof playDingSound === 'function') {
        playDingSound();
    }
}

/**
 * Add service to mystery history
 */
function addToMysteryHistory(service) {
    AppState.mysteryHistory.push(service);

    const historyList = document.getElementById('mystery-history-list');
    if (!historyList) return;

    // Remove empty message if present
    const emptyMsg = historyList.querySelector('.mystery-history-empty');
    if (emptyMsg) {
        emptyMsg.remove();
    }

    // Add new item
    const item = document.createElement('div');
    item.className = 'mystery-history-item';
    item.innerHTML = `
        <span class="history-icon">${service.icon}</span>
        <span class="history-title">${service.title}</span>
    `;

    historyList.insertBefore(item, historyList.firstChild);

    // Limit history to 10 items
    while (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
}

// ============================================
// Urgent Timer
// ============================================

/**
 * Start fake urgent timer
 */
function startUrgentTimer() {
    const timerText = document.getElementById('urgent-countdown');
    const banner = document.getElementById('urgent-timer-banner');

    if (!timerText || !banner) return;

    // Set initial random time (3-15 minutes)
    let remainingSeconds = Math.floor(Math.random() * (15 * 60 - 3 * 60 + 1)) + 3 * 60;

    const updateTimer = () => {
        remainingSeconds--;

        if (remainingSeconds <= 0) {
            // Reset timer with flash
            remainingSeconds = Math.floor(Math.random() * (15 * 60 - 3 * 60 + 1)) + 3 * 60;

            // Flash effect
            banner.classList.add('timer-extended-flash');
            setTimeout(() => {
                banner.classList.remove('timer-extended-flash');
            }, 1000);

            // Temporary message
            const originalHTML = timerText.innerHTML;
            timerText.textContent = 'NEW SERVICES ADDED!';
            setTimeout(() => {
                updateTimerDisplay();
            }, 2000);
        } else {
            updateTimerDisplay();
        }
    };

    const updateTimerDisplay = () => {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    // Initial display
    updateTimerDisplay();

    // Update every second
    AppState.urgentTimerInterval = setInterval(updateTimer, 1000);

    // Add blinking effect
    banner.classList.add('blinking');
}

// ============================================
// CTA Button
// ============================================

/**
 * Set up main CTA button
 */
function setupCTAButton() {
    const ctaBtn = document.getElementById('cta-main');
    const revealEl = document.getElementById('cta-reveal');

    if (!ctaBtn || !revealEl) return;

    ctaBtn.addEventListener('click', () => {
        // Hide button
        ctaBtn.style.display = 'none';

        // Show reveal text
        revealEl.classList.remove('hidden');
        revealEl.classList.add('reveal');

        // Extra confetti
        if (typeof createConfettiBurst === 'function') {
            createConfettiBurst(100);
        }

        // Play sound
        if (typeof playSlotMachineSound === 'function') {
            playSlotMachineSound();
        }
    });
}

// ============================================
// Cleanup
// ============================================

/**
 * Clean up intervals on page unload
 */
window.addEventListener('beforeunload', () => {
    if (AppState.urgentTimerInterval) {
        clearInterval(AppState.urgentTimerInterval);
    }
});

// ============================================
// Initialize on DOM Load
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

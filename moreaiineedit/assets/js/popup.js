/**
 * Will I Have A Job? - Popup System
 *
 * Escalating annoying popups with satirical messages about AI replacement
 */

// ============================================
// Popup Manager
// ============================================

const PopupManager = {
    modal: null,
    title: null,
    message: null,
    button: null,
    closeBtn: null,
    enabled: false,
    isShowing: false,
    currentIndex: 0,
    nextPopupTimeout: null,
    baseDelay: 15000, // Start at 15 seconds
    currentDelay: 15000,
    minDelay: 5000, // Minimum 5 seconds
    accelerationFactor: 0.85, // Speed up by 15% each time
    dismissCount: 0
};

// ============================================
// Popup Messages
// ============================================

const POPUP_MESSAGES = [
    {
        title: "⚠️ URGENT UPDATE ⚠️",
        message: "Your occupation has been flagged as <em>high risk</em> for AI replacement. Click below to learn essential <strong>upskilling strategies</strong> before it's too late!",
        variant: "urgent"
    },
    {
        title: "🚨 LIMITED TIME OFFER 🚨",
        message: "AI is advancing <strong>faster than ever</strong>. Industry experts recommend immediate action to future-proof your career. Don't wait!",
        variant: "warning"
    },
    {
        title: "⏰ TIME IS RUNNING OUT ⏰",
        message: "Thousands of workers in your field have already been replaced. Will you be next? The choice is yours.",
        variant: "urgent"
    },
    {
        title: "🤖 AI ALERT 🤖",
        message: "New AI models are being trained <em>right now</em> that can do your job better, faster, and cheaper. What's your plan?",
        variant: "warning"
    },
    {
        title: "💼 CAREER RISK DETECTED 💼",
        message: "Our algorithms indicate a <strong>47% probability</strong> of job displacement in your sector. Immediate upskilling recommended!",
        variant: "urgent"
    },
    {
        title: "📊 MARKET ANALYSIS 📊",
        message: "Industry reports show declining demand for human workers in your field. Stay competitive with <strong>AI literacy training</strong>!",
        variant: "warning"
    },
    {
        title: "⚡ BREAKING NEWS ⚡",
        message: "Major corporation announces <em>AI-first hiring policy</em>. Are your skills still relevant in 2026?",
        variant: "urgent"
    },
    {
        title: "🎯 YOU'RE FALLING BEHIND 🎯",
        message: "Your colleagues are already upskilling. Don't get left behind in the <strong>AI revolution</strong>!",
        variant: "warning"
    },
    {
        title: "🔔 IMPORTANT REMINDER 🔔",
        message: "You haven't updated your skills since <strong>2019</strong>. The AI that replaces you has been training for <em>billions of hours</em>.",
        variant: "urgent"
    },
    {
        title: "💡 LAST CHANCE 💡",
        message: "This is your <em>final warning</em> to take action before your job becomes obsolete. What are you waiting for?",
        variant: "urgent"
    },
    {
        title: "🎲 FEELING LUCKY? 🎲",
        message: "Some people ignore the warnings. Some people lose their jobs. Which one will you be?",
        variant: "warning"
    },
    {
        title: "📉 YOUR VALUE IS DECREASING 📉",
        message: "Every day you don't upskill, your market value drops. Meanwhile, AI capabilities <strong>double every year</strong>.",
        variant: "urgent"
    },
    {
        title: "🌐 THE FUTURE IS NOW 🌐",
        message: "AI doesn't take breaks. AI doesn't make mistakes. AI doesn't need health insurance. What do you offer that AI doesn't?",
        variant: "warning"
    },
    {
        title: "⚙️ AUTOMATION INCOMING ⚙️",
        message: "Your tasks are being analyzed for automation potential. Current score: <strong>HIGH</strong>. Prepare accordingly.",
        variant: "urgent"
    },
    {
        title: "🏆 BE A SURVIVOR 🏆",
        message: "Only the most adaptable workers will thrive in the AI economy. Are you one of them? Prove it by upskilling <em>today</em>!",
        variant: "warning"
    }
];

// ============================================
// Initialize Popup System
// ============================================

/**
 * Initialize popup system
 */
function initPopups() {
    // Get popup elements
    PopupManager.modal = document.getElementById('popup-modal');
    PopupManager.title = document.getElementById('popup-title');
    PopupManager.message = document.getElementById('popup-message');
    PopupManager.button = document.getElementById('popup-cta');
    PopupManager.closeBtn = document.getElementById('popup-close');

    if (!PopupManager.modal || !PopupManager.title || !PopupManager.message) {
        console.warn('Popup elements not found');
        return;
    }

    // Set up event listeners
    if (PopupManager.button) {
        PopupManager.button.addEventListener('click', dismissPopup);
    }

    if (PopupManager.closeBtn) {
        PopupManager.closeBtn.addEventListener('click', dismissPopup);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && PopupManager.isShowing) {
            dismissPopup();
        }
    });

    // Close on overlay click
    PopupManager.modal.addEventListener('click', (e) => {
        if (e.target === PopupManager.modal) {
            dismissPopup();
        }
    });

    PopupManager.enabled = true;
}

/**
 * Start popup system (shows once after delay)
 */
function startPopups() {
    if (!PopupManager.enabled) return;

    // Show popup once after 10 seconds
    PopupManager.nextPopupTimeout = setTimeout(() => {
        showPopup();
    }, 10000); // 10 seconds
}

/**
 * Stop popup system
 */
function stopPopups() {
    if (PopupManager.nextPopupTimeout) {
        clearTimeout(PopupManager.nextPopupTimeout);
        PopupManager.nextPopupTimeout = null;
    }

    hidePopup();
}

// ============================================
// Popup Display
// ============================================

/**
 * Show a popup
 */
function showPopup() {
    if (!PopupManager.enabled || PopupManager.isShowing) return;

    // Get next message
    const popup = POPUP_MESSAGES[PopupManager.currentIndex];
    PopupManager.currentIndex = (PopupManager.currentIndex + 1) % POPUP_MESSAGES.length;

    // Set content
    PopupManager.title.textContent = popup.title;
    PopupManager.message.innerHTML = popup.message;

    // Set variant styling
    const content = PopupManager.modal.querySelector('.popup-content');
    if (content) {
        content.className = 'popup-content';
        if (popup.variant) {
            content.classList.add(popup.variant);
        }
        content.classList.add('popup-enter');
    }

    // Show modal
    PopupManager.modal.classList.remove('hidden');
    PopupManager.isShowing = true;

    // Focus on close button for accessibility
    if (PopupManager.closeBtn) {
        setTimeout(() => PopupManager.closeBtn.focus(), 100);
    }

    // Play sound if available
    if (typeof playDingSound === 'function') {
        playDingSound();
    }
}

/**
 * Hide popup
 */
function hidePopup() {
    if (!PopupManager.modal) return;

    const content = PopupManager.modal.querySelector('.popup-content');
    if (content) {
        content.classList.add('popup-exit');

        setTimeout(() => {
            PopupManager.modal.classList.add('hidden');
            content.classList.remove('popup-exit', 'popup-enter');
            PopupManager.isShowing = false;
        }, 300);
    } else {
        PopupManager.modal.classList.add('hidden');
        PopupManager.isShowing = false;
    }
}

/**
 * Dismiss popup (no longer schedules another popup)
 */
function dismissPopup() {
    hidePopup();

    // Mark as dismissed, don't show again
    PopupManager.dismissCount++;

    // Don't schedule another popup
    PopupManager.enabled = false;
}

// ============================================
// Popup Scheduling
// ============================================

/**
 * Schedule next popup
 */
function scheduleNextPopup() {
    if (!PopupManager.enabled) return;

    // Clear existing timeout
    if (PopupManager.nextPopupTimeout) {
        clearTimeout(PopupManager.nextPopupTimeout);
    }

    // Schedule next popup
    PopupManager.nextPopupTimeout = setTimeout(() => {
        showPopup();
    }, PopupManager.currentDelay);
}

/**
 * Accelerate popup frequency (punishment for dismissing)
 */
function acceleratePopups() {
    // Reduce delay by acceleration factor
    PopupManager.currentDelay = Math.max(
        PopupManager.minDelay,
        Math.floor(PopupManager.currentDelay * PopupManager.accelerationFactor)
    );

    console.log(`Popup frequency increased! Next popup in ${PopupManager.currentDelay / 1000}s`);
}

/**
 * Reset popup frequency
 */
function resetPopupFrequency() {
    PopupManager.currentDelay = PopupManager.baseDelay;
    PopupManager.dismissCount = 0;
}

// ============================================
// Manual Popup Triggers
// ============================================

/**
 * Show specific popup by index
 * @param {number} index - Message index
 */
function showSpecificPopup(index) {
    if (index >= 0 && index < POPUP_MESSAGES.length) {
        PopupManager.currentIndex = index;
        showPopup();
    }
}

/**
 * Show random popup
 */
function showRandomPopup() {
    PopupManager.currentIndex = Math.floor(Math.random() * POPUP_MESSAGES.length);
    showPopup();
}

/**
 * Show success popup (for satire reveal)
 */
function showSuccessPopup() {
    if (!PopupManager.enabled) return;

    PopupManager.title.textContent = "✅ CONGRATULATIONS! ✅";
    PopupManager.message.innerHTML = "You've discovered the truth: <strong>this entire website is satire</strong>! AI predictions are often exaggerated to create anxiety and sell courses. Take a breath. You're going to be okay.";

    const content = PopupManager.modal.querySelector('.popup-content');
    if (content) {
        content.className = 'popup-content success popup-enter';
    }

    PopupManager.modal.classList.remove('hidden');
    PopupManager.isShowing = true;

    // Play winner sound if available
    if (typeof playWinnerSound === 'function') {
        playWinnerSound();
    }

    // Create confetti if available
    if (typeof createConfettiBurst === 'function') {
        createConfettiBurst(100);
    }
}

// ============================================
// Configuration
// ============================================

/**
 * Set popup base delay
 * @param {number} delay - Delay in milliseconds
 */
function setPopupDelay(delay) {
    PopupManager.baseDelay = Math.max(1000, delay);
    PopupManager.currentDelay = PopupManager.baseDelay;
}

/**
 * Set minimum popup delay
 * @param {number} delay - Minimum delay in milliseconds
 */
function setMinimumPopupDelay(delay) {
    PopupManager.minDelay = Math.max(1000, delay);
}

/**
 * Set acceleration factor
 * @param {number} factor - Acceleration factor (0-1)
 */
function setAccelerationFactor(factor) {
    PopupManager.accelerationFactor = Math.max(0.5, Math.min(0.99, factor));
}

// ============================================
// Initialize on DOM Load
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopups);
} else {
    initPopups();
}

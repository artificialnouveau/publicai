/**
 * Will I Have A Job? - Animation Systems
 *
 * Sparkle and confetti particle systems for garish visual effects
 */

// ============================================
// Animation Manager
// ============================================

const AnimationManager = {
    sparkles: {
        active: [],
        maxSparkles: 20,
        container: null,
        enabled: true
    },
    confetti: {
        particles: [],
        canvas: null,
        ctx: null,
        animationFrame: null,
        enabled: true
    },
    reducedMotion: false
};

// ============================================
// Initialize Animations
// ============================================

/**
 * Initialize all animation systems
 */
function initAnimations() {
    // Check for reduced motion preference
    AnimationManager.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (AnimationManager.reducedMotion) {
        AnimationManager.sparkles.enabled = false;
        AnimationManager.confetti.enabled = false;
        return;
    }

    // Initialize sparkle system
    initSparkles();

    // Initialize confetti system
    initConfetti();

    // Sparkles disabled
    // setInterval(createSparkle, 500);
}

// ============================================
// Sparkle System
// ============================================

/**
 * Initialize sparkle container
 */
function initSparkles() {
    AnimationManager.sparkles.container = document.getElementById('sparkle-container');

    if (!AnimationManager.sparkles.container) {
        console.warn('Sparkle container not found');
        AnimationManager.sparkles.enabled = false;
    }
}

/**
 * Create a single sparkle element
 */
function createSparkle() {
    if (!AnimationManager.sparkles.enabled) return;
    if (AnimationManager.sparkles.active.length >= AnimationManager.sparkles.maxSparkles) return;

    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';

    // Random position (x: 0-100%, y: start at bottom)
    const xPos = Math.random() * 100;
    const yStart = 100 + Math.random() * 10; // Start slightly below viewport

    sparkle.style.left = `${xPos}%`;
    sparkle.style.top = `${yStart}%`;

    // Random animation duration (2-4 seconds)
    const duration = 2 + Math.random() * 2;
    sparkle.style.animationDuration = `${duration}s`;

    // Random horizontal drift
    const drift = (Math.random() - 0.5) * 50;
    sparkle.style.setProperty('--drift', `${drift}px`);

    AnimationManager.sparkles.container.appendChild(sparkle);
    AnimationManager.sparkles.active.push(sparkle);

    // Remove sparkle after animation completes
    setTimeout(() => {
        removeSparkle(sparkle);
    }, duration * 1000);
}

/**
 * Remove a sparkle element
 * @param {HTMLElement} sparkle - Sparkle element to remove
 */
function removeSparkle(sparkle) {
    if (!sparkle || !sparkle.parentNode) return;

    sparkle.parentNode.removeChild(sparkle);

    const index = AnimationManager.sparkles.active.indexOf(sparkle);
    if (index > -1) {
        AnimationManager.sparkles.active.splice(index, 1);
    }
}

/**
 * Create a burst of sparkles
 * @param {number} count - Number of sparkles to create
 */
function createSparkleBurst(count = 10) {
    if (!AnimationManager.sparkles.enabled) return;

    for (let i = 0; i < count; i++) {
        setTimeout(() => createSparkle(), i * 50);
    }
}

// ============================================
// Confetti System
// ============================================

/**
 * Initialize confetti canvas
 */
function initConfetti() {
    AnimationManager.confetti.canvas = document.getElementById('confetti-canvas');

    if (!AnimationManager.confetti.canvas) {
        console.warn('Confetti canvas not found');
        AnimationManager.confetti.enabled = false;
        return;
    }

    AnimationManager.confetti.ctx = AnimationManager.confetti.canvas.getContext('2d');

    // Set canvas size
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
}

/**
 * Resize confetti canvas to match window
 */
function resizeConfettiCanvas() {
    if (!AnimationManager.confetti.canvas) return;

    AnimationManager.confetti.canvas.width = window.innerWidth;
    AnimationManager.confetti.canvas.height = window.innerHeight;
}

/**
 * Confetti particle class
 */
class ConfettiParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 4;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
        this.color = this.randomColor();
        this.gravity = 0.15;
        this.opacity = 1;
        this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    }

    randomColor() {
        const colors = [
            '#FFD700', // Gold
            '#FF0000', // Red
            '#00FF00', // Green
            '#0047AB', // Blue
            '#FF6600', // Orange
            '#C0C0C0', // Silver
            '#FF00FF', // Magenta
            '#00FFFF'  // Cyan
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Fade out when off screen
        if (this.y > window.innerHeight + 100) {
            this.opacity -= 0.05;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        ctx.fillStyle = this.color;

        if (this.shape === 'rect') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    isDead() {
        return this.opacity <= 0;
    }
}

/**
 * Create confetti burst
 * @param {number} count - Number of confetti particles
 * @param {number} x - X position (optional, defaults to center)
 * @param {number} y - Y position (optional, defaults to top)
 */
function createConfettiBurst(count = 50, x = null, y = null) {
    if (!AnimationManager.confetti.enabled) return;

    const centerX = x !== null ? x : window.innerWidth / 2;
    const startY = y !== null ? y : 0;

    for (let i = 0; i < count; i++) {
        const spreadX = (Math.random() - 0.5) * 200;
        const particle = new ConfettiParticle(centerX + spreadX, startY);
        AnimationManager.confetti.particles.push(particle);
    }

    // Start animation loop if not already running
    if (!AnimationManager.confetti.animationFrame) {
        animateConfetti();
    }
}

/**
 * Animate confetti particles
 */
function animateConfetti() {
    if (!AnimationManager.confetti.enabled || !AnimationManager.confetti.ctx) return;

    const ctx = AnimationManager.confetti.ctx;
    const canvas = AnimationManager.confetti.canvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    for (let i = AnimationManager.confetti.particles.length - 1; i >= 0; i--) {
        const particle = AnimationManager.confetti.particles[i];
        particle.update();
        particle.draw(ctx);

        // Remove dead particles
        if (particle.isDead()) {
            AnimationManager.confetti.particles.splice(i, 1);
        }
    }

    // Continue animation if particles exist
    if (AnimationManager.confetti.particles.length > 0) {
        AnimationManager.confetti.animationFrame = requestAnimationFrame(animateConfetti);
    } else {
        AnimationManager.confetti.animationFrame = null;
    }
}

/**
 * Clear all confetti
 */
function clearConfetti() {
    AnimationManager.confetti.particles = [];

    if (AnimationManager.confetti.animationFrame) {
        cancelAnimationFrame(AnimationManager.confetti.animationFrame);
        AnimationManager.confetti.animationFrame = null;
    }

    if (AnimationManager.confetti.ctx && AnimationManager.confetti.canvas) {
        AnimationManager.confetti.ctx.clearRect(
            0, 0,
            AnimationManager.confetti.canvas.width,
            AnimationManager.confetti.canvas.height
        );
    }
}

// ============================================
// Slot Machine Roll Effect
// ============================================

/**
 * Animate number rolling like a slot machine
 * @param {HTMLElement} element - Element containing the number
 * @param {number} targetValue - Final value
 * @param {number} duration - Animation duration in ms
 * @param {Function} onComplete - Callback when complete
 */
function animateSlotRoll(element, targetValue, duration = 2000, onComplete = null) {
    if (!element) return;

    const startTime = Date.now();
    const isDecimal = targetValue % 1 !== 0;
    const decimals = isDecimal ? 1 : 0;

    // Add rolling class
    element.classList.add('rolling');

    const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1) {
            // Random numbers while rolling
            const randomValue = Math.random() * (targetValue * 1.5);
            element.textContent = randomValue.toFixed(decimals);
        } else {
            // Final value
            element.textContent = targetValue.toFixed(decimals);
            element.classList.remove('rolling');
            element.classList.add('roll-complete');

            clearInterval(interval);

            // Remove completion class after animation
            setTimeout(() => {
                element.classList.remove('roll-complete');
            }, 300);

            // Call completion callback
            if (onComplete) onComplete();
        }
    }, 50);
}

/**
 * Add jackpot flash effect to element
 * @param {HTMLElement} element - Element to flash
 */
function addJackpotFlash(element) {
    if (!element) return;

    element.classList.add('jackpot-flash');

    setTimeout(() => {
        element.classList.remove('jackpot-flash');
    }, 1500);
}

// ============================================
// Countdown Timer Visual Effects
// ============================================

/**
 * Apply urgency styling to countdown
 * @param {string} urgencyLevel - 'critical', 'warning', or 'moderate'
 */
function applyCountdownUrgency(urgencyLevel) {
    const countdownNumbers = document.querySelectorAll('.countdown-number');
    const countdownCard = document.querySelector('.countdown-card');

    // Remove all urgency classes
    countdownNumbers.forEach(num => {
        num.classList.remove('countdown-critical', 'countdown-warning');
    });
    countdownCard?.classList.remove('critical');

    // Apply appropriate urgency class
    if (urgencyLevel === 'critical') {
        countdownNumbers.forEach(num => {
            num.classList.add('countdown-critical');
        });
        countdownCard?.classList.add('critical');
    } else if (urgencyLevel === 'warning') {
        countdownNumbers.forEach(num => {
            num.classList.add('countdown-warning');
        });
    }
}

// ============================================
// Profile Transition Effects
// ============================================

/**
 * Transition between profile cards
 * @param {Function} updateCallback - Function to update profile content
 */
function transitionProfile(updateCallback) {
    const profileCard = document.getElementById('current-profile');
    if (!profileCard) return;

    // Slide out
    profileCard.classList.add('profile-transition-out');

    setTimeout(() => {
        // Update content
        if (updateCallback) updateCallback();

        // Slide in
        profileCard.classList.remove('profile-transition-out');
        profileCard.classList.add('profile-transition-in');

        setTimeout(() => {
            profileCard.classList.remove('profile-transition-in');
        }, 300);
    }, 300);
}

// ============================================
// Shake Effect
// ============================================

/**
 * Shake an element for emphasis
 * @param {HTMLElement} element - Element to shake
 */
function shakeElement(element) {
    if (!element) return;

    element.classList.add('shake');

    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

// ============================================
// Glow Effect
// ============================================

/**
 * Add glowing effect to element
 * @param {HTMLElement} element - Element to glow
 * @param {number} duration - Duration in ms (0 = infinite)
 */
function addGlowEffect(element, duration = 0) {
    if (!element) return;

    element.classList.add('glow');

    if (duration > 0) {
        setTimeout(() => {
            element.classList.remove('glow');
        }, duration);
    }
}

/**
 * Remove glow effect from element
 * @param {HTMLElement} element - Element to unglow
 */
function removeGlowEffect(element) {
    if (!element) return;
    element.classList.remove('glow');
}

// ============================================
// Initialize on DOM Load
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
} else {
    initAnimations();
}

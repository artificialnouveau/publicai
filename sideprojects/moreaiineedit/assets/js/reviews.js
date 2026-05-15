/**
 * Customer Reviews System - Firestore Edition
 * Handles service ratings and feedback with Firebase Firestore integration
 */

// ============================================
// Review State
// ============================================

const ReviewState = {
    selectedService: null,
    usefulness: 3,
    desirability: 3,
    allRatings: {}
};

// ============================================
// Initialize Reviews
// ============================================

function initReviews() {
    const serviceSelect = document.getElementById('service-select');
    const usefulnessSlider = document.getElementById('usefulness-slider');
    const desirabilitySlider = document.getElementById('desirability-slider');
    const usefulnessValue = document.getElementById('usefulness-value');
    const desirabilityValue = document.getElementById('desirability-value');
    const submitButton = document.getElementById('submit-review-btn');

    if (!serviceSelect) return;

    // Service selection
    serviceSelect.addEventListener('change', (e) => {
        const serviceName = e.target.value;
        if (serviceName) {
            showReviewForm(serviceName);
        } else {
            hideReviewForm();
        }
    });

    // Usefulness slider
    if (usefulnessSlider && usefulnessValue) {
        usefulnessSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            ReviewState.usefulness = parseInt(value);
            usefulnessValue.textContent = value;
        });
    }

    // Desirability slider
    if (desirabilitySlider && desirabilityValue) {
        desirabilitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            ReviewState.desirability = parseInt(value);
            desirabilityValue.textContent = value;
        });
    }

    // Submit review
    if (submitButton) {
        submitButton.addEventListener('click', submitReview);
    }

    // Load ratings data
    loadRatingsData();
}

// ============================================
// Review Form Functions
// ============================================

function showReviewForm(serviceName) {
    ReviewState.selectedService = serviceName;

    const formContainer = document.getElementById('review-form-container');
    const serviceNameEl = document.getElementById('reviewing-service-name');

    if (formContainer) {
        formContainer.classList.remove('hidden');
    }

    if (serviceNameEl) {
        serviceNameEl.textContent = `Review: ${serviceName}`;
    }

    // Reset form
    resetReviewForm();
}

function hideReviewForm() {
    const formContainer = document.getElementById('review-form-container');
    if (formContainer) {
        formContainer.classList.add('hidden');
    }
    resetReviewForm();
}

function resetReviewForm() {
    // Reset sliders to default (3)
    const usefulnessSlider = document.getElementById('usefulness-slider');
    const desirabilitySlider = document.getElementById('desirability-slider');
    const usefulnessValue = document.getElementById('usefulness-value');
    const desirabilityValue = document.getElementById('desirability-value');

    if (usefulnessSlider) usefulnessSlider.value = 3;
    if (desirabilitySlider) desirabilitySlider.value = 3;
    if (usefulnessValue) usefulnessValue.textContent = '3';
    if (desirabilityValue) desirabilityValue.textContent = '3';

    ReviewState.usefulness = 3;
    ReviewState.desirability = 3;

    // Clear comment
    const commentField = document.getElementById('review-comment');
    if (commentField) {
        commentField.value = '';
    }

    // Clear status message
    const statusEl = document.getElementById('review-status');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'review-status';
    }
}

// ============================================
// Submit Review
// ============================================

function submitReview() {
    if (!ReviewState.selectedService) {
        showStatus('Please select a service', 'error');
        return;
    }

    const comment = document.getElementById('review-comment')?.value || '';

    const reviewData = {
        service: ReviewState.selectedService,
        usefulness: ReviewState.usefulness,
        desirability: ReviewState.desirability,
        comment: comment,
        timestamp: firebase.firestore.Timestamp.now()
    };

    if (firebaseInitialized && db) {
        // Save to Firestore
        saveToFirestore(reviewData);
    } else {
        // Save to localStorage as fallback
        saveToLocalStorage(reviewData);
    }
}

function saveToFirestore(reviewData) {
    // Save the review
    db.collection('reviews')
        .doc(ReviewState.selectedService)
        .collection('entries')
        .add(reviewData)
        .then(() => {
            showStatus('Thank you for your feedback! ✓', 'success');
            setTimeout(() => {
                resetReviewForm();
                loadRatingsData();
            }, 2000);
        })
        .catch((error) => {
            console.error('Error saving review:', error);
            showStatus('Error saving review. Please try again.', 'error');
        });
}

function saveToLocalStorage(reviewData) {
    // Fallback when Firebase is not configured
    let reviews = JSON.parse(localStorage.getItem('aiServiceReviews') || '[]');
    reviews.push({
        ...reviewData,
        timestamp: Date.now()
    });
    localStorage.setItem('aiServiceReviews', JSON.stringify(reviews));

    showStatus('Thank you for your feedback! ✓ (Saved locally)', 'success');
    setTimeout(() => {
        resetReviewForm();
        loadRatingsData();
    }, 2000);
}

function showStatus(message, type) {
    const statusEl = document.getElementById('review-status');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `review-status ${type}`;
}

// ============================================
// Load and Display Ratings
// ============================================

function loadRatingsData() {
    if (firebaseInitialized && db) {
        loadFromFirestore();
    } else {
        loadFromLocalStorage();
    }
}

function loadFromFirestore() {
    // Load all reviews from all services
    const servicesPromises = [];
    const serviceSelect = document.getElementById('service-select');

    // Get all service options
    const options = serviceSelect.querySelectorAll('option[value]');
    const serviceNames = Array.from(options)
        .map(opt => opt.value)
        .filter(val => val !== '');

    // Load reviews for each service
    serviceNames.forEach(serviceName => {
        const promise = db.collection('reviews')
            .doc(serviceName)
            .collection('entries')
            .get()
            .then((querySnapshot) => {
                const reviews = [];
                querySnapshot.forEach((doc) => {
                    reviews.push(doc.data());
                });
                return { service: serviceName, reviews };
            });
        servicesPromises.push(promise);
    });

    Promise.all(servicesPromises)
        .then((servicesData) => {
            // Calculate average ratings
            const ratings = {};
            servicesData.forEach(({ service, reviews }) => {
                if (reviews.length > 0) {
                    const avgUsefulness = reviews.reduce((sum, r) => sum + r.usefulness, 0) / reviews.length;
                    const avgDesirability = reviews.reduce((sum, r) => sum + r.desirability, 0) / reviews.length;
                    ratings[service] = {
                        usefulness: avgUsefulness,
                        desirability: avgDesirability,
                        count: reviews.length
                    };
                }
            });
            ReviewState.allRatings = ratings;
            displayRatings();
        })
        .catch((error) => {
            console.error('Error loading ratings:', error);
            loadFromLocalStorage(); // Fallback
        });
}

function loadFromLocalStorage() {
    // Calculate ratings from localStorage reviews
    const reviews = JSON.parse(localStorage.getItem('aiServiceReviews') || '[]');
    const ratings = {};

    // Group reviews by service
    const serviceReviews = {};
    reviews.forEach(review => {
        if (!serviceReviews[review.service]) {
            serviceReviews[review.service] = [];
        }
        serviceReviews[review.service].push(review);
    });

    // Calculate averages
    Object.keys(serviceReviews).forEach(service => {
        const serviceData = serviceReviews[service];
        const avgUsefulness = serviceData.reduce((sum, r) => sum + r.usefulness, 0) / serviceData.length;
        const avgDesirability = serviceData.reduce((sum, r) => sum + r.desirability, 0) / serviceData.length;
        ratings[service] = {
            usefulness: avgUsefulness,
            desirability: avgDesirability,
            count: serviceData.length
        };
    });

    ReviewState.allRatings = ratings;
    displayRatings();
}

function displayRatings() {
    const canvas = document.getElementById('ratings-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const services = Object.keys(ReviewState.allRatings);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up dimensions
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Draw grid
    drawGrid(ctx, padding, chartWidth, chartHeight);

    if (services.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No ratings yet. Be the first to review!', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Draw quadrant labels
    drawQuadrantLabels(ctx, padding, chartWidth, chartHeight);

    // Plot services
    services.forEach(service => {
        const data = ReviewState.allRatings[service];
        plotService(ctx, service, data, padding, chartWidth, chartHeight);
    });
}

function drawGrid(ctx, padding, width, height) {
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;

    // Draw border
    ctx.strokeRect(padding, padding, width, height);

    // Draw center lines
    ctx.beginPath();
    // Vertical center line
    ctx.moveTo(padding + width / 2, padding);
    ctx.lineTo(padding + width / 2, padding + height);
    // Horizontal center line
    ctx.moveTo(padding, padding + height / 2);
    ctx.lineTo(padding + width, padding + height / 2);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let i = 1; i < 5; i++) {
        if (i !== 2) { // Skip center
            ctx.beginPath();
            ctx.moveTo(padding + (width / 4) * i, padding);
            ctx.lineTo(padding + (width / 4) * i, padding + height);
            ctx.stroke();
        }
    }

    // Horizontal lines
    for (let i = 1; i < 5; i++) {
        if (i !== 2) { // Skip center
            ctx.beginPath();
            ctx.moveTo(padding, padding + (height / 4) * i);
            ctx.lineTo(padding + width, padding + (height / 4) * i);
            ctx.stroke();
        }
    }
}

function drawQuadrantLabels(ctx, padding, width, height) {
    ctx.fillStyle = '#999';
    ctx.font = '11px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';

    // Top right - ideal
    ctx.fillText('IDEAL', padding + width * 0.75, padding + height * 0.25);

    // Top left - fun but useless
    ctx.fillText('FUN', padding + width * 0.25, padding + height * 0.25);

    // Bottom right - practical but unwanted
    ctx.fillText('PRACTICAL', padding + width * 0.75, padding + height * 0.75);

    // Bottom left - worst
    ctx.fillText('AVOID', padding + width * 0.25, padding + height * 0.75);
}

function plotService(ctx, serviceName, data, padding, chartWidth, chartHeight) {
    // Map 1-5 scale to canvas coordinates
    // usefulness: 1 (left) to 5 (right)
    // desirability: 1 (bottom) to 5 (top)
    const x = padding + ((data.usefulness - 1) / 4) * chartWidth;
    const y = padding + chartHeight - ((data.desirability - 1) / 4) * chartHeight;

    // Size based on review count (min 5, max 15)
    const radius = Math.min(15, Math.max(5, 5 + data.count));

    // Color based on position (gradient)
    const hue = ((data.usefulness - 1) / 4) * 120; // 0 (red) to 120 (green)
    const lightness = 40 + ((data.desirability - 1) / 4) * 20; // 40% to 60%
    ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label (abbreviated if needed)
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shortName = serviceName.length > 20 ? serviceName.substring(0, 17) + '...' : serviceName;

    // White background for text
    const textMetrics = ctx.measureText(shortName);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - textMetrics.width / 2 - 3, y - 6, textMetrics.width + 6, 12);

    // Draw text
    ctx.fillStyle = '#333';
    ctx.fillText(shortName, x, y);
}

// ============================================
// Initialize on Load
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReviews);
} else {
    initReviews();
}

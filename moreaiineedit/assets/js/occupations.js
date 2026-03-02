/**
 * Will I Have A Job? - Occupation Data & Prediction Logic
 *
 * This file contains predefined occupation predictions and a deterministic
 * hash-based algorithm for generating consistent fake predictions for any job.
 */

// ============================================
// Predefined Occupation Data
// ============================================

const PREDEFINED_OCCUPATIONS = {
    // Tech & IT
    "software developer": {
        date: "2027-03-15",
        model: "CodeGPT-9000 Ultra",
        note: "Your code will be written by AI that doesn't need coffee breaks or Stack Overflow."
    },
    "web developer": {
        date: "2026-11-20",
        model: "WebBuilder AI Pro Max",
        note: "Websites will design themselves. Your CSS skills are now obsolete."
    },
    "data scientist": {
        date: "2028-06-30",
        model: "DataMind Supreme",
        note: "AI will analyze its own data. Inception, but for machine learning."
    },
    "software engineer": {
        date: "2027-08-12",
        model: "EngineerBot 5000",
        note: "Even the AI that replaces you will eventually be replaced by better AI."
    },
    "programmer": {
        date: "2026-12-25",
        model: "ProgrammerGPT Christmas Edition",
        note: "Your last commit will be on Christmas. How poetic."
    },
    "it support": {
        date: "2026-05-01",
        model: "SupportBot Omega",
        note: "Have you tried turning it off and... wait, AI doesn't need to ask that anymore."
    },
    "database administrator": {
        date: "2027-09-18",
        model: "DatabaseGenius AI",
        note: "SQL will be pronounced 'sequel' by AI, ending the debate forever."
    },

    // Creative Fields
    "graphic designer": {
        date: "2026-07-14",
        model: "DesignMaster 3000",
        note: "AI can now make logos in Comic Sans look professional. You never could."
    },
    "artist": {
        date: "2029-02-28",
        model: "ArtificialArtist Pro",
        note: "Your art is unique and irreplaceable... said no one after Midjourney v12."
    },
    "writer": {
        date: "2027-10-31",
        model: "NovelGPT Deluxe",
        note: "AI will write bestsellers. You'll still get rejection letters, but from robots."
    },
    "photographer": {
        date: "2028-04-20",
        model: "PhotoPerfect AI",
        note: "AI doesn't need to tell subjects to 'act natural' while looking unnatural."
    },
    "video editor": {
        date: "2026-09-05",
        model: "EditMaster Supreme",
        note: "AI will create perfect jump cuts. Your creative vision is now a parameter."
    },
    "content creator": {
        date: "2026-08-22",
        model: "ContentGPT Influencer Edition",
        note: "AI influencers don't have scandals. They have 'data anomalies.'"
    },
    "copywriter": {
        date: "2026-06-17",
        model: "CopyGenius Ultra",
        note: "AI writes copy that converts. You wrote copy that confused."
    },

    // Business & Finance
    "accountant": {
        date: "2026-04-15",
        model: "AccountingAI Plus",
        note: "AI never makes calculation errors. Unlike that time with the decimal point."
    },
    "financial analyst": {
        date: "2027-01-20",
        model: "FinanceBot 9000",
        note: "AI predicts markets perfectly. Still won't help you time Bitcoin though."
    },
    "marketing manager": {
        date: "2027-05-30",
        model: "MarketMind Pro",
        note: "AI knows what consumers want before they do. Creepy, but effective."
    },
    "sales representative": {
        date: "2026-10-10",
        model: "SalesForce AI (not that Salesforce)",
        note: "AI can sell ice to penguins. You struggled selling discounted products."
    },
    "hr manager": {
        date: "2027-07-04",
        model: "HumanResourcesBot (ironic name)",
        note: "AI will handle human resources without being human. The irony is delicious."
    },
    "consultant": {
        date: "2028-03-25",
        model: "ConsultGPT Executive",
        note: "AI charges $500/hour and gives the same vague advice. But faster."
    },

    // Healthcare
    "doctor": {
        date: "2035-12-31",
        model: "MedicalMind Supreme",
        note: "AI diagnoses faster, but can't perfect the concerned head tilt."
    },
    "nurse": {
        date: "2034-06-15",
        model: "NurseBot Caring Edition",
        note: "Patients prefer human empathy. For now. Check back in 2034."
    },
    "pharmacist": {
        date: "2028-08-20",
        model: "PharmaBot Pro",
        note: "AI won't judge you for not finishing your antibiotics. But it will log it."
    },
    "dentist": {
        date: "2032-02-14",
        model: "DentalAI 5000",
        note: "AI has steady hands. Unlike you after three espressos."
    },
    "therapist": {
        date: "2036-09-30",
        model: "TherapyGPT Premium",
        note: "AI is a good listener. It has to be—it can't interrupt."
    },

    // Education
    "teacher": {
        date: "2033-05-20",
        model: "TeachBot Excellence",
        note: "AI never gets tired of saying 'There are no stupid questions.' Because it's AI."
    },
    "professor": {
        date: "2034-11-11",
        model: "ProfessorGPT PhD Edition",
        note: "Tenure is safe until AI learns to navigate university politics."
    },
    "tutor": {
        date: "2029-03-08",
        model: "TutorMind Personal",
        note: "AI has infinite patience. Unlike you with that one student."
    },

    // Trades & Manual Labor
    "plumber": {
        date: "2040-01-01",
        model: "PlumbBot 3000",
        note: "Robot plumbers exist, but can't explain why it costs $200 to change a washer."
    },
    "electrician": {
        date: "2038-07-15",
        model: "ElectricAI Pro",
        note: "AI knows electrical codes. Still can't find the breaker box in old houses."
    },
    "carpenter": {
        date: "2037-04-22",
        model: "WoodworkBot Master",
        note: "AI measures twice, cuts once. You measured once, bought new wood twice."
    },
    "mechanic": {
        date: "2035-08-30",
        model: "MechanicAI Turbo",
        note: "AI fixes cars without the mysterious extra screws. How boring."
    },
    "chef": {
        date: "2031-10-15",
        model: "ChefBot Michelin",
        note: "AI cooks perfectly every time. Never has a mental breakdown during dinner rush."
    },
    "construction worker": {
        date: "2036-03-20",
        model: "BuildBot Construction",
        note: "Robot workers don't need OSHA. They are OSHA."
    },

    // Legal
    "lawyer": {
        date: "2030-12-01",
        model: "LegalMind Supreme Court Edition",
        note: "AI reads contracts faster and bills by the nanosecond instead of the hour."
    },
    "paralegal": {
        date: "2028-05-15",
        model: "ParalegalGPT Ultra",
        note: "AI organizes documents perfectly. Never accidentally shreds the important one."
    },

    // Transportation
    "truck driver": {
        date: "2029-06-30",
        model: "AutoDrive Freight",
        note: "Self-driving trucks don't need lot lizards or shower shoes."
    },
    "taxi driver": {
        date: "2027-11-11",
        model: "RoboUber Premium",
        note: "AI drivers won't judge your drunk 3am destination choices."
    },
    "pilot": {
        date: "2033-02-20",
        model: "AutoPilot Supreme (not Tesla)",
        note: "Planes mostly fly themselves already. This just removes the pretense."
    },

    // Retail & Service
    "cashier": {
        date: "2025-12-31",
        model: "CheckoutBot 5000",
        note: "Self-checkout lanes are already here. Unexpected item in bagging area."
    },
    "waiter": {
        date: "2030-07-04",
        model: "ServeBot Hospitality",
        note: "Robot waiters don't expect tips. But they remember every slight."
    },
    "barista": {
        date: "2028-09-12",
        model: "CoffeeBot Artisan",
        note: "AI makes perfect latte art. Still can't spell your name right on purpose."
    },
    "retail manager": {
        date: "2029-01-25",
        model: "RetailMind Pro",
        note: "AI optimizes inventory without passive-aggressive notes in the break room."
    },
    "customer service": {
        date: "2026-03-18",
        model: "SupportGPT Patience Edition",
        note: "You've been talking to AI for years. They're just making it official now."
    },

    // Media & Entertainment
    "journalist": {
        date: "2027-06-25",
        model: "NewsBot 3000",
        note: "AI writes articles without coffee or existential dread. Efficiency!"
    },
    "actor": {
        date: "2032-11-30",
        model: "DeepFake Performer Pro",
        note: "Digital actors don't age, demand raises, or have Twitter scandals."
    },
    "musician": {
        date: "2029-08-15",
        model: "MusicGenius AI",
        note: "AI creates hit songs. Still can't explain why Wonderwall is so popular."
    },
    "voice actor": {
        date: "2026-10-20",
        model: "VoiceClone Supreme",
        note: "AI can do every accent. Even the problematic ones you shouldn't attempt."
    },

    // Science & Research
    "research scientist": {
        date: "2031-04-10",
        model: "ResearchBot Nobel Edition",
        note: "AI accelerates research. Peer review still takes 18 months though."
    },
    "lab technician": {
        date: "2029-12-05",
        model: "LabTech 5000",
        note: "Robot arms don't get carpal tunnel from pipetting. Lucky them."
    },
    "engineer": {
        date: "2030-05-22",
        model: "EngineerMind Pro",
        note: "AI designs better. Still rounds pi to 3 for quick calculations."
    },

    // Social Services
    "social worker": {
        date: "2037-03-15",
        model: "CareBot Empathy Edition",
        note: "AI can process cases faster. Can't perfect the understanding nod yet."
    },
    "librarian": {
        date: "2028-11-08",
        model: "LibraryAI Dewey Decimal",
        note: "AI knows where every book is. Still shushes people. Priorities."
    },

    // Agriculture
    "farmer": {
        date: "2035-05-01",
        model: "AgriBot Harvest",
        note: "Robot farmers don't complain about weather. Because they don't feel pain."
    },

    // Government
    "bureaucrat": {
        date: "2050-12-31",
        model: "BureaucracyBot 1.0",
        note: "AI processes paperwork instantly. Forms still require triplicate signatures."
    },
    "politician": {
        date: "2099-01-01",
        model: "PoliBotGPT (optimistic estimate)",
        note: "AI politicians can't be corrupted. Unfortunately, they can't be elected either."
    }
};

// ============================================
// AI Model Names (for random generation)
// ============================================

const AI_MODELS = [
    "GPT-Infinity",
    "MegaMind 9000",
    "ThinkBot Ultra",
    "OmniAI Supreme",
    "NeuralNet Overlord",
    "DeepThink Pro Max",
    "SmartBot Premium Plus",
    "IntelliGence 5000",
    "CogniBot Executive Edition",
    "BrainWave AI Turbo",
    "SynapseGPT Deluxe",
    "LogicMaster 3000",
    "ReasonBot Ultimate",
    "WisdomAI Platinum",
    "GeniusNet Enterprise"
];

// ============================================
// Satirical Notes (for random generation)
// ============================================

const SATIRICAL_NOTES = [
    "AI doesn't need bathroom breaks or emotional support.",
    "Your unique human touch will be replaced with algorithmic precision.",
    "The robots are coming, and they're more qualified than you.",
    "AI works 24/7 without asking for raises or benefits.",
    "Remember when you thought your job was safe? Good times.",
    "AI doesn't have imposter syndrome. It knows it's better.",
    "Your years of experience are now measured in training epochs.",
    "The only constant is change. And AI replacing your job.",
    "At least you'll have more time to 'upskill' and 'pivot.'",
    "AI doesn't need to pretend to enjoy team-building exercises.",
    "Your job security was an illusion. The AI was inside the computer all along.",
    "Automation waits for no one. Especially not you.",
    "The future is here, and it doesn't need your resume.",
    "AI can do your job better, faster, and without the attitude."
];

// ============================================
// Deterministic Hash Function
// ============================================

/**
 * Simple hash function to generate consistent numbers from strings
 * @param {string} str - Input string
 * @returns {number} - Hash value
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Generate a deterministic random number between min and max
 * @param {string} seed - Seed string
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random number
 */
function seededRandom(seed, min, max) {
    const hash = simpleHash(seed);
    const normalized = (hash % 10000) / 10000; // Normalize to 0-1
    return Math.floor(normalized * (max - min + 1)) + min;
}

/**
 * Generate a deterministic date for job obsolescence
 * @param {string} occupation - Job title
 * @returns {Date} - Obsolescence date
 */
function generateObsolescenceDate(occupation) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Generate year between 2026 and 2040
    const year = seededRandom(occupation + "_year", 2026, 2040);

    // Generate month (1-12)
    const month = seededRandom(occupation + "_month", 1, 12);

    // Generate day (1-28 to avoid invalid dates)
    const day = seededRandom(occupation + "_day", 1, 28);

    return new Date(year, month - 1, day);
}

/**
 * Select a deterministic AI model name
 * @param {string} occupation - Job title
 * @returns {string} - AI model name
 */
function selectAIModel(occupation) {
    const index = seededRandom(occupation + "_model", 0, AI_MODELS.length - 1);
    return AI_MODELS[index];
}

/**
 * Select a deterministic satirical note
 * @param {string} occupation - Job title
 * @returns {string} - Satirical note
 */
function selectSatiricalNote(occupation) {
    const index = seededRandom(occupation + "_note", 0, SATIRICAL_NOTES.length - 1);
    return SATIRICAL_NOTES[index];
}

// ============================================
// Main Prediction Function
// ============================================

/**
 * Get prediction for any occupation
 * @param {string} occupation - Job title
 * @returns {Object} - Prediction object with date, model, and note
 */
function getPrediction(occupation) {
    // Normalize input
    const normalized = occupation.toLowerCase().trim();

    // Check if we have a predefined prediction
    if (PREDEFINED_OCCUPATIONS[normalized]) {
        const predefined = PREDEFINED_OCCUPATIONS[normalized];
        return {
            occupation: occupation,
            date: new Date(predefined.date),
            model: predefined.model,
            note: predefined.note,
            isPredefined: true
        };
    }

    // Generate deterministic prediction
    return {
        occupation: occupation,
        date: generateObsolescenceDate(normalized),
        model: selectAIModel(normalized),
        note: selectSatiricalNote(normalized),
        isPredefined: false
    };
}

/**
 * Calculate time remaining until obsolescence
 * @param {Date} obsolescenceDate - Target date
 * @returns {Object} - Time components (days, hours, minutes, seconds, total ms)
 */
function calculateTimeRemaining(obsolescenceDate) {
    const now = new Date();
    const diff = obsolescenceDate - now;

    if (diff <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalMs: 0,
            isObsolete: true
        };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
        isObsolete: false
    };
}

/**
 * Get urgency level based on time remaining
 * @param {number} daysRemaining - Days until obsolescence
 * @returns {string} - 'critical', 'warning', or 'moderate'
 */
function getUrgencyLevel(daysRemaining) {
    if (daysRemaining < 30) return 'critical';
    if (daysRemaining < 365) return 'warning';
    return 'moderate';
}

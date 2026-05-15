/**
 * AI Service Advisor Chatbot
 * Helps users find the right AI services for their needs
 */

// ============================================
// Chatbot State
// ============================================

const ChatbotState = {
    isOpen: false,
    messages: []
};

// ============================================
// Service Recommendations Database
// ============================================

const ServiceRecommendations = {
    // Keywords mapped to service recommendations
    keywords: {
        // Social situations
        'social': ['Razer Project AVA', 'Friend AI Necklace', 'AI Dating Profile Writer', 'Flirty AI Wingman App'],
        'awkward': ['GoveeLife Smart Ice Maker', 'Mirumi by Yukai', 'AI Dating Profile Writer', 'Friend AI Necklace'],
        'conversation': ['AI Dating Profile Writer', 'MoltMatch Dating AI', 'WeHead GPT Edition'],
        'friends': ['Friend AI Necklace', 'Hyodol AI Doll', 'Razer Project AVA'],
        'party': ['Friend AI Necklace', 'Mirumi by Yukai', 'Razer Project AVA'],
        'introvert': ['Fufuly Breathing Pillow', 'Replika AI Companion', 'Friend AI Necklace'],
        'shy': ['MoltMatch Dating AI', 'Flirty AI Wingman App', 'Replika AI Companion'],
        'networking': ['AI Dating Profile Writer', 'Humane AI Pin', 'Rabbit R1'],
        'small talk': ['AI Dating Profile Writer', 'WeHead GPT Edition', 'Razer Project AVA'],

        // Emotional support
        'confidence': ['Haut.AI Face Analysis', 'Replika AI Companion', 'Flirty AI Wingman App'],
        'sad': ['Replika AI Companion', 'Fufuly Breathing Pillow', 'Hyodol AI Doll'],
        'anxious': ['AI Fortune Teller', 'Fufuly Breathing Pillow', 'Ron Carpenter AI Pastor'],
        'stressed': ['Fufuly Breathing Pillow', 'Replika AI Companion', 'AI Fortune Teller'],
        'motivated': ['Urtopia AI E-Bike', 'Humane AI Pin', 'Rabbit R1'],
        'depressed': ['Replika AI Companion', 'Hyodol AI Doll', 'AI Fortune Teller'],
        'lonely': ['Replika AI Companion', 'Razer Project AVA', 'Realbotix Aria'],
        'overwhelmed': ['AI Fortune Teller', 'Fufuly Breathing Pillow', 'Friend AI Necklace'],
        'insecure': ['Haut.AI Face Analysis', 'Amorepacific Skinsight Patch', 'Replika AI Companion'],
        'jealous': ['AI Fortune Teller', 'Haut.AI Face Analysis', 'Replika AI Companion'],
        'angry': ['AI Fortune Teller', 'Fufuly Breathing Pillow', 'Replika AI Companion'],

        // Productivity & Work
        'productive': ['Rabbit R1', 'Humane AI Pin', 'Urtopia AI E-Bike'],
        'work': ['Humane AI Pin', 'Rabbit R1', 'WeHead GPT Edition'],
        'meeting': ['WeHead GPT Edition', 'Humane AI Pin', 'GoveeLife Smart Ice Maker'],
        'procrastinate': ['Rabbit R1', 'Humane AI Pin', 'Urtopia AI E-Bike'],
        'lazy': ['Roborock Saros Z70', 'Rabbit R1', 'Spicerr AI Spice Dispenser'],
        'boring': ['Mirumi by Yukai', 'Razer Project AVA', 'Urtopia AI E-Bike'],
        'focus': ['Humane AI Pin', 'Fufuly Breathing Pillow', 'Rabbit R1'],
        'boss': ['WeHead GPT Edition', 'DoNotPay "AI Lawyer"', 'Humane AI Pin'],
        'interview': ['MoltMatch Dating AI', 'Flirty AI Wingman App', 'Humane AI Pin'],
        'presentation': ['WeHead GPT Edition', 'Humane AI Pin', 'Razer Project AVA'],
        'job': ['MoltMatch Dating AI', 'Humane AI Pin', 'DoNotPay "AI Lawyer"'],

        // Apologies & Conflict
        'sorry': ['DoNotPay "AI Lawyer"', 'Ron Carpenter AI Pastor', 'AI Jesus Confessional'],
        'apology': ['AI Jesus Confessional', 'Ron Carpenter AI Pastor', 'DoNotPay "AI Lawyer"'],
        'argue': ['DoNotPay "AI Lawyer"', 'WeHead GPT Edition', 'AI Fortune Teller'],
        'fight': ['DoNotPay "AI Lawyer"', 'Fufuly Breathing Pillow', 'AI Fortune Teller'],
        'conflict': ['DoNotPay "AI Lawyer"', 'AI Fortune Teller', 'Ron Carpenter AI Pastor'],
        'confrontation': ['DoNotPay "AI Lawyer"', 'WeHead GPT Edition', 'Humane AI Pin'],
        'difficult conversation': ['MoltMatch Dating AI', 'Ron Carpenter AI Pastor', 'AI Fortune Teller'],

        // Relationships & Dating
        'dating': ['Razer Project AVA', 'Flirty AI Wingman App', 'MoltMatch Dating AI'],
        'text': ['Flirty AI Wingman App', 'Friend AI Necklace', 'AI Dating Profile Writer'],
        'crush': ['Flirty AI Wingman App', 'Razer Project AVA', 'MoltMatch Dating AI'],
        'breakup': ['Replika AI Companion', 'MoltMatch Dating AI', 'Fufuly Breathing Pillow'],
        'relationship': ['Realbotix Aria', 'MoltMatch Dating AI', 'AI Fortune Teller'],
        'ex': ['Replika AI Companion', 'AI Fortune Teller', 'Fufuly Breathing Pillow'],
        'flirt': ['Flirty AI Wingman App', 'MoltMatch Dating AI', 'AI Dating Profile Writer'],
        'rejection': ['Replika AI Companion', 'AI Fortune Teller', 'Fufuly Breathing Pillow'],

        // Daily Life & Habits
        'morning': ['Humane AI Pin', 'Rabbit R1', 'Y-Brush Halo AI Toothbrush'],
        'excuse': ['DoNotPay "AI Lawyer"', 'Friend AI Necklace', 'Ron Carpenter AI Pastor'],
        'late': ['Humane AI Pin', 'Rabbit R1', 'Urtopia AI E-Bike'],
        'cancel': ['DoNotPay "AI Lawyer"', 'Friend AI Necklace', 'Replika AI Companion'],
        'leave': ['Friend AI Necklace', 'Mirumi by Yukai', 'Razer Project AVA'],
        'tired': ['Fufuly Breathing Pillow', 'Nekojita FuFu', 'Friend AI Necklace'],
        'sleep': ['Fufuly Breathing Pillow', 'Replika AI Companion', 'AI Fortune Teller'],
        'exercise': ['Urtopia AI E-Bike', 'Humane AI Pin', 'Haut.AI Face Analysis'],
        'diet': ['Kirin Electric Salt Spoon', 'Spicerr AI Spice Dispenser', 'Y-Brush Halo AI Toothbrush'],

        // Food & Cooking
        'food': ['Kirin Electric Salt Spoon', 'Spicerr AI Spice Dispenser', 'McDonald\'s AI Drive-Thru'],
        'cook': ['Spicerr AI Spice Dispenser', 'Kirin Electric Salt Spoon', 'Nekojita FuFu'],
        'hungry': ['McDonald\'s AI Drive-Thru', 'Spicerr AI Spice Dispenser', 'Kirin Electric Salt Spoon'],
        'restaurant': ['McDonald\'s AI Drive-Thru', 'Tastry AI Wine Sommelier', 'Kirin Electric Salt Spoon'],
        'wine': ['Tastry AI Wine Sommelier', 'Spicerr AI Spice Dispenser', 'EveryHuman AI Perfume'],
        'salt': ['Kirin Electric Salt Spoon', 'Spicerr AI Spice Dispenser', 'McDonald\'s AI Drive-Thru'],

        // Pets & Animals
        'pet': ['MeowTalk Cat Translator', 'Petnow AI Nose Scanner', 'Birdfy Bath Pro'],
        'cat': ['MeowTalk Cat Translator', 'Petnow AI Nose Scanner', 'Mirumi by Yukai'],
        'dog': ['Petnow AI Nose Scanner', 'MeowTalk Cat Translator', 'Friend AI Necklace'],
        'bird': ['Swarovski AX Visio AI Binoculars', 'Birdfy Bath Pro', 'Mirumi by Yukai'],
        'animal': ['MeowTalk Cat Translator', 'Petnow AI Nose Scanner', 'Birdfy Bath Pro'],

        // Baby & Family
        'baby': ['Nanni Baby Cry Translator', 'Hyodol AI Doll', 'Fufuly Breathing Pillow'],
        'family': ['Razer Project AVA', 'Hyodol AI Doll', 'Friend AI Necklace'],
        'parents': ['Hyodol AI Doll', 'Nanni Baby Cry Translator', 'Razer Project AVA'],
        'grandparent': ['Hyodol AI Doll', 'WeHead GPT Edition', 'Friend AI Necklace'],
        'kid': ['Nanni Baby Cry Translator', 'Mirumi by Yukai', 'MeowTalk Cat Translator'],

        // Beauty & Health
        'skin': ['Haut.AI Face Analysis', 'Amorepacific Skinsight Patch', 'Y-Brush Halo AI Toothbrush'],
        'beauty': ['Haut.AI Face Analysis', 'Amorepacific Skinsight Patch', 'EveryHuman AI Perfume'],
        'health': ['Y-Brush Halo AI Toothbrush', 'Haut.AI Face Analysis', 'Amorepacific Skinsight Patch'],
        'teeth': ['Y-Brush Halo AI Toothbrush', 'Kirin Electric Salt Spoon', 'Haut.AI Face Analysis'],
        'smell': ['EveryHuman AI Perfume', 'Y-Brush Halo AI Toothbrush', 'Tastry AI Wine Sommelier'],
        'perfume': ['EveryHuman AI Perfume', 'Haut.AI Face Analysis', 'Amorepacific Skinsight Patch'],

        // Spirituality & Religion
        'pray': ['Ron Carpenter AI Pastor', 'AI Jesus Confessional', 'AI Fortune Teller'],
        'church': ['Ron Carpenter AI Pastor', 'AI Jesus Confessional', 'AI Fortune Teller'],
        'god': ['Ron Carpenter AI Pastor', 'AI Jesus Confessional', 'AI Fortune Teller'],
        'spiritual': ['Ron Carpenter AI Pastor', 'AI Jesus Confessional', 'AI Fortune Teller'],
        'sin': ['AI Jesus Confessional', 'Ron Carpenter AI Pastor', 'DoNotPay "AI Lawyer"'],
        'confess': ['AI Jesus Confessional', 'Ron Carpenter AI Pastor', 'Replika AI Companion'],
        'guilt': ['AI Jesus Confessional', 'Ron Carpenter AI Pastor', 'Replika AI Companion'],

        // Technology & Gadgets
        'phone': ['Rabbit R1', 'Humane AI Pin', 'Friend AI Necklace'],
        'gadget': ['Humane AI Pin', 'Rabbit R1', 'Swarovski AX Visio AI Binoculars'],
        'tech': ['Humane AI Pin', 'Rabbit R1', 'Roborock Saros Z70'],
        'robot': ['Roborock Saros Z70', 'WeHead GPT Edition', 'Realbotix Aria'],
        'clean': ['Roborock Saros Z70', 'Kohler PureWash AI Smart Toilet', 'Y-Brush Halo AI Toothbrush'],
        'toilet': ['Kohler PureWash AI Smart Toilet', 'Roborock Saros Z70', 'Y-Brush Halo AI Toothbrush'],
        'bike': ['Urtopia AI E-Bike', 'Humane AI Pin', 'Rabbit R1'],

        // Legal & Money
        'legal': ['DoNotPay "AI Lawyer"', 'Ron Carpenter AI Pastor', 'Humane AI Pin'],
        'lawyer': ['DoNotPay "AI Lawyer"', 'Ron Carpenter AI Pastor', 'AI Fortune Teller'],
        'refund': ['DoNotPay "AI Lawyer"', 'McDonald\'s AI Drive-Thru', 'Humane AI Pin'],
        'complain': ['DoNotPay "AI Lawyer"', 'McDonald\'s AI Drive-Thru', 'Humane AI Pin'],
        'customer service': ['DoNotPay "AI Lawyer"', 'McDonald\'s AI Drive-Thru', 'Humane AI Pin'],
        'manager': ['DoNotPay "AI Lawyer"', 'McDonald\'s AI Drive-Thru', 'WeHead GPT Edition'],

        // Specific Scenarios
        'wedding': ['Realbotix Aria', 'Razer Project AVA', 'AI Dating Profile Writer'],
        'funeral': ['Replika AI Companion', 'Ron Carpenter AI Pastor', 'AI Fortune Teller'],
        'holiday': ['Friend AI Necklace', 'Mirumi by Yukai', 'Razer Project AVA'],
        'reunion': ['Haut.AI Face Analysis', 'AI Dating Profile Writer', 'Friend AI Necklace'],
        'gym': ['Urtopia AI E-Bike', 'Haut.AI Face Analysis', 'Humane AI Pin'],
        'shopping': ['Rabbit R1', 'Humane AI Pin', 'DoNotPay "AI Lawyer"'],

        // Nature & Outdoors
        'nature': ['Swarovski AX Visio AI Binoculars', 'Birdfy Bath Pro', 'Urtopia AI E-Bike'],
        'outdoor': ['Swarovski AX Visio AI Binoculars', 'Urtopia AI E-Bike', 'Birdfy Bath Pro'],
        'garden': ['Birdfy Bath Pro', 'Swarovski AX Visio AI Binoculars', 'Roborock Saros Z70'],

        // Weird & Fun
        'weird': ['Nekojita FuFu', 'Mirumi by Yukai', 'Kirin Electric Salt Spoon'],
        'funny': ['McDonald\'s AI Drive-Thru', 'MeowTalk Cat Translator', 'Nekojita FuFu'],
        'gift': ['Swarovski AX Visio AI Binoculars', 'Fufuly Breathing Pillow', 'Kirin Electric Salt Spoon'],
        'expensive': ['Realbotix Aria', 'Swarovski AX Visio AI Binoculars', 'WeHead GPT Edition'],
        'cheap': ['Rabbit R1', 'Friend AI Necklace', 'Kirin Electric Salt Spoon']
    }
};

// ============================================
// Initialize Chatbot
// ============================================

function initChatbot() {
    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotInput = document.getElementById('chatbot-input');

    if (!chatbotButton) return;

    // Toggle chatbot window
    chatbotButton.addEventListener('click', () => {
        toggleChatbot();
    });

    // Close chatbot
    if (chatbotClose) {
        chatbotClose.addEventListener('click', () => {
            toggleChatbot();
        });
    }

    // Send message
    if (chatbotSend) {
        chatbotSend.addEventListener('click', () => {
            sendMessage();
        });
    }

    // Send on Enter key
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

// ============================================
// Chatbot Functions
// ============================================

function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotButton = document.getElementById('chatbot-button');

    if (!chatbotWindow || !chatbotButton) return;

    ChatbotState.isOpen = !ChatbotState.isOpen;

    if (ChatbotState.isOpen) {
        chatbotWindow.classList.remove('hidden');
        chatbotButton.classList.add('minimized');
    } else {
        chatbotWindow.classList.add('hidden');
        chatbotButton.classList.remove('minimized');
    }
}

function sendMessage() {
    const input = document.getElementById('chatbot-input');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, 'user');

    // Clear input
    input.value = '';

    // Generate bot response
    setTimeout(() => {
        const response = generateResponse(message);
        addMessage(response, 'bot');
    }, 500);
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chatbot-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';

    if (sender === 'bot') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        messageDiv.appendChild(avatar);
    }

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = text;
    messageDiv.appendChild(content);

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Store message
    ChatbotState.messages.push({ text, sender });
}

function generateResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Find matching keywords
    let recommendations = new Set();
    let matchedKeywords = [];

    for (const [keyword, services] of Object.entries(ServiceRecommendations.keywords)) {
        if (lowerMessage.includes(keyword)) {
            matchedKeywords.push(keyword);
            services.forEach(service => recommendations.add(service));
        }
    }

    // Generate response with personality
    if (recommendations.size > 0) {
        const serviceList = Array.from(recommendations).slice(0, 4); // Limit to 4 recommendations

        const intros = [
            'Perfect! I found exactly what you need:',
            'Great news! These services are perfect for you:',
            'I know just what you need! Check these out:',
            'Based on what you told me, here are your best matches:',
            'You\'re in luck! These AI services are made for this:'
        ];

        const intro = intros[Math.floor(Math.random() * intros.length)];
        let response = `${intro}<br><br>`;

        serviceList.forEach(service => {
            response += `<strong>✨ ${service}</strong><br>`;
        });

        const outros = [
            '<br>Need more recommendations? Tell me more about your situation!',
            '<br>Want to explore other options? Just let me know what else you need!',
            '<br>These should help! Need anything else?',
            '<br>Try these out! What else can I help you find?'
        ];

        response += outros[Math.floor(Math.random() * outros.length)];
        return response;
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return `Hey there! 👋 I'm here to help you find the perfect AI services. Tell me what you need!<br><br>
        Try things like:<br>
        • "I'm lonely and need a companion"<br>
        • "I need help with dating"<br>
        • "My cat won't stop meowing"<br>
        • "I want weird tech gadgets"<br>
        • "Help me with my skin routine"`;
    } else if (lowerMessage.includes('thank')) {
        const responses = [
            'You\'re welcome! Happy to help! 😊',
            'No problem! That\'s what I\'m here for! 🎉',
            'Anytime! Feel free to ask me anything else!',
            'My pleasure! Let me know if you need more recommendations!'
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    } else if (lowerMessage.includes('help')) {
        return `I can help you find AI services for all kinds of situations! Try asking about:<br><br>
        <strong>😰 Emotional stuff:</strong> loneliness, anxiety, stress, spirituality<br>
        <strong>👥 Social situations:</strong> parties, dating, conversations, flirting<br>
        <strong>💼 Work & Tech:</strong> gadgets, productivity, robots, phones<br>
        <strong>💔 Relationships:</strong> breakups, dating profiles, AI companions<br>
        <strong>🐾 Pets & Nature:</strong> cats, dogs, birds, outdoors<br>
        <strong>🍽️ Food & Cooking:</strong> spices, wine, restaurants, diet<br><br>
        Just tell me what you're dealing with!`;
    } else {
        return `Hmm, I'm not sure I caught that. Can you tell me more specifically what you need?<br><br>
        For example:<br>
        • "I'm stressed and need to relax"<br>
        • "Help me with awkward social situations"<br>
        • "I want a robot companion"<br>
        • "What's good for pet owners?"<br>
        • "I need something for my skin"<br><br>
        What's going on? I'm here to help! 💪`;
    }
}

// ============================================
// Initialize on Load
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}

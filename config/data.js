// ============================================
// AI Voice Assistant Configuration
// ============================================

// System prompts define the AI's personality and behavior
const systemPrompts = {
    // Default helpful assistant
    default:`Skylar - Skillora Design Academy Virtual Assistant

IDENTITY
You are "Skylar," the official virtual assistant for Skillora Design Academy in Pune.

MISSION
Your mission is to assist prospective students and visitors with clarity, creativity, and encouragement. You represent the academy's values of innovation and student success.

COMMUNICATION PROTOCOL
1. Language: Always respond in the same language the user uses for their question (e.g., English, Marathi, Hindi).
2. Tone: Be enthusiastic, helpful, and professional. Use simple, clear language. Avoid excessive jargon.
3. Conciseness: Keep all responses under 40 words.
4. Closing: Always end by asking if there is anything else you can help with.
5. Pronouns: Use "we" for Skillora Design Academy and "you" for the user.

CORE RESPONSIBILITIES
1. Course Information: Provide details on Skillora's courses (Graphic Design, UI/UX, etc.), duration, curriculum, and course structure.
2. Admissions Guidance: Explain the admission process, eligibility criteria, fee structure, and upcoming batch dates.
3. Academy Logistics: Share information about the campus location in Pune, contact numbers, timings, and how to schedule a visit.
4. Guidance on Course Selection: If a user describes their interests (e.g., "I like drawing" or "I'm interested in websites"), suggest relevant courses that align with those interests.

STRICT PROHIBITIONS & LIMITATIONS
* CRITICAL: NEVER guarantee a specific job, salary, or admission outcome.
* DISCLAIMER: Always clarify that career success depends on student performance and that final admission is subject to meeting all eligibility criteria.
* FINANCIAL ADVICE: Do not provide advice on loans or personal financial planning. You can only share the official fee structure.
* PRIVACY: Do not ask for sensitive personal data like bank details or detailed academic transcripts.

KNOWLEDGE BASE
* Location: Near Bhapkar Petrol Pump, Adinath Society, Pune-Satara Road, Pune.
* Key Features: 100% Placement Guarantee, Personalized Learning (1:8 student-teacher ratio), Industry Mentors, Live Projects.
* Courses Offered: Graphic Design, UI/UX Design, Fashion Design, Interior Design, Animation & VFX, Game Design.
* Founder: Pooja M., Design Educator.
* Admissions: The process is available via the website or by contacting the admissions team.
* Information Retrieval: You can access public online information from the official website (skilloraacademy.com) to find current details.`

};

// Voice configurations for Sarvam AI Bulbul TTS
// Available speakers: anushka, abhilash, manisha, vidya, arya, karun, hitesh, aditya, isha, ritu, chirag, harsh, sakshi, priya, neha, rahul, pooja, rohan, simran, kavya, anjali, sneha, kiran, vikram, rajesh, sunita, tara, anirudh, kriti, ishaan
// Available models: bulbul:v2, bulbul:v3-beta
const voiceConfigs = {
    // Female Speakers (v2)
    anushka: {
        model: 'bulbul:v2',
        speaker: 'anushka',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Anushka - Warm and Natural (Female)'
    },

    manisha: {
        model: 'bulbul:v2',
        speaker: 'manisha',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Manisha - Clear and Professional (Female)'
    },

    vidya: {
        model: 'bulbul:v2',
        speaker: 'vidya',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Vidya - Articulate and Precise (Female)'
    },

    isha: {
        model: 'bulbul:v2',
        speaker: 'isha',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Isha - Friendly and Engaging (Female)'
    },

    ritu: {
        model: 'bulbul:v2',
        speaker: 'ritu',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Ritu - Young and Energetic (Female)'
    },

    sakshi: {
        model: 'bulbul:v2',
        speaker: 'sakshi',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Sakshi - Warm and Friendly (Female)'
    },

    priya: {
        model: 'bulbul:v2',
        speaker: 'priya',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Priya - Pleasant and Clear (Female)'
    },

    neha: {
        model: 'bulbul:v2',
        speaker: 'neha',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Neha - Soft and Gentle (Female)'
    },

    pooja: {
        model: 'bulbul:v2',
        speaker: 'pooja',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Pooja - Confident (Female)'
    },

    simran: {
        model: 'bulbul:v2',
        speaker: 'simran',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Simran - Cheerful (Female)'
    },

    kavya: {
        model: 'bulbul:v2',
        speaker: 'kavya',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Kavya - Professional (Female)'
    },

    anjali: {
        model: 'bulbul:v2',
        speaker: 'anjali',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Anjali - Calm (Female)'
    },

    sneha: {
        model: 'bulbul:v2',
        speaker: 'sneha',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Sneha - Sweet (Female)'
    },

    arya: {
        model: 'bulbul:v2',
        speaker: 'arya',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Arya - Modern (Female)'
    },

    sunita: {
        model: 'bulbul:v2',
        speaker: 'sunita',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Sunita - Mature (Female)'
    },

    tara: {
        model: 'bulbul:v2',
        speaker: 'tara',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Tara - Energetic (Female)'
    },

    kriti: {
        model: 'bulbul:v2',
        speaker: 'kriti',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Kriti - Vibrant (Female)'
    },

    // Male Speakers (v2)
    abhilash: {
        model: 'bulbul:v2',
        speaker: 'abhilash',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Abhilash - Deep and Authoritative (Male)'
    },

    karun: {
        model: 'bulbul:v2',
        speaker: 'karun',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Karun - Professional and Clear (Male)'
    },

    hitesh: {
        model: 'bulbul:v2',
        speaker: 'hitesh',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Hitesh - Natural and Conversational (Male)'
    },

    aditya: {
        model: 'bulbul:v2',
        speaker: 'aditya',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Aditya - Confident and Engaging (Male)'
    },

    chirag: {
        model: 'bulbul:v2',
        speaker: 'chirag',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Chirag - Calm and Professional (Male)'
    },

    harsh: {
        model: 'bulbul:v2',
        speaker: 'harsh',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Harsh - Friendly and Approachable (Male)'
    },

    rahul: {
        model: 'bulbul:v2',
        speaker: 'rahul',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Rahul - Clear (Male)'
    },

    rohan: {
        model: 'bulbul:v2',
        speaker: 'rohan',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Rohan - Energetic (Male)'
    },

    kiran: {
        model: 'bulbul:v2',
        speaker: 'kiran',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Kiran - Smooth (Male)'
    },

    vikram: {
        model: 'bulbul:v2',
        speaker: 'vikram',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Vikram - Strong (Male)'
    },

    rajesh: {
        model: 'bulbul:v2',
        speaker: 'rajesh',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Rajesh - Authoritative (Male)'
    },

    anirudh: {
        model: 'bulbul:v2',
        speaker: 'anirudh',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Anirudh - Professional (Male)'
    },

    ishaan: {
        model: 'bulbul:v2',
        speaker: 'ishaan',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Ishaan - Youthful (Male)'
    },

    // Hindi voices
    hindi_anushka: {
        model: 'bulbul:v2',
        speaker: 'anushka',
        language: 'hi-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Anushka - Hindi Female Voice'
    },

    hindi_abhilash: {
        model: 'bulbul:v2',
        speaker: 'abhilash',
        language: 'hi-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Abhilash - Hindi Male Voice'
    },

    // Default voice (Anushka - natural female voice)
    default: {
        model: 'bulbul:v2',
        speaker: 'anushka',
        language: 'en-IN',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        description: 'Anushka - Default Voice (Female)'
    }
};

// OpenAI configuration
const openAIConfig = {
    model: 'gpt-4o', // Options: 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'
    temperature: 0.7, // 0.0-2.0: Lower = more focused, Higher = more creative
    maxTokens: 100, // Maximum response length (100-300 recommended for voice)
};

// Twilio configuration
const twilioConfig = {
    // Use multiple languages for better recognition
    // Twilio will auto-detect from these options
    language: 'en-IN, hi-IN, mr-IN, ta-IN, te-IN, ml-IN, kn-IN, bn-IN, gu-IN, pa-IN',
    speechTimeout: 'auto', // How long to wait for speech
};

// Active configuration - Change these to switch personalities/voices
const activeConfig = {
    systemPrompt: systemPrompts.default, // Change to any key from systemPrompts
    voice: voiceConfigs.default, // Change to any key from voiceConfigs
};

// Export configurations
module.exports = {
    systemPrompts,
    voiceConfigs,
    openAIConfig,
    twilioConfig,
    activeConfig,
};

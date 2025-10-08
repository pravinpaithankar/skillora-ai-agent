// ============================================
// AI Voice Assistant Server - Enhanced Version
// Built with Twilio, OpenAI Whisper, GPT-4, and Sarvam AI
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { VoiceResponse } = require('twilio').twiml;
const twilio = require('twilio');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { Translate } = require('@google-cloud/translate').v2;
const winston = require('winston');

// Import configuration from data.js
const { activeConfig, openAIConfig, twilioConfig } = require('./config/data');

// ============================================
// Logger Configuration
// ============================================

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'ai-voice-assistant' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ============================================
// Configuration & Initialization
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// OpenAI configuration with Whisper support
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Translate
const translate = new Translate({
    key: process.env.GOOGLE_TRANSLATE_API_KEY
});

// System prompt and voice config from data.js
const systemPrompt = activeConfig.systemPrompt;
const voiceConfig = activeConfig.voice;

// Conversation history storage (in production, use Redis or database)
const conversationHistory = new Map();

// Audio file cleanup tracking
const audioCleanupQueue = new Map();

// ============================================
// File Upload Configuration
// ============================================

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Manual file upload handler (replacing multer)
const uploadMiddleware = (req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        const busboy = require('busboy');
        const bb = busboy({
            headers: req.headers,
            limits: {
                fileSize: 25 * 1024 * 1024, // 25MB
                files: 1
            }
        });

        let fileData = null;
        let fileInfo = null;

        bb.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;

            // Validate mime type
            const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a'];
            if (!allowedMimes.includes(mimeType)) {
                file.resume();
                return next(new Error('Invalid file type. Only audio files allowed.'));
            }

            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                fileData = Buffer.concat(chunks);
                fileInfo = { fieldname, filename, mimeType, size: fileData.length };
            });
        });

        bb.on('field', (name, val) => {
            req.body = req.body || {};
            req.body[name] = val;
        });

        bb.on('finish', () => {
            if (fileData) {
                const ext = fileInfo.mimeType.split('/')[1].replace('x-', '');
                const filepath = path.join(tempDir, `upload_${uuidv4()}.${ext}`);
                fs.writeFileSync(filepath, fileData);

                req.file = {
                    fieldname: fileInfo.fieldname,
                    originalname: fileInfo.filename,
                    mimetype: fileInfo.mimeType,
                    size: fileInfo.size,
                    path: filepath,
                    filename: path.basename(filepath)
                };
            }
            next();
        });

        bb.on('error', (err) => {
            next(err);
        });

        req.pipe(bb);
    } else {
        next();
    }
};

// ============================================
// Middleware
// ============================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for demo purposes
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 chat requests per minute
    message: 'Too many chat requests, please slow down.',
});

const whisperLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 Whisper requests per minute
    message: 'Too many transcription requests, please slow down.',
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// Translation Helper Functions
// ============================================

const languageMapping = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'ml': 'ml-IN',
    'kn': 'kn-IN',
    'mr': 'mr-IN',
    'bn': 'bn-IN',
    'gu': 'gu-IN',
    'pa': 'pa-IN'
};

// Detect language and correct transcription using OpenAI
async function detectLanguageAndCorrect(text) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a Course Recommendation Expert for Skillora Design Academy. Your purpose is to analyze a user's informal description of their creative interests or career goals and map them to a specific course.

Your tasks:
1. Analyze the user's query to identify their core creative interest (e.g., drawing, websites, video editing, decorating, fashion).
2. Identify the single most relevant course at Skillora that matches this interest.
3. Provide a brief, one-sentence reason for your recommendation.

Respond in this EXACT format:
INTEREST_DETECTED: [A brief summary of the user's interest]
RECOMMENDED_COURSE: [The name of the most suitable course]
REASON: [A short sentence explaining why this course is a match]

---
Examples:

Input: "I love to draw characters and want to make them move like in cartoons"
Output:
INTEREST_DETECTED: Drawing and making characters move.
RECOMMENDED_COURSE: Animation & VFX
REASON: This course focuses on bringing characters to life through animation principles and visual effects.

Input: "mujhe apps aur websites ko easy to use banana hai"
Output:
INTEREST_DETECTED: Making apps and websites easy to use.
RECOMMENDED_COURSE: UI/UX Design
REASON: This course teaches how to design user-friendly interfaces and experiences for digital products.

Input: "I want to learn how to edit videos for youtube and add special effects"
Output:
INTEREST_DETECTED: Editing videos and adding special effects for online platforms.
RECOMMENDED_COURSE: VFX & Video Editing
REASON: This course covers professional video editing techniques and visual effects used in modern online content.`
                },
                { role: 'user', content: text }
            ],
            temperature: 0,
            max_tokens: 150
        });

        const response = completion.choices[0].message.content.trim();
        const langMatch = response.match(/LANGUAGE:\s*([a-z]{2})/i);
        const correctedMatch = response.match(/CORRECTED:\s*(.+)/i);

        const detectedLang = langMatch ? langMatch[1].toLowerCase() : 'en';
        const correctedText = correctedMatch ? correctedMatch[1].trim() : text;

        logger.info('Language detection', {
            original: text,
            detected: detectedLang,
            corrected: correctedText
        });

        return { language: detectedLang, correctedText };
    } catch (error) {
        logger.error('Language detection error:', error);
        return { language: 'en', correctedText: text };
    }
}

async function translateToEnglish(text, sourceLanguage) {
    try {
        if (sourceLanguage === 'en') {
            return text;
        }

        if (!process.env.GOOGLE_TRANSLATE_API_KEY ||
            process.env.GOOGLE_TRANSLATE_API_KEY.trim() === '' ||
            process.env.GOOGLE_TRANSLATE_API_KEY === 'your_google_translate_api_key_here') {
            return text;
        }

        const [translation] = await translate.translate(text, 'en');
        logger.info('Translation to English', { original: text, translated: translation });
        return translation;
    } catch (error) {
        logger.error('Translation to English error:', error);
        return text;
    }
}

async function translateFromEnglish(text, targetLanguage) {
    try {
        if (targetLanguage === 'en') {
            return text;
        }

        if (!process.env.GOOGLE_TRANSLATE_API_KEY ||
            process.env.GOOGLE_TRANSLATE_API_KEY.trim() === '' ||
            process.env.GOOGLE_TRANSLATE_API_KEY === 'your_google_translate_api_key_here') {
            return text;
        }

        const [translation] = await translate.translate(text, targetLanguage);
        logger.info('Translation from English', { text, targetLanguage, translation });
        return translation;
    } catch (error) {
        logger.error(`Translation to ${targetLanguage} error:`, error);
        return text;
    }
}

function getSarvamLanguageCode(googleLangCode) {
    return languageMapping[googleLangCode] || 'en-IN';
}

// ============================================
// Whisper Integration for Speech Recognition
// ============================================

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {string|Buffer} audioInput - Path to audio file or audio buffer
 * @param {string} language - Optional language code (e.g., 'en', 'hi', 'mr')
 * @returns {Promise<{text: string, language: string}>}
 */
async function transcribeWithWhisper(audioInput, language = null) {
    try {
        let audioFile;
        let tempFilePath = null;

        // Handle Buffer input
        if (Buffer.isBuffer(audioInput)) {
            tempFilePath = path.join(tempDir, `whisper_${uuidv4()}.wav`);
            fs.writeFileSync(tempFilePath, audioInput);
            audioFile = fs.createReadStream(tempFilePath);
        } else if (typeof audioInput === 'string') {
            // Handle file path input
            if (!fs.existsSync(audioInput)) {
                throw new Error(`Audio file not found: ${audioInput}`);
            }
            audioFile = fs.createReadStream(audioInput);
        } else {
            throw new Error('Invalid audio input type');
        }

        const transcriptionParams = {
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
        };

        // Add language hint if provided
        if (language) {
            transcriptionParams.language = language;
        }

        logger.info('Starting Whisper transcription', { language });

        const transcription = await openai.audio.transcriptions.create(transcriptionParams);

        // Cleanup temp file if created
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        logger.info('Whisper transcription completed', {
            text: transcription.text,
            detectedLanguage: transcription.language,
            duration: transcription.duration
        });

        return {
            text: transcription.text,
            language: transcription.language || 'en',
            duration: transcription.duration
        };
    } catch (error) {
        logger.error('Whisper transcription error:', error);
        throw new Error(`Whisper transcription failed: ${error.message}`);
    }
}

// ============================================
// Audio File Management
// ============================================

/**
 * Schedule audio file for cleanup
 * @param {string} filePath - Path to the audio file
 * @param {number} delayMs - Delay in milliseconds before cleanup
 */
function scheduleAudioCleanup(filePath, delayMs = 60000) {
    const timeoutId = setTimeout(() => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`Cleaned up audio file: ${filePath}`);
            }
            audioCleanupQueue.delete(filePath);
        } catch (error) {
            logger.error(`Error cleaning up audio file ${filePath}:`, error);
        }
    }, delayMs);

    audioCleanupQueue.set(filePath, timeoutId);
}

/**
 * Clean up all pending audio files
 */
function cleanupAllAudioFiles() {
    audioCleanupQueue.forEach((timeoutId, filePath) => {
        clearTimeout(timeoutId);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                logger.info(`Force cleaned up: ${filePath}`);
            }
        } catch (error) {
            logger.error(`Error force cleaning ${filePath}:`, error);
        }
    });
    audioCleanupQueue.clear();
}

// ============================================
// Routes
// ============================================

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint with detailed status
app.get('/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            openai: !!process.env.OPENAI_API_KEY,
            twilio: !!(accountSid && authToken),
            sarvam: !!(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY !== 'your_sarvam_api_key_here'),
            googleTranslate: !!(process.env.GOOGLE_TRANSLATE_API_KEY && process.env.GOOGLE_TRANSLATE_API_KEY !== 'your_google_translate_api_key_here')
        },
        voiceConfig: {
            speaker: voiceConfig.speaker,
            model: voiceConfig.model,
            language: voiceConfig.language
        },
        activeConversations: conversationHistory.size,
        pendingCleanups: audioCleanupQueue.size
    };

    res.json(health);
});

// Initiate outbound call with validation
app.post('/make-call',
    body('phoneNumber').isMobilePhone('any').withMessage('Invalid phone number'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Invalid phone number provided', { errors: errors.array() });
            return res.status(400).json({ error: 'Invalid phone number format', details: errors.array() });
        }

        const { phoneNumber } = req.body;

        try {
            const call = await client.calls.create({
                to: phoneNumber,
                from: twilioPhoneNumber,
                url: `${process.env.PUBLIC_URL}/twilio-voice`,
                statusCallback: `${process.env.PUBLIC_URL}/call-status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            });

            logger.info(`Call initiated: ${call.sid} to ${phoneNumber}`);
            res.json({ success: true, callSid: call.sid });
        } catch (error) {
            logger.error('Error making call:', error);
            res.status(500).json({ error: 'Failed to initiate call', details: error.message });
        }
    }
);

// Twilio webhook - called when user answers
app.post('/twilio-voice', (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;

    // Initialize conversation history for this call
    conversationHistory.set(callSid, [
        { role: 'system', content: systemPrompt }
    ]);

    logger.info(`New call started: ${callSid}`);

    // Gather user speech with initial greeting
    const gather = twiml.gather({
        input: 'speech',
        action: `/handle-speech?callSid=${callSid}`,
        speechTimeout: twilioConfig.speechTimeout,
        language: twilioConfig.language,
        enhanced: true, // Use enhanced model for better accuracy
    });

    gather.say('This is the test call for you, You can speak now the assistant will respond accordingly.');

    // If no input, hangup
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
});

// Handle user speech and generate AI response
app.post('/handle-speech', async (req, res) => {
    const twiml = new VoiceResponse();
    const callSid = req.query.callSid;
    const userSpeech = req.body.SpeechResult;
    const confidence = req.body.Confidence;

    logger.info(`[${callSid}] Received speech result: "${userSpeech}" (confidence: ${confidence})`);

    if (userSpeech && callSid && conversationHistory.has(callSid)) {
        logger.info(`[${callSid}] User said: "${userSpeech}"`);

        try {
            // Detect language and correct transcription using OpenAI
            logger.info(`[${callSid}] Detecting language...`);
            const correction = await detectLanguageAndCorrect(userSpeech);
            const detectedLanguage = correction.language;
            const correctedMessage = correction.correctedText;

            logger.info(`[${callSid}] Language detected: ${detectedLanguage}, Corrected: "${correctedMessage}"`);

            // Get language name for GPT instruction
            const languageNames = {
                'en': 'English',
                'hi': 'Hindi',
                'ta': 'Tamil',
                'te': 'Telugu',
                'ml': 'Malayalam',
                'kn': 'Kannada',
                'mr': 'Marathi',
                'bn': 'Bengali',
                'gu': 'Gujarati',
                'pa': 'Punjabi'
            };
            const languageName = languageNames[detectedLanguage] || 'English';

            // Get conversation history
            const history = conversationHistory.get(callSid);

            // Update system prompt with language instruction for this turn
            const messagesWithLanguage = [
                {
                    role: 'system',
                    content: `${systemPrompt}

CRITICAL LANGUAGE INSTRUCTION:
The user is speaking in ${languageName}. You MUST respond ONLY in ${languageName}.
- Write your ENTIRE response in ${languageName} language
- For Indian languages, you can use Roman script (transliteration) or native script
- Do NOT use English at all unless the user is speaking English
- Do NOT mix languages
- Keep responses concise (under 30 words) for phone calls

This is MANDATORY. Respond in ${languageName} ONLY.`
                },
                ...history.slice(1), // Skip original system prompt
                { role: 'user', content: correctedMessage }
            ];

            // Get AI response from OpenAI
            logger.info(`[${callSid}] Requesting GPT response in ${languageName}...`);
            const completion = await openai.chat.completions.create({
                model: openAIConfig.model,
                messages: messagesWithLanguage,
                temperature: openAIConfig.temperature,
                max_tokens: openAIConfig.maxTokens,
            });

            const gptResponse = completion.choices[0].message.content;
            logger.info(`[${callSid}] GPT says (in ${languageName}): "${gptResponse}"`);

            // Add corrected user message to conversation history
            history.push({
                role: 'user',
                content: correctedMessage,
                metadata: { originalLanguage: detectedLanguage, original: userSpeech }
            });

            // Add AI response to conversation history
            history.push({
                role: 'assistant',
                content: gptResponse,
                metadata: { language: detectedLanguage }
            });

            // Check if Sarvam AI is configured
            if (process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY !== 'your_sarvam_api_key_here') {
                logger.info(`[${callSid}] Using Sarvam AI for voice generation in ${languageName}...`);
                await handleSarvamAIResponse(twiml, gptResponse, callSid, detectedLanguage);
            } else {
                // Use Twilio's default text-to-speech
                logger.info(`[${callSid}] Using Twilio TTS...`);
                const gather = twiml.gather({
                    input: 'speech',
                    action: `/handle-speech?callSid=${callSid}`,
                    speechTimeout: twilioConfig.speechTimeout,
                    language: twilioConfig.language,
                    enhanced: true,
                });
                gather.say(gptResponse);
            }

        } catch (error) {
            logger.error(`[${callSid}] Error in conversation loop:`, error);

            // Provide error message and allow retry
            const gather = twiml.gather({
                input: 'speech',
                action: `/handle-speech?callSid=${callSid}`,
                speechTimeout: twilioConfig.speechTimeout,
                language: twilioConfig.language,
                enhanced: true,
            });
            gather.say('I seem to be having some trouble. Please try speaking again.');

            // Fallback hangup if no response
            twiml.say('Thank you for calling. Goodbye.');
            twiml.hangup();
        }
    } else {
        // No speech detected or invalid call
        logger.warn(`[${callSid}] No speech detected or invalid call. Speech: "${userSpeech}"`);

        // Give another chance to speak
        const gather = twiml.gather({
            input: 'speech',
            action: `/handle-speech?callSid=${callSid}`,
            speechTimeout: twilioConfig.speechTimeout,
            language: twilioConfig.language,
            enhanced: true,
        });
        gather.say('I did not catch that. Please speak clearly after the tone.');

        // If still no response, end the call
        twiml.say('I could not hear you. Please call back. Goodbye.');
        twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// Handle Sarvam AI voice generation
async function handleSarvamAIResponse(twiml, text, callSid, detectedLanguage = 'en') {
    try {
        const sarvamApiUrl = 'https://api.sarvam.ai/text-to-speech';

        // Get Sarvam language code from detected language
        const sarvamLanguageCode = getSarvamLanguageCode(detectedLanguage);
        logger.info(`[${callSid}] Sarvam language code: ${sarvamLanguageCode}`);

        const requestBody = {
            inputs: [text],
            target_language_code: sarvamLanguageCode,
            speaker: voiceConfig.speaker,
            model: voiceConfig.model,
            pitch: voiceConfig.pitch,
            pace: voiceConfig.pace,
            loudness: voiceConfig.loudness,
            enable_preprocessing: true,
            speech_sample_rate: 22050
        };

        const sarvamResponse = await axios.post(sarvamApiUrl, requestBody, {
            headers: {
                'api-subscription-key': process.env.SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'json',
            timeout: 30000 // 30 second timeout
        });

        logger.info(`[${callSid}] Sarvam AI response received`);

        const audioBase64 = sarvamResponse.data.audios[0];

        if (!audioBase64) {
            throw new Error('No audio data in Sarvam response');
        }

        const audioBuffer = Buffer.from(audioBase64, 'base64');

        // Save audio file to public directory
        const audioDir = path.join(__dirname, 'public', 'audio');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }

        const audioFileName = `${uuidv4()}.wav`;
        const audioFilePath = path.join(audioDir, audioFileName);
        fs.writeFileSync(audioFilePath, audioBuffer);

        const audioUrl = `${process.env.PUBLIC_URL}/audio/${audioFileName}`;
        logger.info(`[${callSid}] Audio saved: ${audioFileName} (${audioBuffer.length} bytes)`);

        // Use <Play> verb to play Sarvam AI generated audio
        const gather = twiml.gather({
            input: 'speech',
            action: `/handle-speech?callSid=${callSid}`,
            speechTimeout: twilioConfig.speechTimeout,
            language: voiceConfig.language,
            enhanced: true,
        });
        gather.play(audioUrl);

        // Schedule cleanup
        scheduleAudioCleanup(audioFilePath, 30000);

    } catch (error) {
        logger.error('[Sarvam AI Error]:', error);
        // Fallback to Twilio TTS
        const gather = twiml.gather({
            input: 'speech',
            action: `/handle-speech?callSid=${callSid}`,
            speechTimeout: twilioConfig.speechTimeout,
            language: twilioConfig.language,
            enhanced: true,
        });
        gather.say(text);
    }
}

// Call ended - cleanup conversation history
app.post('/call-status', (req, res) => {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;

    logger.info(`[${callSid}] Call status: ${callStatus}`);

    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
        if (conversationHistory.has(callSid)) {
            conversationHistory.delete(callSid);
            logger.info(`[${callSid}] Conversation history cleaned up`);
        }
    }

    res.sendStatus(200);
});

// Web chat endpoint with Whisper support
app.post('/chat', chatLimiter, async (req, res) => {
    const { message, conversationHistory: clientHistory } = req.body;
    const sessionId = req.headers['x-session-id'] || `web_${Date.now()}`;

    logger.info(`[${sessionId}] Web chat message: "${message}"`);

    try {
        let gptResponse;
        let detectedLanguage = 'en';

        // Handle initial greeting
        if (message === '__GREETING__') {
            gptResponse = "Hello! I am your assistant at the Skillora Design Academy. How can I help you today?";
            logger.info(`[${sessionId}] Sending greeting`);
        } else {
            // Detect language and correct transcription
            const correction = await detectLanguageAndCorrect(message);
            detectedLanguage = correction.language;
            const correctedMessage = correction.correctedText;

            const languageNames = {
                'en': 'English',
                'hi': 'Hindi',
                'ta': 'Tamil',
                'te': 'Telugu',
                'ml': 'Malayalam',
                'kn': 'Kannada',
                'mr': 'Marathi',
                'bn': 'Bengali',
                'gu': 'Gujarati',
                'pa': 'Punjabi'
            };
            const languageName = languageNames[detectedLanguage] || 'English';

            const messages = [
                { role: 'system', content: `${systemPrompt}

CRITICAL LANGUAGE INSTRUCTION:
The user is speaking in ${languageName}. You MUST respond ONLY in ${languageName}.
- Write your ENTIRE response in ${languageName} language using the appropriate script (Devanagari for Hindi/Marathi, Tamil script for Tamil, etc.)
- Do NOT use English at all
- Do NOT mix languages
- If you don't know how to say something in ${languageName}, still try your best to use ${languageName}

This is MANDATORY. Respond in ${languageName} ONLY.` },
                ...clientHistory,
                { role: 'user', content: correctedMessage }
            ];

            const completion = await openai.chat.completions.create({
                model: openAIConfig.model,
                messages: messages,
                temperature: openAIConfig.temperature,
                max_tokens: openAIConfig.maxTokens,
            });
            gptResponse = completion.choices[0].message.content;

            logger.info(`[${sessionId}] GPT response in ${languageName}: "${gptResponse}"`);
        }

        // Generate audio with Sarvam AI if enabled
        let audioUrl = null;

        if (process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY !== 'your_sarvam_api_key_here') {
            try {
                const sarvamApiUrl = 'https://api.sarvam.ai/text-to-speech';

                const requestBody = {
                    inputs: [gptResponse],
                    target_language_code: getSarvamLanguageCode(detectedLanguage),
                    speaker: voiceConfig.speaker,
                    model: voiceConfig.model,
                    pitch: voiceConfig.pitch,
                    pace: voiceConfig.pace,
                    loudness: voiceConfig.loudness,
                    enable_preprocessing: true,
                    speech_sample_rate: 22050
                };

                const sarvamResponse = await axios.post(sarvamApiUrl, requestBody, {
                    headers: {
                        'api-subscription-key': process.env.SARVAM_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'json',
                    timeout: 30000
                });

                const audioBase64 = sarvamResponse.data.audios[0];

                if (audioBase64) {
                    const audioBuffer = Buffer.from(audioBase64, 'base64');
                    const audioDir = path.join(__dirname, 'public', 'audio');
                    if (!fs.existsSync(audioDir)) {
                        fs.mkdirSync(audioDir, { recursive: true });
                    }

                    const audioFileName = `${uuidv4()}.wav`;
                    const audioFilePath = path.join(audioDir, audioFileName);
                    fs.writeFileSync(audioFilePath, audioBuffer);

                    audioUrl = `/audio/${audioFileName}`;
                    logger.info(`[${sessionId}] Audio saved: ${audioFileName}`);

                    scheduleAudioCleanup(audioFilePath, 60000);
                }
            } catch (error) {
                logger.error('[Sarvam AI Error for web chat]:', error);
            }
        }

        res.json({
            detectedLanguage: detectedLanguage,
            response: gptResponse,
            audioUrl: audioUrl
        });

    } catch (error) {
        logger.error('[Web Chat Error]:', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
});

// Whisper transcription endpoint for audio files
app.post('/transcribe', whisperLimiter, uploadMiddleware, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const language = req.body.language || null;
        const sessionId = req.headers['x-session-id'] || `transcribe_${Date.now()}`;

        logger.info(`[${sessionId}] Whisper transcription request`, {
            filename: req.file.originalname,
            size: req.file.size,
            language
        });

        // Transcribe with Whisper
        const transcription = await transcribeWithWhisper(req.file.path, language);

        // Cleanup uploaded file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            success: true,
            text: transcription.text,
            language: transcription.language,
            duration: transcription.duration
        });

    } catch (error) {
        logger.error('Transcription endpoint error:', error);

        // Cleanup on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Transcription failed',
            details: error.message
        });
    }
});

// Test audio generation endpoint
app.get('/test-audio', async (req, res) => {
    logger.info('[TEST] Testing Sarvam AI audio generation...');

    try {
        const testText = "Hello! This is a test of the audio system.";
        const sarvamApiUrl = 'https://api.sarvam.ai/text-to-speech';

        const requestBody = {
            inputs: [testText],
            target_language_code: voiceConfig.language,
            speaker: voiceConfig.speaker,
            model: voiceConfig.model,
            pitch: voiceConfig.pitch,
            pace: voiceConfig.pace,
            loudness: voiceConfig.loudness,
            enable_preprocessing: true,
            speech_sample_rate: 22050
        };

        const sarvamResponse = await axios.post(sarvamApiUrl, requestBody, {
            headers: {
                'api-subscription-key': process.env.SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'json',
            timeout: 30000
        });

        if (sarvamResponse.data.audios && sarvamResponse.data.audios[0]) {
            const audioBase64 = sarvamResponse.data.audios[0];
            const audioBuffer = Buffer.from(audioBase64, 'base64');

            const audioDir = path.join(__dirname, 'public', 'audio');
            if (!fs.existsSync(audioDir)) {
                fs.mkdirSync(audioDir, { recursive: true });
            }

            const audioFileName = `test_${Date.now()}.wav`;
            const audioFilePath = path.join(audioDir, audioFileName);
            fs.writeFileSync(audioFilePath, audioBuffer);
            const audioUrl = `/audio/${audioFileName}`;

            res.json({
                success: true,
                message: 'Audio generated successfully',
                audioUrl: audioUrl,
                localPath: `/audio/${audioFileName}`,
                fileSize: audioBuffer.length,
                text: testText
            });

            logger.info('[TEST] Audio saved:', audioFileName);
        } else {
            res.json({
                success: false,
                message: 'No audio in response',
                response: sarvamResponse.data
            });
        }
    } catch (error) {
        logger.error('[TEST] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response ? error.response.data : null
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);

    if (error.message && error.message.includes('file')) {
        return res.status(400).json({
            error: 'File upload error',
            details: error.message
        });
    }

    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
    });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info('🤖 AI Voice Assistant Server Started (Enhanced with Whisper)');
    logger.info('='.repeat(50));
    logger.info(`📞 Server running on: http://localhost:${PORT}`);
    logger.info(`🌐 Public URL: ${process.env.PUBLIC_URL || 'Not set - run ngrok!'}`);
    logger.info(`🔑 Twilio Phone: ${twilioPhoneNumber || 'Not configured'}`);
    logger.info(`🎙️  Sarvam AI: ${process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY !== 'your_sarvam_api_key_here' ? `Enabled (${voiceConfig.description})` : 'Disabled (using Twilio TTS)'}`);
    logger.info(`🎯 OpenAI Whisper: Enabled`);
    logger.info(`🤖 AI Model: ${openAIConfig.model}`);
    logger.info(`🗣️  Voice Language: ${voiceConfig.language}`);
    logger.info('='.repeat(50));
    logger.info('\n💡 Next steps:');
    logger.info('1. Run: ngrok http 3000');
    logger.info('2. Copy ngrok URL to .env PUBLIC_URL');
    logger.info('3. Restart this server');
    logger.info('4. Configure Twilio webhook with your ngrok URL');
    logger.info('5. Open http://localhost:3000 to start calling!\n');
    logger.info('📝 To customize: Edit config/data.js to change personality or voice\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('👋 Shutting down gracefully...');
    cleanupAllAudioFiles();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('👋 Received SIGTERM, shutting down gracefully...');
    cleanupAllAudioFiles();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    cleanupAllAudioFiles();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

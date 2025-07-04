import twilio from 'twilio';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ttsService from './tts.service.js';
import CallLog from '../models/calllog.model.js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Get current directory for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TwilioService {

    constructor() {
        // Initialize Twilio client with environment variables
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        console.log('📞 Twilio Phone Number:', this.twilioPhoneNumber);
        console.log('📞 Twilio Account SID:', this.accountSid);
        console.log('📞 Twilio Auth Token:', this.authToken ? 'Set' : 'Not set');

        // Validate required environment variables
        if (!this.accountSid || !this.authToken) {
            console.warn('⚠️ Twilio credentials not found in environment variables');
            console.warn('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
            this.client = null;
        } else {
            // Initialize Twilio client
            try {
                this.client = twilio(this.accountSid, this.authToken);
                console.log('📞 Twilio client initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Twilio client:', error);
                this.client = null;
            }
        }
    }

    /**
     * Map language names to Reverie speaker identifiers
     * @param {string} language - Language name (e.g., "English", "Hindi")
     * @param {string} gender - Gender preference ("male" or "female")
     * @returns {string} Reverie speaker identifier
     */
    mapLanguageToSpeaker(language, gender = 'female') {
        const speakerMap = {
            'English': {
                'male': 'en_male',
                'female': 'en_female'
            },
            'Hindi': {
                'male': 'hi_male',
                'female': 'hi_female'
            },
            'Bengali': {
                'male': 'bn_male',
                'female': 'bn_female'
            }
        };
        
        const langSpeakers = speakerMap[language];
        if (!langSpeakers) {
            return 'hi_female'; // Default to Hindi female
        }
        
        return langSpeakers[gender] || langSpeakers['female'] || 'hi_female';
    }

    /**
     * Generate TTS audio and save it to a file
     * @param {string} text - Text to convert to speech
     * @param {string} language - Language for TTS (e.g., 'Hindi', 'English')
     * @param {string} gender - Gender preference ('male' or 'female')
     * @returns {Promise<string>} Public URL to the saved audio file
     */
    async generateAndSaveAudio(text, language = 'Hindi', gender = 'female') {
        try {
            console.log('🎤 Generating TTS audio...');
            console.log(`Text: ${text}`);
            console.log(`Language: ${language}, Gender: ${gender}`);

            // Map language to speaker ID
            const speaker = this.mapLanguageToSpeaker(language, gender);
            console.log(`🗣️ Selected speaker: ${speaker}`);

            // Generate TTS audio using the direct WAV service
            // Extract language and gender from speaker format (e.g., 'hi_female' -> 'hi', 'female')
            const [langCode, genderCode] = speaker.split('_');
            const result = await ttsService.generateTTSAudio(text, langCode, genderCode);
            const audioUrl = result.audioUrl;

            if (!audioUrl) {
                throw new Error('Failed to generate audio URL');
            }

            console.log(`✅ Audio generated and saved successfully`);
            console.log(`🔗 Audio URL: ${audioUrl}`);
            console.log(`🎵 Format: WAV (native from Reverie, Twilio-compatible)`);

            return audioUrl;

        } catch (error) {
            console.error('❌ Error generating and saving audio:', error.message);
            throw error;
        }
    }

    /**
     * Make a call to a contact for a specific campaign with Reverie TTS
     * @param {string} to - Phone number to call
     * @param {string} campaignId - Campaign ID for reference
     * @param {string} message - Custom message to speak (optional)
     * @param {string} language - Language for TTS (optional, defaults to Hindi)
     * @returns {Promise} Call result
     */
    async makeCall(to, campaignId, message = null, language = 'Hindi') {
        let tempCallSid = uuidv4();
        let callLogDoc = null;
        try {
            // Save call log to database BEFORE placing the call
            try {
                callLogDoc = await CallLog.create({
                    campaignId: campaignId,
                    language: language,
                    status: 'initiated',
                    startTime: new Date(),
                    contactId: null, // You can update this if you have contact info
                    aiResponseLog: [],
                    callSid: tempCallSid, // Temporary, will update after real callSid is known
                    to: to,
                    from: this.twilioPhoneNumber
                });
                console.log('✅ Call log (pre-call) saved to database');
            } catch (logErr) {
                console.error('❌ Failed to pre-save call log:', logErr);
            }

            console.log(`📞 Making call to ${to} for campaign ${campaignId}`);
            
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }

            if (!this.twilioPhoneNumber) {
                throw new Error('TWILIO_PHONE_NUMBER not set in environment variables');
            }

            if (!process.env.BASE_URL) {
                throw new Error('BASE_URL not set in environment variables - required for webhooks');
            }

            // Use custom message or default test message
            const ttsMessage = message || 'नमस्ते, यह Reverie और Twilio का टेस्ट कॉल है। आपका स्वागत है।';
            
            console.log(`🎵 Generating TTS for message: "${ttsMessage}"`);

            // Generate TTS audio and save to file
            const audioUrl = await this.generateAndSaveAudio(ttsMessage, language, 'female');

            // Create webhook URL that will serve the audio
            const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/twilio/play-tts?audioUrl=${encodeURIComponent(audioUrl)}`;
            console.log(`🔗 Webhook URL: ${webhookUrl}`);
            console.log(`🔗 Encoded Audio URL: ${encodeURIComponent(audioUrl)}`);

            // Create the voice call using Twilio API
            const call = await this.client.calls.create({
                from: this.twilioPhoneNumber,
                to: to,
                url: webhookUrl,
                method: 'POST',
                statusCallback: `${process.env.BASE_URL}/api/twilio/call-status?campaignId=${campaignId}`,
                statusCallbackMethod: 'POST',
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
            });

            // Update the call log with the real callSid
            if (callLogDoc) {
                try {
                    callLogDoc.callSid = call.sid;
                    callLogDoc.save();
                    console.log('✅ Call log updated with real callSid');
                } catch (updateErr) {
                    console.error('❌ Failed to update call log with real callSid:', updateErr);
                }
            }

            // Log successful call initiation
            console.log(`📞 Call initiated to ${to}: SID ${call.sid}`);
            console.log(`🎵 Audio will be played from: ${audioUrl}`);
            
            return {
                success: true,
                callSid: call.sid,
                to: to,
                from: this.twilioPhoneNumber,
                campaignId: campaignId,
                status: call.status,
                dateCreated: call.dateCreated,
                audioUrl: audioUrl,
                webhookUrl: webhookUrl
            };

        } catch (error) {
            // Log the error with proper formatting
            console.error(`❌ Failed to call ${to}: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                to: to,
                campaignId: campaignId
            };
        }
    }

    /**
     * Make a call using existing campaign data (legacy method)
     * @param {string} to - Phone number to call
     * @param {string} campaignId - Campaign ID for reference
     * @returns {Promise} Call result
     */
    async makeCallLegacy(to, campaignId) {
        let tempCallSid = uuidv4();
        let callLogDoc = null;
        try {
            // Save call log to database BEFORE placing the call
            try {
                callLogDoc = await CallLog.create({
                    campaignId: campaignId,
                    language: 'Hindi', // Default language for legacy calls
                    status: 'initiated',
                    startTime: new Date(),
                    contactId: null, // You can update this if you have contact info
                    aiResponseLog: [],
                    callSid: tempCallSid, // Temporary, will update after real callSid is known
                    to: to,
                    from: this.twilioPhoneNumber
                });
                console.log('✅ Call log (pre-call) saved to database for legacy call');
            } catch (logErr) {
                console.error('❌ Failed to pre-save call log for legacy call:', logErr);
            }

            console.log(`📞 Making legacy call to ${to} for campaign ${campaignId}`);
            
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }

            if (!this.twilioPhoneNumber) {
                throw new Error('TWILIO_PHONE_NUMBER not set in environment variables');
            }

            if (!process.env.BASE_URL) {
                throw new Error('BASE_URL not set in environment variables - required for webhooks');
            }

            // Create the voice call using Twilio API with legacy webhook
            const call = await this.client.calls.create({
                from: this.twilioPhoneNumber,
                to: to,
                url: `${process.env.BASE_URL}/api/twilio/voice-response?campaignId=${campaignId}`,
                statusCallback: `${process.env.BASE_URL}/api/twilio/call-status?campaignId=${campaignId}`,
                statusCallbackMethod: 'POST',
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
            });

            // Update the call log with the real callSid
            if (callLogDoc) {
                try {
                    callLogDoc.callSid = call.sid;
                    callLogDoc.save();
                    console.log('✅ Legacy call log updated with real callSid');
                } catch (updateErr) {
                    console.error('❌ Failed to update legacy call log with real callSid:', updateErr);
                }
            }

            // Log successful call initiation
            console.log(`📞 Legacy call initiated to ${to}: SID ${call.sid}`);
            
            return {
                success: true,
                callSid: call.sid,
                to: to,
                from: this.twilioPhoneNumber,
                campaignId: campaignId,
                status: call.status,
                dateCreated: call.dateCreated
            };

        } catch (error) {
            // Log the error with proper formatting
            console.error(`❌ Failed to call ${to}: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                to: to,
                campaignId: campaignId
            };
        }
    }

    /**
     * Get Twilio client instance
     * @returns {Object} Twilio client
     */
    getClient() {
        return this.client;
    }

    /**
     * Check if Twilio service is properly configured
     * @returns {boolean} Configuration status
     */
    isConfigured() {
        return this.client !== null && this.twilioPhoneNumber !== undefined;
    }

    /**
     * Get account information
     * @returns {Promise} Account details
     */
    async getAccountInfo() {
        try {
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }

            const account = await this.client.api.accounts(this.accountSid).fetch();
            return {
                accountSid: account.sid,
                friendlyName: account.friendlyName,
                status: account.status,
                type: account.type
            };

        } catch (error) {
            console.error('❌ Error fetching account info:', error);
            throw error;
        }
    }

    /**
     * Clean up old audio files (utility method - MANUAL USE ONLY)
     * NOTE: Audio files are preserved by default and not automatically deleted
     * @param {number} maxAgeHours - Maximum age of files to keep in hours
     */
    cleanupOldAudioFiles(maxAgeHours = 24) {
        try {
            console.log('🧹 Manual cleanup requested...');
            const audioDir = path.join(__dirname, '..', 'public', 'audio');
            
            if (!fs.existsSync(audioDir)) {
                console.log('📁 No audio directory found');
                return;
            }
            
            const files = fs.readdirSync(audioDir);
            const now = Date.now();
            const maxAge = maxAgeHours * 60 * 60 * 1000;
            
            let deletedCount = 0;
            let preservedCount = 0;
            
            files.forEach(file => {
                if ((file.startsWith('tts_') || file.startsWith('revup_')) && 
                    (file.endsWith('.mp3') || file.endsWith('.wav'))) {
                    const filePath = path.join(audioDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (now - stats.mtime.getTime() > maxAge) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        console.log(`🗑️ Deleted old file: ${file}`);
                    } else {
                        preservedCount++;
                    }
                }
            });
            
            console.log(`📊 Cleanup summary: ${deletedCount} deleted, ${preservedCount} preserved`);
            
        } catch (error) {
            console.error('❌ Error cleaning up audio files:', error.message);
        }
    }

    /**
     * Get real-time status of a call from Twilio
     * @param {string} callSid - The Twilio Call SID
     * @returns {Promise<string>} - The current status of the call
     */
    async getCallStatus(callSid) {
        try {
            console.log('📡 [TWILIO STATUS] Fetching status for callSid:', callSid);
            
            // Use the existing client instead of creating a new one
            if (!this.client) {
                console.error('❌ [TWILIO STATUS] Twilio client not initialized');
                return 'unknown';
            }
            
            // Skip real-time fetching for test/fake call SIDs
            if (callSid.startsWith('test_') || callSid.includes('test')) {
                console.log('🔄 [TWILIO STATUS] Skipping real-time status fetch for test call SID:', callSid);
                return 'test_call';
            }
            
            console.log('🔄 [TWILIO STATUS] Making API call to Twilio for callSid:', callSid);
            const call = await this.client.calls(callSid).fetch();
            
            console.log('✅ [TWILIO STATUS] Successfully fetched call status from Twilio');
            console.log(`📊 [TWILIO STATUS] Call ${callSid} status: ${call.status}`);
            console.log(`📊 [TWILIO STATUS] Call direction: ${call.direction}`);
            console.log(`📊 [TWILIO STATUS] Call duration: ${call.duration || 'N/A'}`);
            console.log(`📊 [TWILIO STATUS] Call from: ${call.from} to: ${call.to}`);
            
            return call.status;
        } catch (err) {
            // Handle specific Twilio errors gracefully
            if (err.message.includes('not found') || err.message.includes('404')) {
                console.log('🔄 [TWILIO STATUS] Call SID not found in Twilio (may be test/fake SID):', callSid);
                return 'not_found';
            } else {
                console.error('❌ [TWILIO STATUS] Failed to fetch call status:', err.message);
                console.error('❌ [TWILIO STATUS] Error details:', err);
                return 'unknown';
            }
        }
    }
}


export default new TwilioService(); 
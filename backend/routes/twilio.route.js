import express from 'express';
import twilio from 'twilio';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Campaign from '../models/campaign.model.js';

const router = express.Router();

// Initialize Google Cloud TTS client
const ttsClient = new TextToSpeechClient();

// Get current directory for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /voice-response - Handle Twilio voice response with campaign integration
router.post('/voice-response', async (req, res) => {
    try {
        console.log('📞 Received Twilio voice response request');
        console.log('Query params:', req.query);
        
        // Get campaignId from query parameters
        const { campaignId } = req.query;
        
        // Create a new TwiML voice response
        const twiml = new twilio.twiml.VoiceResponse();
        
        if (!campaignId) {
            console.log('⚠️ No campaign ID provided');
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Hello! This is a call from TeleCall AI. Campaign not specified.');
            
            res.type('text/xml');
            return res.send(twiml.toString());
        }
        
        // Find campaign by ID
        const campaign = await Campaign.findById(campaignId);
        
        if (!campaign) {
            console.log(`❌ Campaign not found: ${campaignId}`);
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Campaign not found. Please contact support.');
            
            res.type('text/xml');
            return res.send(twiml.toString());
        }
        
        console.log(`✅ Campaign found: ${campaign._id}`);
        
        // Get campaign details
        const { language, objective, sampleFlow } = campaign;
        
        // Generate reply text using campaign sample flow
        let replyText = sampleFlow || objective || 'Hello! This is a call from TeleCall AI. Thank you for answering!';
        
        // If sampleFlow is too long, truncate it for better TTS experience
        if (replyText.length > 300) {
            replyText = replyText.substring(0, 300) + '...';
        }
        
        console.log(`🎯 Campaign objective: ${objective}`);
        console.log(`📝 Reply text: ${replyText}`);
        
        // Generate audio using Google Cloud Text-to-Speech
        const audioUrl = await generateAudioFromText(replyText, language, campaignId);
        
        if (audioUrl) {
            console.log(`🎵 Audio generated: ${audioUrl}`);
            // Use Play element to play the generated audio
            twiml.play(audioUrl);
        } else {
            console.log('⚠️ Audio generation failed, using fallback TTS');
            // Fallback to built-in TTS if Google TTS fails
            twiml.say({
                voice: 'alice',
                language: mapLanguageToTwimlLanguage(language)
            }, replyText);
        }
        
        // Set response content type to XML and send TwiML
        res.type('text/xml');
        res.send(twiml.toString());
        
        console.log('✅ TwiML response sent successfully');
        
    } catch (error) {
        console.error('❌ Error creating voice response:', error);
        
        // Send fallback TwiML response
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say({
            voice: 'alice',
            language: 'en-IN'
        }, 'Sorry, there was an error processing your call. Please try again later.');
        
        res.type('text/xml');
        res.send(twiml.toString());
    }
});

/**
 * Generate audio from text using Google Cloud Text-to-Speech
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (e.g., 'English', 'Hindi')
 * @param {string} campaignId - Campaign ID for file naming
 * @returns {Promise<string|null>} Audio file URL or null if failed
 */
async function generateAudioFromText(text, language, campaignId) {
    try {
        // Map language to Google TTS language codes
        const languageCode = mapLanguageToGoogleTTS(language);
        
        // Construct the request
        const request = {
            input: { text: text },
            voice: {
                languageCode: languageCode,
                name: getVoiceName(languageCode),
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0.0
            }
        };
        
        // Perform the text-to-speech request
        const [response] = await ttsClient.synthesizeSpeech(request);
        
        // Create audio directory if it doesn't exist
        const audioDir = path.join(__dirname, '..', 'public', 'audio');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        
        // Generate unique filename
        const filename = `campaign_${campaignId}_${Date.now()}.mp3`;
        const filepath = path.join(audioDir, filename);
        
        // Write the binary audio content to file
        fs.writeFileSync(filepath, response.audioContent, 'binary');
        
        // Return the public URL for the audio file
        const audioUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/public/audio/${filename}`;
        
        console.log(`✅ Audio file generated: ${filename}`);
        return audioUrl;
        
    } catch (error) {
        console.error('❌ Error generating audio:', error);
        return null;
    }
}

/**
 * Map language string to Google TTS language codes
 * @param {string} language - Language string from campaign
 * @returns {string} Google TTS language code
 */
function mapLanguageToGoogleTTS(language) {
    const languageMap = {
        'English': 'en-US',
        'Hindi': 'hi-IN',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
        'German': 'de-DE',
        'Italian': 'it-IT',
        'Portuguese': 'pt-BR',
        'Japanese': 'ja-JP',
        'Korean': 'ko-KR',
        'Chinese': 'zh-CN'
    };
    
    return languageMap[language] || 'en-US';
}

/**
 * Get appropriate voice name for language
 * @param {string} languageCode - Google TTS language code
 * @returns {string} Voice name
 */
function getVoiceName(languageCode) {
    const voiceMap = {
        'en-US': 'en-US-Journey-F',
        'hi-IN': 'hi-IN-Neural2-A',
        'es-ES': 'es-ES-Neural2-A',
        'fr-FR': 'fr-FR-Neural2-A',
        'de-DE': 'de-DE-Neural2-A',
        'it-IT': 'it-IT-Neural2-A',
        'pt-BR': 'pt-BR-Neural2-A',
        'ja-JP': 'ja-JP-Neural2-B',
        'ko-KR': 'ko-KR-Neural2-A',
        'zh-CN': 'zh-CN-Neural2-A'
    };
    
    return voiceMap[languageCode] || 'en-US-Journey-F';
}

/**
 * Map language to Twilio TwiML language codes (fallback)
 * @param {string} language - Language string from campaign
 * @returns {string} Twilio TwiML language code
 */
function mapLanguageToTwimlLanguage(language) {
    const languageMap = {
        'English': 'en-US',
        'Hindi': 'hi-IN',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
        'German': 'de-DE',
        'Italian': 'it-IT',
        'Portuguese': 'pt-BR',
        'Japanese': 'ja-JP',
        'Korean': 'ko-KR',
        'Chinese': 'zh-CN'
    };
    
    return languageMap[language] || 'en-US';
}

export default router; 
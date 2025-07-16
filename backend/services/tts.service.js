import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Load __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TTSService {

    constructor() {
        this.audioDirectory = path.join(__dirname, '../public/audio');
        this.reverieApiUrl = 'https://revapi.reverieinc.com/';
        
        // Ensure audio directory exists
        if (!fs.existsSync(this.audioDirectory)) {
            fs.mkdirSync(this.audioDirectory, { recursive: true });
        }
        
        console.log('🎵 TTS Service initialized - Reverie WAV direct mode');
    }

    // Language mapping for Reverie TTS
    getLanguageMapping() {
        return {
            'hi': 'hi',   // Hindi
            'en': 'en',   // English
            'bn': 'bn',   // Bengali
        };
    }

    // Call Reverie TTS API directly via HTTP using official documentation format
    async callReverieTTSAPI(text, language = 'en', gender = 'female', speed = 1.0, pitch = 1.0) {
        try {
            // Map language code
            const languageMap = this.getLanguageMapping();
            const reverieLanguage = languageMap[language] || 'en';
            
            // Generate speaker format according to documentation (e.g., 'hi_female', 'en_male')
            const speaker = `${reverieLanguage}_${gender}`;
            
            // Request body - only contains text according to documentation
            const payload = {
                text: text
            };
            
            // Headers according to official documentation
            const headers = {
                'REV-API-KEY': process.env.REVERIE_API_KEY,
                'REV-APP-ID': process.env.REVERIE_APP_ID,
                'REV-APPNAME': 'tts',
                'speaker': speaker,
                'Content-Type': 'application/json'
            };
            
            // Request audio as buffer for direct saving
            const response = await axios.post(this.reverieApiUrl, payload, {
                headers: headers,
                timeout: 30000, // 30 seconds timeout
                responseType: 'arraybuffer' // Get raw binary data
            });
            
            if (!response.data || response.data.byteLength === 0) {
                throw new Error('No audio data received from Reverie TTS API');
            }
            
            // Return raw audio buffer
            return response.data;
            
        } catch (error) {
            console.error('❌ Reverie TTS API error:', error.message);
            
            if (error.response) {
                console.error('❌ API Response Status:', error.response.status);
                
                // Try to parse error message if it's JSON
                try {
                    const errorData = JSON.parse(error.response.data.toString());
                    console.error('❌ API Error Message:', errorData.message || 'Unknown error');
                } catch (e) {
                    console.error('❌ Raw Error Data:', error.response.data.toString());
                }
            }
            
            throw error;
        }
    }

    // Generate TTS audio using Reverie and save directly (no conversion needed)
    async generateTTSAudio(text, language = 'en', gender = 'female', speed = 1.0, pitch = 1.0) {
        try {
            // Call Reverie TTS API directly
            const audioBuffer = await this.callReverieTTSAPI(text, language, gender, speed, pitch);
            
            // Create unique filename
            const timestamp = Date.now();
            const outputFileName = `reverie_${timestamp}.wav`;
            
            // Save WAV file directly (no conversion needed)
            const outputPath = path.join(this.audioDirectory, outputFileName);
            fs.writeFileSync(outputPath, audioBuffer);
            
            return {
                success: true,
                filename: outputFileName,
                filepath: outputPath,
                audioUrl: `${process.env.BASE_URL}/audio/${outputFileName}`,
                format: 'wav',
                source: 'reverie_direct'
            };
            
        } catch (error) {
            console.error('❌ TTS generation failed:', error);
            throw error;
        }
    }

    // Get available speakers for a language
    getAvailableSpeakers(language = 'en') {
        const languageMap = this.getLanguageMapping();
        const reverieLanguage = languageMap[language] || 'en';
        
        return [
            `${reverieLanguage}_female`,
            `${reverieLanguage}_male`
        ];
    }

    // Health check
    async healthCheck() {
        try {
            const hasCredentials = !!(process.env.REVERIE_API_KEY && process.env.REVERIE_APP_ID);
            
            return {
                status: 'healthy',
                reverieCredentials: hasCredentials,
                audioDirectory: this.audioDirectory,
                apiUrl: this.reverieApiUrl,
                mode: 'direct_wav_no_conversion',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}


const ttsService = new TTSService();
export default ttsService;
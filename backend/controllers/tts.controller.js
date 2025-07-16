import ttsService from '../services/tts.service.js';

class TTSController {

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
            },
            'Tamil': {
                'male': 'ta_male',
                'female': 'ta_female'
            },
            'Telugu': {
                'male': 'te_male',
                'female': 'te_female'
            },
            'Gujarati': {
                'male': 'gu_male',
                'female': 'gu_female'
            },
            'Kannada': {
                'male': 'kn_male',
                'female': 'kn_female'
            },
            'Malayalam': {
                'male': 'ml_male',
                'female': 'ml_female'
            },
            'Marathi': {
                'male': 'mr_male',
                'female': 'mr_female'
            },
            'Punjabi': {
                'male': 'pa_male',
                'female': 'pa_female'
            },
            'Urdu': {
                'male': 'ur_male',
                'female': 'ur_female'
            }
        };
        
        const langSpeakers = speakerMap[language];
        if (!langSpeakers) {
            return 'hi_female'; // Default to Hindi female
        }
        
        return langSpeakers[gender] || langSpeakers['female'] || 'hi_female';
    }

    /**
     * Generate TTS audio
     */
    async generateAudio(req, res) {
        try {
            console.log('🎤 TTS API request received');
            console.log('Request body:', req.body);
            
            const { text, speaker, language, gender, speed = 1.0, pitch = 1.0 } = req.body;
            
            // Validate required parameters
            if (!text || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request',
                    message: 'Text parameter is required and cannot be empty'
                });
            }
            
            // Determine speaker - either directly provided or mapped from language
            let finalSpeaker = speaker;
            if (!finalSpeaker && language) {
                finalSpeaker = this.mapLanguageToSpeaker(language, gender || 'female');
                console.log(`🗣️ Mapped language '${language}' to speaker '${finalSpeaker}'`);
            }
            
            if (!finalSpeaker) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request',
                    message: 'Either "speaker" or "language" parameter is required'
                });
            }
            
            // Note: Speed and pitch parameters are accepted for backwards compatibility
            // but are not currently supported by the Reverie TTS service
            if (speed !== 1.0 || pitch !== 1.0) {
                console.log('⚠️ Speed and pitch parameters are currently ignored by the TTS service');
            }
            
            console.log(`🎵 Generating TTS: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            console.log(`🗣️ Speaker: ${finalSpeaker}`);
            console.log(`Note: Speed and pitch parameters are not supported by the current TTS service`);
            
            // Generate TTS audio using the FFmpeg-enhanced service
            const result = await ttsService.generateTTSAudio(text, finalSpeaker.split('_')[0], finalSpeaker.split('_')[1]);
            const audioUrl = result.audioUrl;
            
            if (!audioUrl || typeof audioUrl !== 'string') {
                console.error('❌ Invalid audio URL received from TTS service');
                return res.status(500).json({
                    success: false,
                    error: 'Internal Server Error',
                    message: 'Failed to generate audio - invalid response from TTS service'
                });
            }
            
            console.log(`✅ TTS audio generated successfully: ${audioUrl}`);
            console.log(`🎵 Format: Twilio-compatible WAV (8kHz, Mono, PCM 16-bit)`);
            
            // Redirect to the generated audio file
            res.redirect(audioUrl);
            
            console.log('✅ Audio response sent successfully');
            
        } catch (error) {
            console.error('❌ Error in TTS API:', error.message);
            
            // Provide user-friendly error messages
            let statusCode = 500;
            let errorMessage = 'Internal server error occurred while generating audio';
            
            if (error.message.includes('credentials') || error.message.includes('API_KEY')) {
                statusCode = 503;
                errorMessage = 'TTS service is currently unavailable - configuration issue';
            } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
                statusCode = 429;
                errorMessage = 'TTS service rate limit exceeded - please try again later';
            } else if (error.message.includes('network') || error.message.includes('timeout')) {
                statusCode = 503;
                errorMessage = 'TTS service is temporarily unavailable - please try again';
            } else if (error.message.includes('speaker') || error.message.includes('voice')) {
                statusCode = 400;
                errorMessage = 'Invalid speaker or voice parameter provided';
            }
            
            res.status(statusCode).json({
                success: false,
                error: 'TTS Generation Failed',
                message: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get available speakers
     */
    async getSpeakers(req, res) {
        try {
            const speakers = {
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
                },
                'Gujarati': {
                    'male': 'gu_male',
                    'female': 'gu_female'
                },
                'Kannada': {
                    'male': 'kn_male',
                    'female': 'kn_female'
                },
                'Malayalam': {
                    'male': 'ml_male',
                    'female': 'ml_female'
                },
                'Marathi': {
                    'male': 'mr_male',
                    'female': 'mr_female'
                },
                'Punjabi': {
                    'male': 'pa_male',
                    'female': 'pa_female'
                },
                'Tamil': {
                    'male': 'ta_male',
                    'female': 'ta_female'
                },
                'Telugu': {
                    'male': 'te_male',
                    'female': 'te_female'
                },
                'Urdu': {
                    'male': 'ur_male',
                    'female': 'ur_female'
                }
            };
            
            res.status(200).json({
                success: true,
                data: {
                    speakers: speakers
                },
                message: 'Available speakers for TTS generation'
            });
            
        } catch (error) {
            console.error('❌ Error fetching speakers:', error.message);
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                message: 'Failed to fetch available speakers'
            });
        }
    }

    /**
     * Health check for TTS service
     */
    async checkHealth(req, res) {
        try {
            const isConfigured = !!(process.env.REVERIE_API_KEY && process.env.REVERIE_APP_ID);
            
            res.status(200).json({
                success: true,
                data: {
                    status: 'OK',
                    service: 'Reverie TTS',
                    configured: isConfigured,
                    timestamp: new Date().toISOString()
                },
                message: isConfigured ? 'TTS service is ready' : 'TTS service needs configuration'
            });
            
        } catch (error) {
            console.error('❌ Error in TTS health check:', error.message);
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
                data: {
                    status: 'ERROR',
                    service: 'Reverie TTS',
                    configured: false
                },
                message: 'TTS service health check failed'
            });
        }
    }
}

export default new TTSController(); 
import express from 'express';
import twilioController from '../controllers/twilio.controller.js';

const router = express.Router();

// POST /play-tts - New webhook to play TTS audio
router.post('/play-tts', twilioController.playTTS);

// POST /transcribe - Handle recorded audio transcription using Reverie STT
router.post('/transcribe', twilioController.transcribeAudio);

// POST /call-status - Handle call status updates
router.post('/call-status', twilioController.handleCallStatus);

// POST /test-simple-audio - Simple test webhook for audio playback
router.post('/test-simple-audio', twilioController.testSimpleAudio);

// POST /voice-response - Handle Twilio voice response with campaign integration (legacy)
router.post('/voice-response', twilioController.voiceResponse);

// Add real-time call status fetch endpoint
router.get('/call-status/:callSid', twilioController.getCallStatusBySid);

export default router; 
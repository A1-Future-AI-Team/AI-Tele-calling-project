import express from 'express';
import twilioController from '../controllers/twilio.controller.js';

const router = express.Router();

// POST /play-tts - New webhook to play TTS audio
router.post('/play-tts', twilioController.playTTS);

// POST /transcribe - Handle recorded audio transcription using Reverie STT
router.post('/transcribe', twilioController.transcribeAudio);

// POST /process-speech - Handle speech input from Gather with barge-in support
router.post('/process-speech', twilioController.processSpeech);

// POST /example-barge-in - Example demonstrating barge-in functionality
router.post('/example-barge-in', twilioController.exampleBargeIn);

// POST /test-barge-in - Simple test endpoint for barge-in functionality
router.post('/test-barge-in', twilioController.testBargeIn);

// POST /test-barge-in-response - Handle test barge-in response
router.post('/test-barge-in-response', twilioController.testBargeInResponse);

// POST /simple-barge-in-test - Simple barge-in test with clear instructions
router.post('/simple-barge-in-test', twilioController.simpleBargeInTest);

// POST /simple-barge-in-response - Handle simple barge-in test response
router.post('/simple-barge-in-response', twilioController.simpleBargeInResponse);

// POST /call-status - Handle call status updates
router.post('/call-status', twilioController.handleCallStatus);

// POST /test-simple-audio - Simple test webhook for audio playback
router.post('/test-simple-audio', twilioController.testSimpleAudio);

// POST /voice-response - Handle Twilio voice response with campaign integration (legacy)
router.post('/voice-response', twilioController.voiceResponse);

// POST /status - Alternate route for Twilio statusCallback webhook
router.post('/status', twilioController.handleCallStatus);

// Add real-time call status fetch endpoint
router.get('/call-status/:callSid', twilioController.getCallStatusBySid);

export default router; 
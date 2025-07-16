import express from 'express';
import twilioController from '../controllers/twilio.controller.js';

const router = express.Router();



// POST /transcribe - Handle recorded audio transcription using Reverie STT
router.post('/transcribe', twilioController.transcribeAudio);



// POST /call-status - Handle call status updates
router.post('/call-status', twilioController.handleCallStatus);



// POST /voice-response - Handle Twilio voice response with campaign integration (legacy)
router.post('/voice-response', twilioController.voiceResponse);

// POST /status - Alternate route for Twilio statusCallback webhook
router.post('/status', twilioController.handleCallStatus);

// Add real-time call status fetch endpoint
router.get('/call-status/:callSid', twilioController.getCallStatusBySid);

export default router; 
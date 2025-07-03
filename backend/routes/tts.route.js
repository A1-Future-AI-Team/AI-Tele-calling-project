import express from 'express';
import ttsController from '../controllers/tts.controller.js';

const router = express.Router();

/**
 * Example curl commands for testing:
 * 
 * curl -X POST http://localhost:3000/api/tts \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "text": "Hello, this is a test message from Reverie TTS",
 *     "speaker": "en_female"
 *   }' \
 *   --output test_audio.mp3
 * 
 * curl -X POST http://localhost:3000/api/tts \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "text": "नमस्ते, यह एक परीक्षण संदेश है",
 *     "language": "Hindi",
 *     "gender": "female"
 *   }' \
 *   --output hindi_test.mp3
 */

// POST /api/tts - Generate TTS audio
router.post('/', ttsController.generateAudio);

// GET /api/tts/speakers - Get available speakers
router.get('/speakers', ttsController.getSpeakers);

// GET /api/tts/health - Health check for TTS service
router.get('/health', ttsController.checkHealth);

export default router; 
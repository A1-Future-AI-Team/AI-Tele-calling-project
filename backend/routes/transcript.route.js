import express from 'express';
import transcriptController from '../controllers/transcript.controller.js';

const router = express.Router();

// Get transcript by call log ID
router.get('/call-log/:callLogId', transcriptController.getTranscriptByCallLog);

// Get transcript by transcript ID
router.get('/:transcriptId', transcriptController.getTranscriptById);

// Get all transcripts for a campaign
router.get('/campaign/:campaignId', transcriptController.getTranscriptsByCampaign);

// Get all transcripts for a contact
router.get('/contact/:contactId', transcriptController.getTranscriptsByContact);

// Debug endpoint to get all transcripts
router.get('/debug/all', transcriptController.getAllTranscripts);

export default router; 
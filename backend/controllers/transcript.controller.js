import Transcript from '../models/transcript.model.js';
import CallLog from '../models/calllog.model.js';
import Contact from '../models/contact.model.js';

const transcriptController = {
  /**
   * Get transcript by call log ID
   */
  async getTranscriptByCallLog(req, res) {
    try {
      const { callLogId } = req.params;
      
      // First get the call log to find the contact and campaign
      const callLog = await CallLog.findById(callLogId)
        .populate('contactId')
        .populate('campaignId');
      
      if (!callLog) {
        return res.status(404).json({ error: 'Call log not found' });
      }
      
      // Find transcript by contact and campaign
      const transcript = await Transcript.findOne({
        contactId: callLog.contactId?._id,
        campaignId: callLog.campaignId?._id
      });
      
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found for this call' });
      }
      
      res.json({
        success: true,
        data: {
          transcript,
          callLog: {
            id: callLog._id,
            status: callLog.status,
            duration: callLog.duration,
            startTime: callLog.startTime,
            endTime: callLog.endTime,
            contact: callLog.contactId,
            campaign: callLog.campaignId
          }
        }
      });
    } catch (error) {
      console.error('Error fetching transcript:', error);
      res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  },

  /**
   * Get transcript by transcript ID
   */
  async getTranscriptById(req, res) {
    try {
      const { transcriptId } = req.params;
      
      const transcript = await Transcript.findById(transcriptId)
        .populate('contactId')
        .populate('campaignId');
      
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }
      
      res.json({
        success: true,
        data: transcript
      });
    } catch (error) {
      console.error('Error fetching transcript:', error);
      res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  },

  /**
   * Get all transcripts for a campaign
   */
  async getTranscriptsByCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      
      const transcripts = await Transcript.find({ campaignId })
        .populate('contactId')
        .populate('campaignId')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: transcripts
      });
    } catch (error) {
      console.error('Error fetching campaign transcripts:', error);
      res.status(500).json({ error: 'Failed to fetch campaign transcripts' });
    }
  },

  /**
   * Get all transcripts for a contact
   */
  async getTranscriptsByContact(req, res) {
    try {
      const { contactId } = req.params;
      
      const transcripts = await Transcript.find({ contactId })
        .populate('contactId')
        .populate('campaignId')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: transcripts
      });
    } catch (error) {
      console.error('Error fetching contact transcripts:', error);
      res.status(500).json({ error: 'Failed to fetch contact transcripts' });
    }
  }
};

export default transcriptController; 
import CallLog from '../models/calllog.model.js';
import Transcript from '../models/transcript.model.js';

const callLogController = {
  async getAllLogs(req, res) {
    try {
      const logs = await CallLog.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('contactId')
        .populate('campaignId');
      
      // Add transcript information to each log
      const logsWithTranscripts = await Promise.all(
        logs.map(async (log) => {
          const logObj = log.toObject();
          
          // Find transcript for this call
          if (log.contactId && log.campaignId) {
            const transcript = await Transcript.findOne({
              contactId: log.contactId._id,
              campaignId: log.campaignId._id
            });
            
            if (transcript) {
              logObj.transcriptId = transcript._id;
              logObj.hasTranscript = true;
              logObj.transcriptEntryCount = transcript.entries?.length || 0;
            } else {
              logObj.hasTranscript = false;
              logObj.transcriptEntryCount = 0;
            }
          } else {
            logObj.hasTranscript = false;
            logObj.transcriptEntryCount = 0;
          }
          
          return logObj;
        })
      );
      
      res.json(logsWithTranscripts);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      res.status(500).json({ error: 'Failed to fetch call logs' });
    }
  },
  
  async getRecentLogs(req, res) {
    try {
      const logs = await CallLog.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('contactId')
        .populate('campaignId');
      
      // Add transcript information to each log
      const logsWithTranscripts = await Promise.all(
        logs.map(async (log) => {
          const logObj = log.toObject();
          
          // Find transcript for this call
          if (log.contactId && log.campaignId) {
            const transcript = await Transcript.findOne({
              contactId: log.contactId._id,
              campaignId: log.campaignId._id
            });
            
            if (transcript) {
              logObj.transcriptId = transcript._id;
              logObj.hasTranscript = true;
              logObj.transcriptEntryCount = transcript.entries?.length || 0;
            } else {
              logObj.hasTranscript = false;
              logObj.transcriptEntryCount = 0;
            }
          } else {
            logObj.hasTranscript = false;
            logObj.transcriptEntryCount = 0;
          }
          
          return logObj;
        })
      );
      
      res.json(logsWithTranscripts);
    } catch (error) {
      console.error('Error fetching recent call logs:', error);
      res.status(500).json({ error: 'Failed to fetch recent call logs' });
    }
  }
};

export default callLogController; 
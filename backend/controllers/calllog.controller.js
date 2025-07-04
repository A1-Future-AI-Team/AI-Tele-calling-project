import CallLog from '../models/calllog.model.js';

const callLogController = {
  async getAllLogs(req, res) {
    try {
      const logs = await CallLog.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('contactId')
        .populate('campaignId');
      res.json(logs);
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
      res.json(logs);
    } catch (error) {
      console.error('Error fetching recent call logs:', error);
      res.status(500).json({ error: 'Failed to fetch recent call logs' });
    }
  }
};

export default callLogController; 
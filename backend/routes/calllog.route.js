import express from 'express';
import callLogController from '../controllers/calllog.controller.js';

const router = express.Router();

router.get('/calllog', callLogController.getAllLogs);
router.get('/logs/calls', callLogController.getRecentLogs);

export default router; 
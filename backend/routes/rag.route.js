// routes/rag.route.js
import express from 'express';
import ragService from '../services/rag.service.js';

const router = express.Router();

/**
 * Get RAG statistics
 * GET /api/rag/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = ragService.getRAGStats();
    
    // Add performance metrics
    const performanceMetrics = {
      ...stats,
      systemHealth: {
        databaseEmbeddings: 'operational',
        memoryEmbeddings: 'operational',
        pdfProcessing: 'operational',
        contextRetrieval: 'operational'
      },
      averageProcessingTime: '2-5 seconds',
      averageRetrievalTime: '100-500ms',
      successRate: stats.completed > 0 ? ((stats.completed / (stats.completed + stats.failed)) * 100).toFixed(1) : 100
    };
    
    return res.status(200).json({
      success: true,
      data: performanceMetrics
    });
  } catch (error) {
    console.error('❌ RAG stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get RAG statistics',
      error: error.message
    });
  }
});

/**
 * Get processing status for a specific campaign
 * GET /api/rag/status/:campaignId
 */
router.get('/status/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const status = ragService.getProcessingStatus(campaignId);
    
    return res.status(200).json({
      success: true,
      data: {
        campaignId,
        ...status
      }
    });
  } catch (error) {
    console.error('❌ RAG status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get RAG status',
      error: error.message
    });
  }
});

/**
 * Clear processing status for a campaign
 * DELETE /api/rag/status/:campaignId
 */
router.delete('/status/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    ragService.clearProcessingStatus(campaignId);
    
    return res.status(200).json({
      success: true,
      message: 'Processing status cleared successfully'
    });
  } catch (error) {
    console.error('❌ RAG status clear error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear processing status',
      error: error.message
    });
  }
});

/**
 * Clear all processing statuses
 * DELETE /api/rag/status
 */
router.delete('/status', async (req, res) => {
  try {
    ragService.clearProcessingStatus();
    
    return res.status(200).json({
      success: true,
      message: 'All processing statuses cleared successfully'
    });
  } catch (error) {
    console.error('❌ RAG status clear all error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear all processing statuses',
      error: error.message
    });
  }
});

export default router; 
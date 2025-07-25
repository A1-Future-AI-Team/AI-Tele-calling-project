// services/rag.service.js
import dotenv from 'dotenv';
import { embedCampaignDocText, getRelevantChunks } from './embedding.service.js';
import { processPdfBuffer } from './pdf.service.js';

dotenv.config();

/**
 * Comprehensive RAG (Retrieval-Augmented Generation) service
 * Combines PDF processing, embeddings, and retrieval for AI telecalling
 */
class RAGService {
  constructor() {
    this.processingStatus = new Map(); // campaignId -> status
  }

  /**
   * Process campaign document for RAG
   * @param {string} campaignId - Campaign ID
   * @param {Buffer|string} documentContent - PDF buffer or text content
   * @param {string} documentType - 'pdf' or 'text'
   * @returns {Promise<{success: boolean, chunks: number, method: string}>} Processing result
   */
  async processCampaignDocument(campaignId, documentContent, documentType = 'pdf') {
    try {
      console.log(`🔄 Starting RAG processing for campaign: ${campaignId}`);
      console.log(`📄 Document type: ${documentType}`);
      
      // Update processing status
      this.processingStatus.set(campaignId, { status: 'processing', startTime: new Date() });
      
      let extractedText = '';
      let processingMethod = '';
      
      // Extract text from PDF if needed
      if (documentType === 'pdf' && documentContent instanceof Buffer) {
        console.log('📄 Processing PDF document...');
        const pdfResult = await processPdfBuffer(documentContent);
        
        if (!pdfResult.success) {
          throw new Error(`PDF processing failed: ${pdfResult.error}`);
        }
        
        extractedText = pdfResult.text;
        processingMethod = `pdf-${pdfResult.method}`;
        console.log(`✅ PDF processed using ${pdfResult.method}: ${extractedText.length} characters`);
      } else if (typeof documentContent === 'string') {
        extractedText = documentContent;
        processingMethod = 'text';
        console.log(`✅ Text content provided: ${extractedText.length} characters`);
      } else {
        throw new Error('Invalid document content type');
      }
      
      // Validate extracted text
      if (!extractedText || extractedText.length < 50) {
        throw new Error('Extracted text too short for meaningful processing');
      }
      
      // Process with memory-only embedding service
      console.log('🔄 Processing with memory-only embedding service...');
      
      let totalChunks = 0;
      let successCount = 0;
      
      try {
        // Use only in-memory embedding service
        const memoryResult = await embedCampaignDocText(extractedText, campaignId);
        console.log(`✅ Memory embedding completed: ${memoryResult} chunks`);
        totalChunks = memoryResult;
        successCount = 1;
      } catch (memoryError) {
        console.error('❌ Memory embedding failed:', memoryError);
      }
      
      // Update processing status
      this.processingStatus.set(campaignId, {
        status: 'completed',
        startTime: this.processingStatus.get(campaignId)?.startTime,
        endTime: new Date(),
        chunks: totalChunks,
        method: processingMethod,
        successCount
      });
      
      console.log(`🎉 RAG processing completed for campaign ${campaignId}`);
      console.log(`📊 Total chunks created: ${totalChunks}`);
      console.log(`✅ Successful services: ${successCount}/2`);
      
      return {
        success: successCount > 0,
        chunks: totalChunks,
        method: processingMethod,
        successCount,
        textLength: extractedText.length,
        extractedText: extractedText
      };
      
    } catch (error) {
      console.error('❌ RAG processing failed:', error);
      
      // Update processing status
      this.processingStatus.set(campaignId, {
        status: 'failed',
        startTime: this.processingStatus.get(campaignId)?.startTime,
        endTime: new Date(),
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Retrieve relevant context for AI responses
   * @param {string} campaignId - Campaign ID
   * @param {string} userInput - User's input/query
   * @param {number} topK - Number of top chunks to retrieve
   * @returns {Promise<Array<{chunk: string, score: number, source: string}>>} Relevant chunks
   */
  async retrieveContext(campaignId, userInput, topK = 3) {
    try {
      if (!campaignId || !userInput) {
        console.log('⚠️ Missing campaignId or userInput for context retrieval');
        return [];
      }

      console.log(`🔍 Retrieving context for campaign: ${campaignId}`);
      console.log(`📝 User input: "${userInput}"`);
      
      let allChunks = [];
      
      // Try in-memory retrieval first
      try {
        console.log('🔄 Retrieving from memory...');
        const memoryChunks = await getRelevantChunks(userInput, campaignId, topK);
        if (memoryChunks && memoryChunks.length > 0) {
          allChunks.push(...memoryChunks.map(chunk => ({
            ...chunk,
            source: 'memory'
          })));
          console.log(`✅ Memory retrieval: ${memoryChunks.length} chunks`);
        } else {
          console.log('⚠️ No chunks found in memory, attempting to reprocess PDF...');
          
          // Try to reprocess PDF from campaign data
          const reprocessResult = await this.reprocessCampaignFromDatabase(campaignId);
          if (reprocessResult.success) {
            console.log(`✅ PDF reprocessed: ${reprocessResult.chunks} chunks created`);
            
            // Try retrieval again
            const retryChunks = await getRelevantChunks(userInput, campaignId, topK);
            if (retryChunks && retryChunks.length > 0) {
              allChunks.push(...retryChunks.map(chunk => ({
                ...chunk,
                source: 'memory-reprocessed'
              })));
              console.log(`✅ Reprocessed memory retrieval: ${retryChunks.length} chunks`);
            }
          } else {
            console.log('⚠️ PDF reprocessing failed');
          }
        }
      } catch (memoryError) {
        console.log('⚠️ Memory retrieval failed:', memoryError.message);
      }
      
      if (allChunks.length === 0) {
        console.log('⚠️ No relevant chunks found from either source');
        return [];
      }
      
      // Sort by score and return top K
      const topChunks = allChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      console.log(`📄 Retrieved ${topChunks.length} relevant chunks`);
      console.log(`🏆 Top score: ${topChunks[0]?.score?.toFixed(3)}`);
      
      return topChunks;
      
    } catch (error) {
      console.error('❌ Context retrieval failed:', error);
      return [];
    }
  }

  /**
   * Get processing status for a campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Object} Processing status
   */
  getProcessingStatus(campaignId) {
    return this.processingStatus.get(campaignId) || { status: 'not_started' };
  }

  /**
   * Get statistics about RAG processing
   * @returns {Object} RAG statistics
   */
  getRAGStats() {
    const stats = {
      totalCampaigns: this.processingStatus.size,
      processing: 0,
      completed: 0,
      failed: 0,
      totalChunks: 0
    };
    
    for (const [campaignId, status] of this.processingStatus.entries()) {
      if (status.status === 'processing') stats.processing++;
      else if (status.status === 'completed') {
        stats.completed++;
        stats.totalChunks += status.chunks || 0;
      }
      else if (status.status === 'failed') stats.failed++;
    }
    
    return stats;
  }

  /**
   * Clear processing status for a campaign
   * @param {string} campaignId - Campaign ID
   */
  clearProcessingStatus(campaignId) {
    if (campaignId) {
      this.processingStatus.delete(campaignId);
      console.log(`🗑️ Cleared processing status for campaign: ${campaignId}`);
    } else {
      this.processingStatus.clear();
      console.log('🗑️ Cleared all processing statuses');
    }
  }

  /**
   * Reprocess campaign PDF from database if memory chunks are lost
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<{success: boolean, chunks: number}>} Reprocessing result
   */
  async reprocessCampaignFromDatabase(campaignId) {
    try {
      console.log(`🔄 Attempting to reprocess PDF for campaign: ${campaignId}`);
      
      // Import Campaign model
      const Campaign = (await import('../models/campaign.model.js')).default;
      
      // Find campaign in database
      const campaign = await Campaign.findById(campaignId);
      if (!campaign || !campaign.campaignDoc) {
        console.log('⚠️ Campaign not found or no PDF data');
        return { success: false, chunks: 0 };
      }
      
      console.log('✅ Campaign found with PDF data');
      
      // Check if we have extracted text stored
      if (campaign.campaignDoc.extractedText && campaign.campaignDoc.extractedText !== 'Processed by Memory RAG service') {
        console.log('📄 Using stored extracted text for reprocessing');
        
        // Reprocess the stored text
        const result = await embedCampaignDocText(campaign.campaignDoc.extractedText, campaignId);
        return { success: true, chunks: result };
      } else {
        console.log('⚠️ No stored extracted text, cannot reprocess');
        return { success: false, chunks: 0 };
      }
      
    } catch (error) {
      console.error('❌ PDF reprocessing failed:', error);
      return { success: false, chunks: 0 };
    }
  }
}

// Export singleton instance
const ragService = new RAGService();
export default ragService; 
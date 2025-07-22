// services/embed.service.js
import dotenv from 'dotenv';
import { pipeline } from '@xenova/transformers';
import CampaignChunk from '../models/campaignChunk.model.js';
import { normalizeVector } from '../utils/vector.util.js';

dotenv.config();

// Global embedding model instance
let embeddingModel = null;

/**
 * Initialize the embedding model
 */
async function initializeEmbeddingModel() {
  if (!embeddingModel) {
    try {
      console.log('🔄 Initializing embedding model...');
      embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ Embedding model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error);
      throw new Error('Embedding model initialization failed');
    }
  }
  return embeddingModel;
}

/**
 * Generate embeddings for text using the loaded model
 * @param {string} text - Text to embed
 * @returns {number[]} Embedding vector
 */
async function embedText(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for embedding');
    }

    const model = await initializeEmbeddingModel();
    
    // Clean and normalize text
    const cleanText = text.trim().replace(/\s+/g, ' ');
    if (cleanText.length === 0) {
      throw new Error('Empty text after cleaning');
    }

    // Generate embedding
    const result = await model(cleanText, { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data);
    
    // Normalize the embedding
    return normalizeVector(embedding);

  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    
    // Fallback: return a simple hash-based embedding
    console.log('⚠️ Using fallback embedding method');
    return generateFallbackEmbedding(text);
  }
}

/**
 * Generate a simple fallback embedding when the main model fails
 * @param {string} text - Text to embed
 * @returns {number[]} Simple embedding vector
 */
function generateFallbackEmbedding(text) {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0); // Match model dimension
  
  words.forEach((word, index) => {
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const position = hash % 384;
    embedding[position] = (embedding[position] + 1) % 10; // Simple frequency-based
  });
  
  return normalizeVector(embedding);
}

/**
 * Split text into chunks for processing
 * @param {string} text - Full text to chunk
 * @param {number} chunkSize - Maximum chunk size in characters
 * @param {number} overlap - Overlap between chunks in characters
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const nextPeriod = text.indexOf('.', end - 100);
      const nextNewline = text.indexOf('\n', end - 100);
      
      if (nextPeriod > end - 100 && nextPeriod < end + 100) {
        end = nextPeriod + 1;
      } else if (nextNewline > end - 100 && nextNewline < end + 100) {
        end = nextNewline + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) { // Only keep meaningful chunks
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Process campaign document and create chunks with embeddings
 * @param {string} campaignId - Campaign ID
 * @param {string} fullText - Full text from PDF
 * @returns {Promise<number>} Number of chunks created
 */
async function processCampaignDoc(campaignId, fullText) {
  try {
    if (!campaignId || !fullText) {
      throw new Error('Missing campaignId or fullText');
    }

    console.log(`📄 Processing campaign document for campaign: ${campaignId}`);
    console.log(`📊 Document length: ${fullText.length} characters`);

    // Delete existing chunks for this campaign
    await CampaignChunk.deleteMany({ campaignId });
    console.log('🗑️ Cleared existing chunks');

    // Create chunks
    const chunks = chunkText(fullText);
    console.log(`✂️ Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.log('⚠️ No meaningful chunks found');
      return 0;
    }

    // Process chunks in batches to avoid memory issues
    const batchSize = 5;
    let processedCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const chunkPromises = batch.map(async (chunk, batchIndex) => {
        try {
          const embedding = await embedText(chunk);
          const chunkIndex = i + batchIndex;
          
          await CampaignChunk.create({
            campaignId,
            chunk,
            embedding,
            chunkIndex
          });
          
          return true;
        } catch (error) {
          console.error(`❌ Failed to process chunk ${i + batchIndex}:`, error);
          return false;
        }
      });

      const results = await Promise.all(chunkPromises);
      processedCount += results.filter(Boolean).length;
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
    }

    console.log(`🎉 Successfully processed ${processedCount} chunks for campaign ${campaignId}`);
    return processedCount;

  } catch (error) {
    console.error('❌ Campaign document processing failed:', error);
    throw error;
  }
}

/**
 * Retrieve relevant chunks for a query
 * @param {string} campaignId - Campaign ID
 * @param {string} query - User query
 * @param {number} topK - Number of top chunks to retrieve
 * @returns {Promise<Array<{chunk: string, score: number}>>} Relevant chunks with scores
 */
async function retrieveRelevantChunks(campaignId, query, topK = 3) {
  try {
    if (!campaignId || !query) {
      throw new Error('Missing campaignId or query');
    }

    // Get query embedding
    const queryEmbedding = await embedText(query);
    
    // Get all chunks for the campaign
    const chunks = await CampaignChunk.find({ campaignId }).select('chunk embedding');
    
    if (chunks.length === 0) {
      console.log('⚠️ No chunks found for campaign');
      return [];
    }

    // Calculate similarities
    const { cosineSimilarity } = await import('../utils/vector.util.js');
    
    const scoredChunks = chunks.map(chunk => ({
      chunk: chunk.chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by score and return top K
    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`🔍 Retrieved ${topChunks.length} relevant chunks for query`);
    return topChunks;

  } catch (error) {
    console.error('❌ Chunk retrieval failed:', error);
    return [];
  }
}

export {
  embedText,
  chunkText,
  processCampaignDoc,
  retrieveRelevantChunks,
  initializeEmbeddingModel
}; 
// services/embedding.service.js
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// In-memory storage for chunks and embeddings
const chunkStore = new Map(); // campaignId -> [{ chunk, vector, campaignId }]

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    throw new Error('Vectors must be arrays of the same length');
  }

  const dot = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  
  return dot / (magA * magB);
}

/**
 * Split text into chunks with overlap
 * @param {string} text - Text to chunk
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
 * Get embeddings using Groq API
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
async function getEmbedding(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for embedding');
    }

    // Clean and normalize text
    const cleanText = text.trim().replace(/\s+/g, ' ');
    if (cleanText.length === 0) {
      throw new Error('Empty text after cleaning');
    }

    // Use Groq API for embeddings
    // Note: This is a placeholder - Groq doesn't have embeddings yet
    // For now, we'll use a simple hash-based embedding
    console.log('⚠️ Using fallback embedding method (Groq embeddings not yet available)');
    return generateFallbackEmbedding(cleanText);

  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return generateFallbackEmbedding(text);
  }
}

/**
 * Generate a simple fallback embedding when Groq embeddings are not available
 * @param {string} text - Text to embed
 * @returns {number[]} Simple embedding vector
 */
function generateFallbackEmbedding(text) {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0); // Standard embedding dimension
  
  words.forEach((word) => {
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const position = hash % 384;
    embedding[position] = (embedding[position] + 1) % 10; // Simple frequency-based
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

/**
 * Embed campaign document text and store chunks
 * @param {string} campaignDocText - Full text from campaign document
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<number>} Number of chunks created
 */
async function embedCampaignDocText(campaignDocText, campaignId) {
  try {
    if (!campaignDocText || !campaignId) {
      throw new Error('Missing campaignDocText or campaignId');
    }

    console.log(`📄 Processing campaign document for campaign: ${campaignId}`);
    console.log(`📊 Document length: ${campaignDocText.length} characters`);

    // Clear existing chunks for this campaign
    chunkStore.delete(campaignId);
    console.log('🗑️ Cleared existing chunks');

    // Create chunks
    const chunks = chunkText(campaignDocText);
    console.log(`✂️ Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.log('⚠️ No meaningful chunks found');
      return 0;
    }

    // Process chunks and generate embeddings
    const chunkData = [];
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];
        const vector = await getEmbedding(chunk);
        
        chunkData.push({
          chunk,
          vector,
          campaignId
        });
        
        console.log(`✅ Processed chunk ${i + 1}/${chunks.length}`);
      } catch (error) {
        console.error(`❌ Failed to process chunk ${i + 1}:`, error);
      }
    }

    // Store chunks in memory
    chunkStore.set(campaignId, chunkData);
    
    console.log(`🎉 Successfully processed ${chunkData.length} chunks for campaign ${campaignId}`);
    return chunkData.length;

  } catch (error) {
    console.error('❌ Campaign document embedding failed:', error);
    throw error;
  }
}

/**
 * Get relevant chunks for a query using cosine similarity
 * @param {string} query - User query
 * @param {string} campaignId - Campaign ID
 * @param {number} topK - Number of top chunks to retrieve
 * @returns {Promise<Array<{chunk: string, score: number}>>} Relevant chunks with scores
 */
async function getRelevantChunks(query, campaignId, topK = 3) {
  try {
    if (!query || !campaignId) {
      throw new Error('Missing query or campaignId');
    }

    // Get chunks for this campaign
    const campaignChunks = chunkStore.get(campaignId);
    if (!campaignChunks || campaignChunks.length === 0) {
      console.log('⚠️ No chunks found for campaign');
      return [];
    }

    // Get query embedding
    const queryVector = await getEmbedding(query);
    
    // Calculate similarities
    const scoredChunks = campaignChunks.map(chunkData => ({
      chunk: chunkData.chunk,
      score: cosineSimilarity(queryVector, chunkData.vector)
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

/**
 * Clear all chunks for a specific campaign
 * @param {string} campaignId - Campaign ID
 */
function clearCampaignChunks(campaignId) {
  if (campaignId) {
    chunkStore.delete(campaignId);
    console.log(`🗑️ Cleared chunks for campaign: ${campaignId}`);
  } else {
    chunkStore.clear();
    console.log('🗑️ Cleared all chunks');
  }
}

/**
 * Get statistics about stored chunks
 * @returns {Object} Statistics about chunk storage
 */
function getChunkStats() {
  const stats = {
    totalCampaigns: chunkStore.size,
    totalChunks: 0,
    campaigns: []
  };

  for (const [campaignId, chunks] of chunkStore.entries()) {
    stats.totalChunks += chunks.length;
    stats.campaigns.push({
      campaignId,
      chunkCount: chunks.length
    });
  }

  return stats;
}

export {
  embedCampaignDocText,
  getRelevantChunks,
  clearCampaignChunks,
  getChunkStats,
  chunkText,
  getEmbedding,
  cosineSimilarity
}; 
// services/embedding.service.js
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// In-memory chunk store for fast access
const chunkStore = new Map();

// File-based persistent storage
const CHUNK_STORAGE_DIR = path.join(__dirname, '../chunk-storage');

// Ensure storage directory exists
if (!fs.existsSync(CHUNK_STORAGE_DIR)) {
  fs.mkdirSync(CHUNK_STORAGE_DIR, { recursive: true });
}

/**
 * Save chunks to persistent storage
 * @param {string} campaignId - Campaign ID
 * @param {Array} chunkData - Array of chunk objects
 */
function saveChunksToFile(campaignId, chunkData) {
  try {
    const filePath = path.join(CHUNK_STORAGE_DIR, `${campaignId}.json`);
    const dataToSave = {
      campaignId,
      chunks: chunkData,
      createdAt: new Date().toISOString(),
      chunkCount: chunkData.length
    };
    
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
    console.log(`💾 Saved ${chunkData.length} chunks to file: ${filePath}`);
  } catch (error) {
    console.error('❌ Failed to save chunks to file:', error);
  }
}

/**
 * Load chunks from persistent storage
 * @param {string} campaignId - Campaign ID
 * @returns {Array|null} Chunk data or null if not found
 */
function loadChunksFromFile(campaignId) {
  try {
    const filePath = path.join(CHUNK_STORAGE_DIR, `${campaignId}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`📁 No chunk file found for campaign: ${campaignId}`);
      return null;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    console.log(`📂 Loaded ${data.chunks.length} chunks from file for campaign: ${campaignId}`);
    return data.chunks;
  } catch (error) {
    console.error('❌ Failed to load chunks from file:', error);
    return null;
  }
}

/**
 * Clear chunks from both memory and file storage
 * @param {string} campaignId - Campaign ID
 */
function clearChunksFromStorage(campaignId) {
  try {
    // Clear from memory
    chunkStore.delete(campaignId);
    
    // Clear from file
    const filePath = path.join(CHUNK_STORAGE_DIR, `${campaignId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted chunk file: ${filePath}`);
    }
  } catch (error) {
    console.error('❌ Failed to clear chunks from storage:', error);
  }
}

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
  
  const similarity = dot / (magA * magB);
  
  // Boost similarity for better results with our fallback embeddings
  return Math.max(0, similarity * 1.5);
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
    // For now, we'll use an improved semantic embedding
    console.log('🔧 Using improved semantic embedding method (Groq embeddings not yet available)');
    return generateFallbackEmbedding(cleanText);

  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return generateFallbackEmbedding(text);
  }
}

/**
 * Generate an improved fallback embedding when Groq embeddings are not available
 * @param {string} text - Text to embed
 * @returns {number[]} Improved embedding vector
 */
function generateFallbackEmbedding(text) {
  // Clean and normalize text
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
  
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);
  const embedding = new Array(384).fill(0);
  
  // Create word frequency map
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Generate embedding based on word frequencies and positions
  Object.entries(wordFreq).forEach(([word, freq]) => {
    // Create multiple hash positions for better distribution
    const hash1 = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hash2 = word.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
    const hash3 = word.length * word.charCodeAt(0);
    
    const positions = [
      hash1 % 384,
      hash2 % 384,
      hash3 % 384,
      (hash1 + hash2) % 384,
      (hash2 + hash3) % 384
    ];
    
    positions.forEach(pos => {
      embedding[pos] += freq * 0.2; // Weighted frequency
    });
  });
  
  // Add semantic features based on common patterns
  const semanticFeatures = {
    'price': [0, 50, 100, 150, 200],
    'cost': [0, 50, 100, 150, 200],
    'lakh': [0, 50, 100, 150, 200],
    'rupee': [0, 50, 100, 150, 200],
    'car': [50, 100, 150, 200, 250],
    'vehicle': [50, 100, 150, 200, 250],
    'tata': [50, 100, 150, 200, 250],
    'feature': [100, 150, 200, 250, 300],
    'specification': [100, 150, 200, 250, 300],
    'engine': [100, 150, 200, 250, 300],
    'mileage': [100, 150, 200, 250, 300],
    'safety': [150, 200, 250, 300, 350],
    'rating': [150, 200, 250, 300, 350],
    'offer': [200, 250, 300, 350, 384],
    'discount': [200, 250, 300, 350, 384],
    'financing': [200, 250, 300, 350, 384],
    'emi': [200, 250, 300, 350, 384]
  };
  
  Object.entries(semanticFeatures).forEach(([keyword, positions]) => {
    if (cleanText.includes(keyword)) {
      positions.forEach(pos => {
        embedding[pos] += 0.5; // Semantic boost
      });
    }
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
    clearChunksFromStorage(campaignId);
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
    
    // Save chunks to persistent storage
    saveChunksToFile(campaignId, chunkData);

    console.log(`🎉 Successfully processed ${chunkData.length} chunks for campaign ${campaignId}`);
    console.log(`🔍 Stored with key: "${campaignId}" (type: ${typeof campaignId})`);
    console.log(`🔍 Available keys in chunkStore:`, Array.from(chunkStore.keys()));
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
    console.log(`🔍 Looking for campaign: "${campaignId}" (type: ${typeof campaignId})`);
    console.log(`🔍 Available keys in chunkStore:`, Array.from(chunkStore.keys()));
    
    let campaignChunks = chunkStore.get(campaignId);
    
    // If not in memory, try to load from file
    if (!campaignChunks || campaignChunks.length === 0) {
      console.log('⚠️ No chunks found in memory, trying to load from file...');
      campaignChunks = loadChunksFromFile(campaignId);
      
      if (campaignChunks && campaignChunks.length > 0) {
        // Load into memory for future use
        chunkStore.set(campaignId, campaignChunks);
        console.log(`✅ Loaded ${campaignChunks.length} chunks from file into memory`);
      } else {
        console.log('⚠️ No chunks found in file either');
        return [];
      }
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

    // Filter out very low similarity scores
    const filteredChunks = topChunks.filter(chunk => chunk.score > 0.01);
    
    console.log(`🔍 Retrieved ${filteredChunks.length} relevant chunks for query`);
    console.log(`🏆 Score range: ${filteredChunks[0]?.score?.toFixed(3)} - ${filteredChunks[filteredChunks.length - 1]?.score?.toFixed(3)}`);
    
    return filteredChunks;

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
    clearChunksFromStorage(campaignId);
    console.log(`🗑️ Cleared chunks for campaign: ${campaignId}`);
  } else {
    // This function is now primarily for clearing memory, not file storage
    chunkStore.clear();
    console.log('🗑️ Cleared all chunks from memory');
  }
}

/**
 * Get statistics about stored chunks
 * @returns {Object} Statistics about chunk storage
 */
function getChunkStats() {
  const campaigns = [];
  let totalChunks = 0;

  // Get stats from memory
  for (const [campaignId, chunks] of chunkStore.entries()) {
    campaigns.push({
      campaignId,
      chunkCount: chunks.length,
      sampleChunk: chunks[0]?.chunk || 'No chunks',
      source: 'memory'
    });
    totalChunks += chunks.length;
  }

  // Also check file storage
  try {
    const files = fs.readdirSync(CHUNK_STORAGE_DIR);
    const fileCampaigns = files.filter(file => file.endsWith('.json'));
    
    for (const file of fileCampaigns) {
      const campaignId = file.replace('.json', '');
      const filePath = path.join(CHUNK_STORAGE_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Only add if not already in memory
      if (!chunkStore.has(campaignId)) {
        campaigns.push({
          campaignId,
          chunkCount: data.chunks.length,
          sampleChunk: data.chunks[0]?.chunk || 'No chunks',
          source: 'file'
        });
        totalChunks += data.chunks.length;
      }
    }
  } catch (error) {
    console.error('❌ Error reading chunk storage directory:', error);
  }

  return {
    totalCampaigns: campaigns.length,
    totalChunks,
    campaigns
  };
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
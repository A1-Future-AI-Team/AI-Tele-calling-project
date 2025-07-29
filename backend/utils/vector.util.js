/**
 * Vector utility functions for RAG (Retrieval-Augmented Generation)
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity score between 0 and 1
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Vectors must be arrays of the same length');
  }

  const dot = a.reduce((acc, val, i) => acc + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  
  return dot / (magA * magB);
}

/**
 * Calculate Euclidean distance between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Euclidean distance
 */
export function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Vectors must be arrays of the same length');
  }

  const sum = a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0);
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 * @param {number[]} vector - Input vector
 * @returns {number[]} Normalized vector
 */
export function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Vector must be a non-empty array');
  }

  const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
  if (magnitude === 0) return vector;

  return vector.map(val => val / magnitude);
}

/**
 * Find top-k most similar vectors
 * @param {number[]} queryVector - Query vector
 * @param {Array<{embedding: number[], data: any}>} candidates - Array of candidate vectors with data
 * @param {number} k - Number of top results to return
 * @param {string} metric - Similarity metric ('cosine' or 'euclidean')
 * @returns {Array<{score: number, data: any}>} Top-k results with scores
 */
export function findTopK(queryVector, candidates, k = 5, metric = 'cosine') {
  if (!Array.isArray(queryVector) || !Array.isArray(candidates)) {
    throw new Error('Invalid input: queryVector and candidates must be arrays');
  }

  const scored = candidates.map(candidate => {
    let score;
    if (metric === 'cosine') {
      score = cosineSimilarity(queryVector, candidate.embedding);
    } else if (metric === 'euclidean') {
      score = -euclideanDistance(queryVector, candidate.embedding); // Negative for sorting
    } else {
      throw new Error('Invalid metric. Use "cosine" or "euclidean"');
    }

    return {
      score,
      data: candidate.data
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
} 
// utils/conversationMemory.js

// In-memory store: Map with composite key (callSid+campaignId)
const memoryStore = new Map();

function getKey(callSid, campaignId) {
  return `${callSid || 'unknown'}::${campaignId || 'unknown'}`;
}

/**
 * Get conversation history for a given callSid and campaignId
 * @param {Object} params
 * @param {string} params.callSid
 * @param {string} params.campaignId
 * @returns {Array} Array of message objects
 */
function getConversationHistory({ callSid, campaignId }) {
  const key = getKey(callSid, campaignId);
  const history = memoryStore.get(key) || [];
  console.log(`📄 Memory loaded for ${key} (${history.length} messages)`);
  return history;
}

/**
 * Save a message to the conversation memory
 * @param {Object} params
 * @param {string} params.callSid
 * @param {string} params.campaignId
 * @param {string} params.role - 'user' | 'assistant'
 * @param {string} params.content
 */
function saveMessage({ callSid, campaignId, role, content }) {
  const key = getKey(callSid, campaignId);
  if (!memoryStore.has(key)) memoryStore.set(key, []);
  memoryStore.get(key).push({ role, content });
  console.log(`💾 Message saved for conversation ${key} (${role})`);
}

/**
 * Reset conversation memory for a given callSid and campaignId
 * @param {Object} params
 * @param {string} params.callSid
 * @param {string} params.campaignId
 */
function resetConversation({ callSid, campaignId }) {
  const key = getKey(callSid, campaignId);
  memoryStore.delete(key);
  console.log(`🧹 Memory cleared for new campaign: ${key}`);
}

/**
 * Clear all memory (for dev/testing only)
 */
function clearAllMemory() {
  memoryStore.clear();
  console.log('🧹 All conversation memory cleared');
}

export {
  getConversationHistory,
  saveMessage,
  resetConversation,
  clearAllMemory
}; 
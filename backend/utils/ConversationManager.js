// utils/ConversationManager.js
import { Groq } from 'groq-sdk';
import { getRelevantChunks } from '../services/embedding.service.js';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

class ConversationManager {
  constructor() {
    this.conversations = new Map(); // sessionId -> { campaignId, history, context }
  }

  /**
   * Initialize a conversation session
   * @param {string} sessionId - Unique session identifier
   * @param {string} campaignId - Campaign ID for RAG context
   * @param {Object} options - Additional options
   */
  initializeSession(sessionId, campaignId, options = {}) {
    this.conversations.set(sessionId, {
      campaignId,
      history: [],
      context: options.context || '',
      language: options.language || 'English',
      objective: options.objective || '',
      sampleFlow: options.sampleFlow || '',
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    console.log(`✅ Initialized conversation session: ${sessionId} for campaign: ${campaignId}`);
  }

  /**
   * Get conversation session data
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session data or null if not found
   */
  getSession(sessionId) {
    return this.conversations.get(sessionId) || null;
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId - Session identifier
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  addMessage(sessionId, role, content) {
    const session = this.conversations.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.history.push({
      role,
      content,
      timestamp: new Date()
    });
    
    session.lastActivity = new Date();
    
    console.log(`💬 Added ${role} message to session: ${sessionId}`);
  }

  /**
   * Get conversation history
   * @param {string} sessionId - Session identifier
   * @param {number} limit - Maximum number of messages to return
   * @returns {Array} Conversation history
   */
  getHistory(sessionId, limit = 10) {
    const session = this.conversations.get(sessionId);
    if (!session) {
      return [];
    }

    return session.history.slice(-limit);
  }

  /**
   * Get LLM reply with RAG context
   * @param {string} sessionId - Session identifier
   * @param {string} message - User message
   * @param {Object} options - Additional options
   * @returns {Promise<string>} AI reply
   */
  async getLLMReply(sessionId, message, options = {}) {
    try {
      const session = this.conversations.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      console.log(`🤖 Generating LLM reply for session: ${sessionId}`);
      console.log(`📝 User message: ${message}`);

      // Get relevant chunks from campaign document
      let contextInfo = '';
      if (session.campaignId) {
        try {
          console.log('🔍 Retrieving relevant context for RAG...');
          const relevantChunks = await getRelevantChunks(message, session.campaignId, 3);
          
          if (relevantChunks.length > 0) {
            contextInfo = `\n\n📄 Campaign Context:\n${relevantChunks.map((chunk, index) => `${index + 1}. ${chunk.chunk}`).join('\n\n')}`;
            console.log(`✅ Retrieved ${relevantChunks.length} relevant chunks for context`);
          } else {
            console.log('⚠️ No relevant chunks found, proceeding without RAG context');
          }
        } catch (ragError) {
          console.error('❌ RAG retrieval failed:', ragError);
          console.log('⚠️ Proceeding without RAG context');
        }
      }

      // Build system prompt with context
      const systemPrompt = `
You are a helpful voice assistant speaking fluently in ${session.language}.

Your objective: ${session.objective}

💡 Instructions:
- Do not recite the objective
- Never speak English if ${session.language} is selected
- Avoid robotic or translated phrases — sound natural and human
- Be polite, professional, and concise like a real phone agent
- Use native, fluent expressions and tone
- Do not ask for feedback or talk about yourself
- Stay in character at all times
- Use the provided context information to give more accurate and helpful responses
- If context is provided, reference it naturally in your conversation

${session.sampleFlow ? `Here's how a typical call should sound:\n${session.sampleFlow.trim()}` : ''}
${contextInfo}

Now answer the user's query: ${message}
`.trim();

      // Prepare conversation history for LLM
      const conversationHistory = session.history
        .slice(-6) // Last 6 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Create messages array for Groq
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      // Generate response using Groq
      const completion = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages,
        temperature: 0.6,
        top_p: 1,
        max_tokens: 200
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error('Empty response from Groq');
      }

      // Add AI reply to conversation history
      this.addMessage(sessionId, 'assistant', reply);
      
      console.log(`✅ Generated LLM reply: ${reply.substring(0, 100)}...`);
      return reply;

    } catch (error) {
      console.error('❌ LLM reply generation failed:', error);
      
      // Return fallback message based on language
      const fallbackMessages = {
        Hindi: "माफ़ कीजिए, मैं अभी आपकी मदद नहीं कर पा रही हूँ। कृपया बाद में कोशिश करें।",
        Bengali: "দুঃখিত, আমি এখনই আপনাকে সাহায্য করতে পারছি না। পরে আবার চেষ্টা করুন।",
        English: "Sorry, I am unable to help you at the moment. Please try again later."
      };
      
      const session = this.conversations.get(sessionId);
      const language = session?.language || 'English';
      return fallbackMessages[language] || fallbackMessages.English;
    }
  }

  /**
   * Update session context
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - Updates to apply
   */
  updateSession(sessionId, updates) {
    const session = this.conversations.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    Object.assign(session, updates);
    session.lastActivity = new Date();
    
    console.log(`🔄 Updated session: ${sessionId}`);
  }

  /**
   * End a conversation session
   * @param {string} sessionId - Session identifier
   */
  endSession(sessionId) {
    const deleted = this.conversations.delete(sessionId);
    if (deleted) {
      console.log(`🔚 Ended conversation session: ${sessionId}`);
    } else {
      console.log(`⚠️ Session not found for deletion: ${sessionId}`);
    }
  }

  /**
   * Clean up old sessions
   * @param {number} maxAge - Maximum age in minutes
   */
  cleanupOldSessions(maxAge = 60) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - maxAge * 60 * 1000);
    
    let cleanedCount = 0;
    for (const [sessionId, session] of this.conversations.entries()) {
      if (session.lastActivity < cutoff) {
        this.conversations.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old sessions`);
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Statistics about active sessions
   */
  getStats() {
    const stats = {
      totalSessions: this.conversations.size,
      sessions: []
    };

    for (const [sessionId, session] of this.conversations.entries()) {
      stats.sessions.push({
        sessionId,
        campaignId: session.campaignId,
        messageCount: session.history.length,
        lastActivity: session.lastActivity,
        age: Math.floor((new Date() - session.createdAt) / 1000 / 60) // minutes
      });
    }

    return stats;
  }
}

// Export singleton instance
const conversationManager = new ConversationManager();

export default conversationManager; 
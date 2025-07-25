// services/llm.service.js
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import ragService from './rag.service.js';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const FALLBACK_MESSAGES = {
  Hindi: "माफ़ कीजिए, मैं अभी आपकी मदद नहीं कर पा रही हूँ। कृपया बाद में कोशिश करें।",
  Bengali: "দুঃখিত, আমি এখনই আপনাকে সাহায্য করতে পারছি না। পরে আবার চেষ্টা করুন।",
  English: "Sorry, I am unable to help you at the moment. Please try again later."
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function sanitizeText(text) {
  return text.replace(/[<>]/g, '').trim();
}

/**
 * Retrieve relevant context from campaign documents using RAG
 * @param {string} campaignId - Campaign ID
 * @param {string} userInput - User's input/query
 * @param {string} language - Campaign language
 * @returns {Promise<string>} Context information for AI
 */
async function getRAGContext(campaignId, userInput, language) {
  try {
    if (!campaignId || !userInput) {
      console.log('⚠️ Missing campaignId or userInput for RAG');
      return '';
    }

    console.log('🔍 Retrieving RAG context for campaign:', campaignId);
    
    // Use the memory-only RAG service
    const relevantChunks = await ragService.retrieveContext(campaignId, userInput, 3);
    
    if (relevantChunks.length === 0) {
      console.log('⚠️ No relevant chunks found from memory RAG service');
      return '';
    }
    
    // Format context information
    const contextInfo = relevantChunks
      .map((chunk, index) => `${index + 1}. ${chunk.chunk}`)
      .join('\n\n');
    
    console.log(`📄 RAG Context prepared with ${relevantChunks.length} chunks`);
    console.log(`🏆 Top similarity score: ${relevantChunks[0]?.score?.toFixed(3)}`);
    
    return contextInfo;
    
  } catch (error) {
    console.error('❌ RAG context retrieval failed:', error);
    return '';
  }
}

/**
 * Generate AI reply using Groq SDK with enhanced RAG (Retrieval-Augmented Generation)
 */
export async function generateReply({
  objective,
  language,
  conversationHistory = [],
  userInput,
  sampleFlow = '',
  campaignId = null
}) {
  try {
    if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');
    if (!objective || !language || !userInput) throw new Error('Missing required input');

    console.log('🤖 Generating AI reply with RAG integration...');
    console.log(`📋 Campaign ID: ${campaignId || 'None'}`);
    console.log(`🗣️ Language: ${language}`);
    console.log(`🎯 Objective: ${objective}`);

    // Retrieve relevant context from campaign document if available
    let contextInfo = '';
    if (campaignId) {
      contextInfo = await getRAGContext(campaignId, userInput, language);
    }

    // Build enhanced system prompt with RAG context
    const systemPrompt = `
You are an AI voice assistant speaking fluently in ${language}.

Your job is: ${objective}

💡 Instructions:
- Do not recite the objective
- Never speak English if ${language} is selected
- Avoid robotic or translated phrases — sound natural and human
- Be polite, professional, and concise like a real phone agent
- Use native, fluent expressions and tone
- Do not ask for feedback or talk about yourself
- Stay in character at all times
- Use the provided context information to give more accurate and helpful responses
- If context is provided, reference it naturally in your conversation
- Keep responses concise (under 50 words) for better phone conversation flow

${sampleFlow ? `Here's how a typical call should sound:\n${sampleFlow.trim()}` : ''}

${contextInfo ? `📄 Relevant Information from Campaign Document:\n${contextInfo}\n\nUse this information to provide accurate and helpful responses.` : ''}
`.trim();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: sanitizeText(msg.content)
      })),
      { role: 'user', content: sanitizeText(userInput) }
    ];

    console.log('🔄 Sending request to Groq LLM...');
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      temperature: 0.7,
      top_p: 1,
      max_tokens: 150
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty response from Groq');
    
    console.log('✅ [Groq] Reply generated successfully');
    console.log('📝 Reply length:', reply.length, 'characters');
    
    return reply;

  } catch (error) {
    console.error('❌ [Groq] Error:', error.message);
    const fallback = FALLBACK_MESSAGES[capitalize(language.trim())] || FALLBACK_MESSAGES.English;
    return fallback;
  }
}

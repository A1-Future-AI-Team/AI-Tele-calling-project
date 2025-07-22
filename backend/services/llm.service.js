// services/llm.service.js
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import { retrieveRelevantChunks } from './embed.service.js';

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
 * Generate AI reply using Groq SDK with RAG (Retrieval-Augmented Generation)
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

    // Retrieve relevant context from campaign document if available
    let contextInfo = '';
    if (campaignId) {
      try {
        console.log('🔍 Retrieving relevant context for RAG...');
        const relevantChunks = await retrieveRelevantChunks(campaignId, userInput, 3);
        
        if (relevantChunks.length > 0) {
          contextInfo = `\n\n📄 Relevant Information from Campaign Document:\n${relevantChunks.map((chunk, index) => `${index + 1}. ${chunk.chunk}`).join('\n\n')}`;
          console.log(`✅ Retrieved ${relevantChunks.length} relevant chunks for context`);
        } else {
          console.log('⚠️ No relevant chunks found, proceeding without RAG context');
        }
      } catch (ragError) {
        console.error('❌ RAG retrieval failed:', ragError);
        console.log('⚠️ Proceeding without RAG context');
      }
    }

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

${sampleFlow ? `Here's how a typical call should sound:\n${sampleFlow.trim()}` : ''}
${contextInfo}
`.trim();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: sanitizeText(msg.content)
      })),
      { role: 'user', content: sanitizeText(userInput) }
    ];

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      temperature: 0.6,
      top_p: 1,
      max_tokens: 200
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty response from Groq');
    
    console.log('✅ [Groq] Reply:', reply);
    return reply;

  } catch (error) {
    console.error('❌ [Groq] Error:', error.message);
    const fallback = FALLBACK_MESSAGES[capitalize(language.trim())] || FALLBACK_MESSAGES.English;
    return fallback;
  }
}

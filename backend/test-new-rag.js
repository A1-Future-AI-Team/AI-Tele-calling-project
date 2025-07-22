// test-new-rag.js - Test the new RAG implementation
import dotenv from 'dotenv';
import { embedCampaignDocText, getRelevantChunks, getChunkStats } from './services/embedding.service.js';
import conversationManager from './utils/ConversationManager.js';

dotenv.config();

// Sample campaign document content
const sampleCampaignDoc = `
Tata Safari Premium SUV - Complete Product Guide

The Tata Safari is a premium 7-seater SUV that redefines luxury and performance in its segment.

KEY FEATURES:
- 7-seater configuration with premium leather upholstery
- Advanced safety features including 6 airbags, ESP, and ABS
- Powerful 2.0L diesel engine delivering 170 PS power and 350 Nm torque
- 6-speed automatic transmission with manual mode
- Advanced infotainment system with 10.25-inch touchscreen
- Panoramic sunroof for enhanced driving experience
- Terrain response modes: Normal, Wet, Rough, and Sand
- LED headlamps with DRL and fog lamps
- 18-inch alloy wheels with 235/60 R18 tires

PRICING INFORMATION:
- Base variant (XE): ₹16.19 lakhs (ex-showroom)
- Mid variant (XM): ₹18.19 lakhs (ex-showroom)
- Top variant (XZ+): ₹27.34 lakhs (ex-showroom)
- All prices are ex-showroom Delhi

FINANCING OPTIONS:
- EMI starting from ₹25,000 per month
- Exchange bonus up to ₹50,000
- Corporate discount of ₹25,000
- Extended warranty options available
- 0% processing fee on loans

WARRANTY & SERVICE:
- 3-year/1,00,000 km standard warranty
- 24x7 roadside assistance
- Free first service
- Service intervals: 10,000 km or 1 year
- Genuine parts warranty: 1 year

COLOR OPTIONS:
- Galactic Blue
- Lunar White
- Stellar Silver
- Cosmic Black
- Stardust Gold

The Safari comes with Tata's signature design language featuring the Humanity Line and Impact Design 2.0 philosophy.
`;

async function testNewRAG() {
  try {
    console.log('🚀 Testing New RAG Implementation...\n');

    // Test 1: Embed campaign document
    console.log('📄 Test 1: Embedding campaign document...');
    const campaignId = 'test-campaign-123';
    const chunkCount = await embedCampaignDocText(sampleCampaignDoc, campaignId);
    console.log(`✅ Created ${chunkCount} chunks for campaign: ${campaignId}\n`);

    // Test 2: Retrieve relevant chunks
    console.log('🔍 Test 2: Testing chunk retrieval...');
    const testQueries = [
      'What are the features of Tata Safari?',
      'Tell me about the pricing',
      'What financing options are available?',
      'What colors does it come in?'
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      const relevantChunks = await getRelevantChunks(query, campaignId, 2);
      
      if (relevantChunks.length > 0) {
        console.log(`✅ Found ${relevantChunks.length} relevant chunks:`);
        relevantChunks.forEach((chunk, index) => {
          console.log(`   ${index + 1}. Score: ${chunk.score.toFixed(3)}`);
          console.log(`      ${chunk.chunk.substring(0, 100)}...`);
        });
      } else {
        console.log('⚠️ No relevant chunks found');
      }
    }

    // Test 3: Conversation Manager with RAG
    console.log('\n🤖 Test 3: Testing Conversation Manager with RAG...');
    const sessionId = 'test-session-456';
    
    // Initialize conversation session
    conversationManager.initializeSession(sessionId, campaignId, {
      language: 'English',
      objective: 'Promote Tata Safari SUV to potential customers',
      sampleFlow: 'Hello! I\'m calling about the new Tata Safari. Would you be interested in learning about its features?'
    });

    // Test conversation with RAG
    const testMessages = [
      'Tell me about the Tata Safari features',
      'What is the price range?',
      'What financing options do you offer?',
      'What colors are available?'
    ];

    for (const message of testMessages) {
      console.log(`\n👤 User: ${message}`);
      
      const aiReply = await conversationManager.getLLMReply(sessionId, message);
      console.log(`🤖 AI: ${aiReply}`);
      
      // Add a small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 4: Get statistics
    console.log('\n📊 Test 4: Getting statistics...');
    const chunkStats = getChunkStats();
    const sessionStats = conversationManager.getStats();
    
    console.log('Chunk Statistics:', chunkStats);
    console.log('Session Statistics:', sessionStats);

    // Test 5: Test without RAG (no campaignId)
    console.log('\n🤖 Test 5: Testing without RAG context...');
    const sessionIdNoRAG = 'test-session-no-rag';
    
    conversationManager.initializeSession(sessionIdNoRAG, null, {
      language: 'English',
      objective: 'Promote Tata Safari SUV to potential customers'
    });

    const aiReplyNoRAG = await conversationManager.getLLMReply(sessionIdNoRAG, 'Tell me about the Tata Safari features');
    console.log(`🤖 AI (No RAG): ${aiReplyNoRAG}`);

    console.log('\n✅ New RAG Implementation Test Completed Successfully!');
    
    // Cleanup
    conversationManager.endSession(sessionId);
    conversationManager.endSession(sessionIdNoRAG);
    console.log('🧹 Cleaned up test sessions');

  } catch (error) {
    console.error('❌ New RAG Test Failed:', error);
  }
}

// Run the test
testNewRAG(); 
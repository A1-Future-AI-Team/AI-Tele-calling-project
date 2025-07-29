// test-twilio-rag.js - Test Twilio integration with RAG
import dotenv from 'dotenv';
import { embedCampaignDocText } from './services/embedding.service.js';
import conversationManager from './utils/ConversationManager.js';

dotenv.config();

// Sample campaign document for testing
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

async function testTwilioRAG() {
  try {
    console.log('🚀 Testing Twilio Integration with RAG...\n');

    // Test 1: Simulate campaign document processing
    console.log('📄 Test 1: Processing campaign document for RAG...');
    const campaignId = 'test-campaign-twilio-123';
    const chunkCount = await embedCampaignDocText(sampleCampaignDoc, campaignId);
    console.log(`✅ Created ${chunkCount} chunks for campaign: ${campaignId}\n`);

    // Test 2: Simulate Twilio call session initialization
    console.log('📞 Test 2: Simulating Twilio call session...');
    const callSid = 'test-call-sid-456';
    
    // Initialize conversation session (like in voiceResponse)
    conversationManager.initializeSession(callSid, campaignId, {
      language: 'English',
      objective: 'Promote Tata Safari SUV to potential customers',
      sampleFlow: 'Hello! I\'m calling about the new Tata Safari. Would you be interested in learning about its features?'
    });

    // Test 3: Simulate initial greeting (like in voiceResponse)
    console.log('🤖 Test 3: Generating initial greeting...');
    const initialGreeting = await conversationManager.getLLMReply(callSid, 'Start the call and introduce yourself');
    console.log(`🎯 Initial Greeting: ${initialGreeting}\n`);

    // Test 4: Simulate conversation flow (like in transcribeAudio)
    console.log('💬 Test 4: Simulating conversation flow...');
    const conversationMessages = [
      'Tell me about the Tata Safari features',
      'What is the price range?',
      'What financing options do you offer?',
      'What colors are available?',
      'Can you tell me about the warranty?'
    ];

    for (const message of conversationMessages) {
      console.log(`👤 User: ${message}`);
      
      const aiReply = await conversationManager.getLLMReply(callSid, message);
      console.log(`🤖 AI: ${aiReply}\n`);
      
      // Add a small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 5: Get conversation statistics
    console.log('📊 Test 5: Getting conversation statistics...');
    const stats = conversationManager.getStats();
    console.log('Conversation Stats:', JSON.stringify(stats, null, 2));

    // Test 6: Test session persistence
    console.log('\n🔄 Test 6: Testing session persistence...');
    const session = conversationManager.getSession(callSid);
    console.log(`✅ Session found: ${session ? 'Yes' : 'No'}`);
    if (session) {
      console.log(`   Campaign ID: ${session.campaignId}`);
      console.log(`   Message count: ${session.history.length}`);
      console.log(`   Language: ${session.language}`);
    }

    // Test 7: Cleanup
    console.log('\n🧹 Test 7: Testing cleanup...');
    conversationManager.endSession(callSid);
    const sessionAfterCleanup = conversationManager.getSession(callSid);
    console.log(`✅ Session after cleanup: ${sessionAfterCleanup ? 'Still exists' : 'Cleaned up'}`);

    console.log('\n✅ Twilio RAG Integration Test Completed Successfully!');
    console.log('\n🎉 Your Twilio controller is now ready with RAG-powered conversations!');

  } catch (error) {
    console.error('❌ Twilio RAG Test Failed:', error);
  }
}

// Run the test
testTwilioRAG(); 
// test-conversation-manager.js - Test ConversationManager functionality
import dotenv from 'dotenv';
import conversationManager from './utils/ConversationManager.js';

dotenv.config();

async function testConversationManager() {
  try {
    console.log('🚀 Testing ConversationManager...\n');

    // Test 1: Basic session initialization
    console.log('📞 Test 1: Session initialization...');
    const sessionId = 'test-session-123';
    const campaignId = 'test-campaign-456';
    
    conversationManager.initializeSession(sessionId, campaignId, {
      language: 'English',
      objective: 'Promote Tata Safari SUV',
      sampleFlow: 'Hello! I\'m calling about the new Tata Safari.'
    });
    
    const session = conversationManager.getSession(sessionId);
    console.log(`✅ Session created: ${session ? 'Yes' : 'No'}`);
    if (session) {
      console.log(`   Campaign ID: ${session.campaignId}`);
      console.log(`   Language: ${session.language}`);
      console.log(`   Objective: ${session.objective}`);
    }

    // Test 2: Basic LLM reply (without RAG)
    console.log('\n🤖 Test 2: Basic LLM reply...');
    try {
      const reply = await conversationManager.getLLMReply(sessionId, 'Tell me about the Tata Safari');
      console.log(`✅ LLM Reply: ${reply.substring(0, 100)}...`);
    } catch (error) {
      console.error('❌ LLM Reply failed:', error.message);
    }

    // Test 3: Add messages
    console.log('\n💬 Test 3: Adding messages...');
    conversationManager.addMessage(sessionId, 'user', 'What is the price?');
    conversationManager.addMessage(sessionId, 'assistant', 'The Tata Safari starts at ₹16.19 lakhs.');
    
    const history = conversationManager.getHistory(sessionId);
    console.log(`✅ History length: ${history.length}`);

    // Test 4: Get statistics
    console.log('\n📊 Test 4: Getting statistics...');
    const stats = conversationManager.getStats();
    console.log(`✅ Total sessions: ${stats.totalSessions}`);

    // Test 5: Cleanup
    console.log('\n🧹 Test 5: Cleanup...');
    conversationManager.endSession(sessionId);
    const sessionAfterCleanup = conversationManager.getSession(sessionId);
    console.log(`✅ Session after cleanup: ${sessionAfterCleanup ? 'Still exists' : 'Cleaned up'}`);

    console.log('\n✅ ConversationManager test completed successfully!');

  } catch (error) {
    console.error('❌ ConversationManager test failed:', error);
  }
}

// Run the test
testConversationManager(); 
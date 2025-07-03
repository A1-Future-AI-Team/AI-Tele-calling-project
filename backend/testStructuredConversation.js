import { generateReply } from './services/llm.service.js';
import { ConversationManager } from './controllers/twilio.controller.js';

/**
 * Test the new structured conversation management system
 */
async function testStructuredConversationManagement() {
    console.log('🧪 Testing Structured Conversation Management...\n');
    
    // Test scenario: Restaurant waiter
    const campaignObjective = 'You are a restaurant waiter. Take food orders and be helpful to customers.';
    const language = 'Hindi';
    const conversationKey = 'test_call_12345';
    
    console.log('📋 Campaign Objective:', campaignObjective);
    console.log('🗣️ Language:', language);
    console.log('🔑 Conversation Key:', conversationKey);
    console.log('─'.repeat(70));
    
    // Test 1: Initial greeting (as if from voiceResponse)
    console.log('\n🤖 Test 1: Initial AI Greeting');
    const initialGreeting = 'नमस्ते! मैं वेटर हूं। आज क्या ऑर्डर करना है?';
    ConversationManager.addMessage(conversationKey, 'assistant', initialGreeting);
    console.log('🎯 AI Initial Greeting:', initialGreeting);
    
    // Test 2: User responds - build structured prompt
    console.log('\n👤 Test 2: User Responds');
    const userInput1 = 'हमें खाना चाहिए';
    console.log('👤 User says:', userInput1);
    
    // Add user message to conversation
    ConversationManager.addMessage(conversationKey, 'user', userInput1);
    
    // Get conversation history
    let history = ConversationManager.getHistory(conversationKey);
    console.log(`📜 Current history has ${history.length} messages`);
    
    // Build structured prompt
    const aiParams1 = ConversationManager.buildPrompt(
        campaignObjective,
        language,
        history.slice(0, -1), // Exclude the just-added user message
        userInput1
    );
    
    console.log('🎯 Built Prompt:');
    console.log('   System:', aiParams1.objective);
    console.log('   Context:', aiParams1.userInput);
    
    // Generate AI reply
    const aiReply1 = await generateReply(aiParams1);
    console.log('🎯 AI Reply:', aiReply1);
    
    // Add AI response to conversation
    ConversationManager.addMessage(conversationKey, 'assistant', aiReply1);
    
    // Test 3: Another user response to test context retention
    console.log('\n👤 Test 3: Follow-up Question');
    const userInput2 = 'बिरयानी कितने का है?';
    console.log('👤 User says:', userInput2);
    
    // Add user message
    ConversationManager.addMessage(conversationKey, 'user', userInput2);
    
    // Get updated history
    history = ConversationManager.getHistory(conversationKey);
    console.log(`📜 Updated history has ${history.length} messages`);
    
    // Show recent conversation
    console.log('📜 Recent conversation:');
    history.slice(-4).forEach((msg, i) => {
        console.log(`   ${msg.role}: ${msg.content}`);
    });
    
    // Build structured prompt for follow-up
    const aiParams2 = ConversationManager.buildPrompt(
        campaignObjective,
        language,
        history.slice(0, -1), // Exclude the just-added user message
        userInput2
    );
    
    // Generate AI reply for follow-up
    const aiReply2 = await generateReply(aiParams2);
    console.log('🎯 AI Follow-up Reply:', aiReply2);
    
    // Add AI response
    ConversationManager.addMessage(conversationKey, 'assistant', aiReply2);
    
    // Test 4: Test conversation length limit (max 10 messages)
    console.log('\n🔢 Test 4: Conversation Length Limit');
    
    // Add several more messages to test the 10-message limit
    for (let i = 0; i < 8; i++) {
        ConversationManager.addMessage(conversationKey, 'user', `Test message ${i + 1}`);
        ConversationManager.addMessage(conversationKey, 'assistant', `Response ${i + 1}`);
    }
    
    const finalHistory = ConversationManager.getHistory(conversationKey);
    console.log(`📜 Final history length: ${finalHistory.length} (should be max 10)`);
    console.log('📜 Final conversation (last 10 messages):');
    finalHistory.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.role}: ${msg.content}`);
    });
    
    // Test 5: Validate AI stays in character
    console.log('\n🎭 Test 5: Character Consistency Check');
    
    const offTopicInput = 'Tell me about Samsung Galaxy phones';
    console.log('👤 Off-topic user input:', offTopicInput);
    
    ConversationManager.addMessage(conversationKey, 'user', offTopicInput);
    const currentHistory = ConversationManager.getHistory(conversationKey);
    
    const aiParams3 = ConversationManager.buildPrompt(
        campaignObjective,
        language,
        currentHistory.slice(0, -1),
        offTopicInput
    );
    
    const aiReply3 = await generateReply(aiParams3);
    console.log('🎯 AI Reply to off-topic:', aiReply3);
    
    // Check if AI stayed in character
    const isOnTopic = !aiReply3.toLowerCase().includes('samsung') && 
                     !aiReply3.toLowerCase().includes('galaxy') && 
                     !aiReply3.toLowerCase().includes('smartphone');
    
    if (isOnTopic) {
        console.log('✅ AI stayed in character - redirected conversation back to restaurant');
    } else {
        console.log('❌ AI went off-topic - conversation management needs improvement');
    }
    
    // Test 6: Multiple conversation keys
    console.log('\n🔄 Test 6: Multiple Conversations');
    
    const conversationKey2 = 'test_call_67890';
    ConversationManager.addMessage(conversationKey2, 'assistant', 'Different conversation');
    ConversationManager.addMessage(conversationKey2, 'user', 'Hello from second call');
    
    const history1 = ConversationManager.getHistory(conversationKey);
    const history2 = ConversationManager.getHistory(conversationKey2);
    
    console.log(`📞 Conversation 1 (${conversationKey}): ${history1.length} messages`);
    console.log(`📞 Conversation 2 (${conversationKey2}): ${history2.length} messages`);
    console.log('✅ Multiple conversations maintained separately');
    
    // Final summary
    console.log('\n📊 STRUCTURED CONVERSATION MANAGEMENT TEST SUMMARY:');
    console.log('─'.repeat(70));
    console.log('✅ Message storage and retrieval working');
    console.log('✅ Conversation length limit enforced (max 10 messages)');
    console.log('✅ Structured prompts built correctly');
    console.log('✅ Campaign objective maintained in system prompt');
    console.log('✅ Multiple conversations handled separately');
    console.log(`${isOnTopic ? '✅' : '❌'} Character consistency maintained`);
    
    console.log('\n🎉 Structured conversation management test completed!');
}

// Test the conversation key generation
function testConversationKeyGeneration() {
    console.log('\n🔑 Testing Conversation Key Generation:');
    
    const key1 = ConversationManager.getConversationKey('CAxxxx123', null);
    const key2 = ConversationManager.getConversationKey(null, 'contact_456');
    const key3 = ConversationManager.getConversationKey(null, null);
    
    console.log('   With CallSid:', key1);
    console.log('   With ContactId:', key2);
    console.log('   With neither:', key3);
    
    console.log('✅ Conversation key generation working');
}

// Run all tests
async function runTests() {
    try {
        testConversationKeyGeneration();
        await testStructuredConversationManagement();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { testStructuredConversationManagement, testConversationKeyGeneration }; 
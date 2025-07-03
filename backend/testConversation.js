import { generateReply } from './services/llm.service.js';

/**
 * Test conversation context maintenance
 */
async function testConversationContext() {
    console.log('🧪 Testing AI Conversation Context...\n');
    
    // Test scenario: Restaurant waiter conversation
    const campaignObjective = 'You are a restaurant waiter. Take food orders and be helpful to customers.';
    const sampleFlow = 'Greet customers warmly, ask what they would like to order, and help with menu questions.';
    
    console.log('📋 Campaign Objective:', campaignObjective);
    console.log('📝 Sample Flow:', sampleFlow);
    console.log('─'.repeat(50));
    
    // Simulate conversation history
    let conversationHistory = '';
    
    // Test 1: Initial greeting (AI starts)
    console.log('\n🤖 Test 1: AI Initial Greeting');
    const initialPrompt = 'Start the conversation with the customer. Use the objective context to introduce yourself and ask what they would like to order.';
    
    const aiParams1 = {
        objective: `${campaignObjective} Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. Maintain conversation context and respond naturally.`,
        sampleFlow: sampleFlow,
        userInput: initialPrompt
    };
    
    const aiReply1 = await generateReply(aiParams1);
    console.log('🎯 AI Opening:', aiReply1);
    
    // Add to conversation history
    conversationHistory += `AI: ${aiReply1}\n`;
    
    // Test 2: User responds (wants to order)
    console.log('\n👤 Test 2: User Responds');
    const userInput2 = 'हमें दो प्लेट बिरयानी और एक कोल्ड ड्रिंक चाहिए';
    console.log('👤 User says:', userInput2);
    
    const contextualPrompt2 = `Previous conversation:\n${conversationHistory}\n\nUser just said: ${userInput2}\n\nRespond naturally continuing the conversation.`;
    
    const aiParams2 = {
        objective: `${campaignObjective} Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. Maintain conversation context and respond naturally.`,
        sampleFlow: sampleFlow,
        userInput: contextualPrompt2
    };
    
    const aiReply2 = await generateReply(aiParams2);
    console.log('🎯 AI Reply:', aiReply2);
    
    // Add to conversation history
    conversationHistory += `USER: ${userInput2}\nAI: ${aiReply2}\n`;
    
    // Test 3: User asks follow-up question
    console.log('\n👤 Test 3: User Follow-up');
    const userInput3 = 'बिरयानी में क्या-क्या मिलता है?';
    console.log('👤 User says:', userInput3);
    
    const contextualPrompt3 = `Previous conversation:\n${conversationHistory}\n\nUser just said: ${userInput3}\n\nRespond naturally continuing the conversation.`;
    
    const aiParams3 = {
        objective: `${campaignObjective} Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. Maintain conversation context and respond naturally.`,
        sampleFlow: sampleFlow,
        userInput: contextualPrompt3
    };
    
    const aiReply3 = await generateReply(aiParams3);
    console.log('🎯 AI Reply:', aiReply3);
    
    // Test 4: User changes topic slightly
    console.log('\n👤 Test 4: User Changes Topic');
    const userInput4 = 'ठीक है, और कुछ डेज़र्ट भी है क्या?';
    console.log('👤 User says:', userInput4);
    
    conversationHistory += `USER: ${userInput3}\nAI: ${aiReply3}\n`;
    
    const contextualPrompt4 = `Previous conversation:\n${conversationHistory}\n\nUser just said: ${userInput4}\n\nRespond naturally continuing the conversation.`;
    
    const aiParams4 = {
        objective: `${campaignObjective} Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. Maintain conversation context and respond naturally.`,
        sampleFlow: sampleFlow,
        userInput: contextualPrompt4
    };
    
    const aiReply4 = await generateReply(aiParams4);
    console.log('🎯 AI Reply:', aiReply4);
    
    // Show final conversation summary
    console.log('\n📜 Final Conversation Summary:');
    console.log('─'.repeat(50));
    console.log(`AI: ${aiReply1}`);
    console.log(`USER: ${userInput2}`);
    console.log(`AI: ${aiReply2}`);
    console.log(`USER: ${userInput3}`);
    console.log(`AI: ${aiReply3}`);
    console.log(`USER: ${userInput4}`);
    console.log(`AI: ${aiReply4}`);
    
    console.log('\n✅ Conversation context test completed!');
    console.log('🔍 Check if AI maintained context throughout the conversation');
}

// Test without context (old behavior)
async function testWithoutContext() {
    console.log('\n🧪 Testing AI WITHOUT Context (Old Behavior)...\n');
    
    const campaignObjective = 'You are a restaurant waiter. Take food orders and be helpful to customers.';
    const sampleFlow = 'Greet customers warmly, ask what they would like to order, and help with menu questions.';
    
    // Test responses without context
    const responses = [
        'हमें दो प्लेट बिरयानी और एक कोल्ड ड्रिंक चाहिए',
        'बिरयानी में क्या-क्या मिलता है?',
        'ठीक है, और कुछ डेज़र्ट भी है क्या?'
    ];
    
    for (let i = 0; i < responses.length; i++) {
        const userInput = responses[i];
        console.log(`\n👤 Test ${i + 1}: ${userInput}`);
        
        const aiParams = {
            objective: `${campaignObjective} Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls.`,
            sampleFlow: sampleFlow,
            userInput: userInput // No context, just raw input
        };
        
        const aiReply = await generateReply(aiParams);
        console.log('🎯 AI Reply (no context):', aiReply);
    }
    
    console.log('\n⚠️ Notice: Without context, AI treats each message as separate conversation');
}

// Run the tests
async function runTests() {
    try {
        await testConversationContext();
        
        console.log('\n' + '='.repeat(70));
        
        await testWithoutContext();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { testConversationContext, testWithoutContext }; 
import { generateReply } from './services/llm.service.js';

/**
 * Test the specific context loss issue where first message is correct
 * but subsequent messages go off-topic
 */
async function testContextLoss() {
    console.log('🧪 Testing Context Loss Fix...\n');
    
    // Test scenario: Restaurant waiter (as mentioned by user)
    const campaignObjective = 'You are a restaurant waiter. Take food orders and be helpful to customers.';
    const sampleFlow = 'Greet customers warmly, ask what they would like to order, and help with menu questions.';
    
    console.log('📋 Campaign Objective:', campaignObjective);
    console.log('─'.repeat(50));
    
    // Test 1: Initial message (this works according to user)
    console.log('\n🤖 Test 1: Initial AI Message (This should work)');
    const initialPrompt = 'Start the conversation with the customer. Use the objective context to introduce yourself and ask what they would like to order.';
    
    const aiParams1 = {
        objective: `You are an AI voice assistant. Your job is: ${campaignObjective}. Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. Maintain conversation context and respond naturally.`,
        sampleFlow: sampleFlow,
        userInput: initialPrompt
    };
    
    const aiReply1 = await generateReply(aiParams1);
    console.log('🎯 AI Opening:', aiReply1);
    
    // Simulate conversation history (as it would be saved)
    let conversationHistory = `AI: ${aiReply1}`;
    
    // Test 2: User responds (this is where context loss happens)
    console.log('\n👤 Test 2: User Responds (Context loss happens here)');
    const userInput2 = 'हमें खाना चाहिए';
    console.log('👤 User says:', userInput2);
    
    console.log('\n🔍 Testing OLD method (before fix):');
    const oldContextualPrompt = `Previous conversation:\n${conversationHistory}\n\nUser just said: ${userInput2}\n\nRespond naturally continuing the conversation.`;
    
    const oldAiParams = {
        objective: `You are an AI voice assistant. Your job is: ${campaignObjective}. Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. Maintain conversation context and respond naturally.`,
        sampleFlow: sampleFlow,
        userInput: oldContextualPrompt
    };
    
    const oldAiReply = await generateReply(oldAiParams);
    console.log('🎯 Old AI Reply:', oldAiReply);
    
    // Check if old method goes off-topic
    if (oldAiReply.toLowerCase().includes('samsung') || oldAiReply.toLowerCase().includes('galaxy') || oldAiReply.toLowerCase().includes('smartphone')) {
        console.log('❌ OLD METHOD: Context lost - AI went off-topic!');
    } else {
        console.log('✅ OLD METHOD: Context maintained');
    }
    
    console.log('\n🔍 Testing NEW method (after fix):');
    const newContextualPrompt = `ROLE: ${campaignObjective}

Previous conversation:
${conversationHistory}

User just said: ${userInput2}

Stay in character as defined by your role. Respond naturally continuing the conversation while maintaining your primary objective.`;
    
    console.log('🎯 New Contextual Prompt:', newContextualPrompt);
    
    const newAiParams = {
        objective: `Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. You must stay in character throughout the conversation.`,
        sampleFlow: sampleFlow,
        userInput: newContextualPrompt
    };
    
    const newAiReply = await generateReply(newAiParams);
    console.log('🎯 New AI Reply:', newAiReply);
    
    // Check if new method maintains context
    if (newAiReply.toLowerCase().includes('samsung') || newAiReply.toLowerCase().includes('galaxy') || newAiReply.toLowerCase().includes('smartphone')) {
        console.log('❌ NEW METHOD: Context still lost - AI went off-topic!');
    } else {
        console.log('✅ NEW METHOD: Context maintained - AI stayed in character');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPARISON:');
    console.log('Old Method Response:', oldAiReply);
    console.log('New Method Response:', newAiReply);
    
    // Test 3: Another user response to check consistency
    console.log('\n👤 Test 3: Another User Response');
    const userInput3 = 'क्या आपके पास पिज़्ज़ा है?';
    console.log('👤 User says:', userInput3);
    
    // Update conversation history
    conversationHistory += `\nUSER: ${userInput2}\nAI: ${newAiReply}`;
    
    const finalContextualPrompt = `ROLE: ${campaignObjective}

Previous conversation:
${conversationHistory}

User just said: ${userInput3}

Stay in character as defined by your role. Respond naturally continuing the conversation while maintaining your primary objective.`;
    
    const finalAiParams = {
        objective: `Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words for phone calls. You must stay in character throughout the conversation.`,
        sampleFlow: sampleFlow,
        userInput: finalContextualPrompt
    };
    
    const finalAiReply = await generateReply(finalAiParams);
    console.log('🎯 Final AI Reply:', finalAiReply);
    
    // Final validation
    if (finalAiReply.toLowerCase().includes('samsung') || finalAiReply.toLowerCase().includes('galaxy') || finalAiReply.toLowerCase().includes('smartphone')) {
        console.log('❌ FINAL TEST: Context lost - AI went off-topic!');
    } else {
        console.log('✅ FINAL TEST: Context maintained - AI stayed in character');
    }
    
    console.log('\n✅ Context loss test completed!');
}

// Run the test
async function runTest() {
    try {
        await testContextLoss();
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTest();
}

export { testContextLoss }; 
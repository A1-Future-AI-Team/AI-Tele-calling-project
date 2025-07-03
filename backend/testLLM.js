import { generateReply } from './services/llm.service.js';

/**
 * Test the LLM service with sample inputs
 */
async function testLLM() {
    console.log('🧪 Testing LLM Service...\n');

    // Test case 1: Sales call
    console.log('📞 Test Case 1: Sales Call');
    console.log('=' .repeat(50));
    
    const testCase1 = {
        objective: "You are a sales representative selling insurance policies. Be persuasive but friendly.",
        sampleFlow: "Start by greeting the customer and asking about their insurance needs. Present benefits clearly.",
        userInput: "Hi, I'm interested in health insurance for my family",
        language: "English"
    };

    try {
        const reply1 = await generateReply(testCase1);
        console.log('✅ AI Reply 1:', reply1);
    } catch (error) {
        console.error('❌ Test Case 1 failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 2: Customer support
    console.log('📞 Test Case 2: Customer Support');
    console.log('=' .repeat(50));
    
    const testCase2 = {
        objective: "You are a customer support representative helping with product issues. Be helpful and professional.",
        sampleFlow: "Listen to the customer's problem and provide step-by-step solutions.",
        userInput: "My internet connection is very slow today",
        language: "Hindi"
    };

    try {
        const reply2 = await generateReply(testCase2);
        console.log('✅ AI Reply 2:', reply2);
    } catch (error) {
        console.error('❌ Test Case 2 failed:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test case 3: Survey call
    console.log('📞 Test Case 3: Survey Call');
    console.log('=' .repeat(50));
    
    const testCase3 = {
        objective: "You are conducting a customer satisfaction survey. Ask follow-up questions to gather feedback.",
        sampleFlow: "Thank the customer for their time and ask about their experience with our service.",
        userInput: "The service was okay, but the delivery was a bit slow",
        language: "Hindi"
    };

    try {
        const reply3 = await generateReply(testCase3);
        console.log('✅ AI Reply 3:', reply3);
    } catch (error) {
        console.error('❌ Test Case 3 failed:', error.message);
    }

    console.log('\n🎉 LLM Service testing completed!');
}

// Run the test
testLLM(); 
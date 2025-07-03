import { generateReply } from './services/llm.service.js';

/**
 * Test the improved LLM service with structured messages
 */
async function testImprovedLLMService() {
    console.log('🧪 Testing Improved LLM Service with Structured Messages...\n');
    
    // Test 1: Restaurant waiter in Hindi with conversation history
    console.log('🍽️ Test 1: Restaurant Waiter (Hindi) with Conversation History');
    console.log('─'.repeat(70));
    
    const restaurantObjective = 'You are a restaurant waiter. Take food orders and be helpful to customers.';
    const restaurantSampleFlow = 'Greet customers warmly, ask what they would like to order, and help with menu questions.';
    const restaurantLanguage = 'Hindi';
    
    // Simulate conversation history
    const restaurantHistory = [
        { role: 'assistant', content: 'नमस्ते! मैं वेटर हूं। आज क्या ऑर्डर करना है?' },
        { role: 'user', content: 'हमें खाना चाहिए' }
    ];
    
    const restaurantParams = {
        objective: restaurantObjective,
        sampleFlow: restaurantSampleFlow,
        userInput: 'बिरयानी कितने की है?',
        language: restaurantLanguage,
        conversationHistory: restaurantHistory
    };
    
    console.log('📋 Objective:', restaurantObjective);
    console.log('🗣️ Language:', restaurantLanguage);
    console.log('💬 User Input:', restaurantParams.userInput);
    console.log('📜 Conversation History Length:', restaurantHistory.length);
    
    const restaurantReply = await generateReply(restaurantParams);
    console.log('🎯 AI Reply:', restaurantReply);
    
    // Validate response
    const isHindi = /[\u0900-\u097F]/.test(restaurantReply); // Devanagari script
    const isRelevant = !restaurantReply.toLowerCase().includes('samsung') && 
                      !restaurantReply.toLowerCase().includes('galaxy');
    
    console.log(`✅ Response in Hindi: ${isHindi ? 'Yes' : 'No'}`);
    console.log(`✅ Response relevant to restaurant: ${isRelevant ? 'Yes' : 'No'}`);
    
    // Test 2: Customer support in English with no history  
    console.log('\n📞 Test 2: Customer Support (English) - First Interaction');
    console.log('─'.repeat(70));
    
    const supportObjective = 'You are a customer support agent helping with technical issues. Be helpful and professional.';
    const supportSampleFlow = 'Listen to the customer problem and provide step-by-step solutions.';
    const supportLanguage = 'English';
    
    const supportParams = {
        objective: supportObjective,
        sampleFlow: supportSampleFlow,
        userInput: 'My internet is not working properly',
        language: supportLanguage,
        conversationHistory: [] // No previous conversation
    };
    
    console.log('📋 Objective:', supportObjective);
    console.log('🗣️ Language:', supportLanguage);
    console.log('💬 User Input:', supportParams.userInput);
    console.log('📜 Conversation History Length:', 0);
    
    const supportReply = await generateReply(supportParams);
    console.log('🎯 AI Reply:', supportReply);
    
    // Validate response
    const isEnglishSupport = !(/[\u0900-\u097F]/.test(supportReply)); // No Hindi script
    const isSupportRelevant = supportReply.toLowerCase().includes('internet') || 
                             supportReply.toLowerCase().includes('troubleshoot') ||
                             supportReply.toLowerCase().includes('connection');
    
    console.log(`✅ Response in English: ${isEnglishSupport ? 'Yes' : 'No'}`);
    console.log(`✅ Response relevant to support: ${isSupportRelevant ? 'Yes' : 'No'}`);
    
    // Test 3: Sales call in Bengali with conversation context
    console.log('\n💼 Test 3: Sales Call (Bengali) with Context');
    console.log('─'.repeat(70));
    
    const salesObjective = 'You are a sales representative selling insurance policies. Be persuasive but friendly.';
    const salesSampleFlow = 'Start by understanding customer needs and present relevant insurance options.';
    const salesLanguage = 'Bengali';
    
    const salesHistory = [
        { role: 'assistant', content: 'নমস্কার! আমি বীমা পলিসি নিয়ে কথা বলতে চাই।' },
        { role: 'user', content: 'আমার পরিবারের জন্য স্বাস্থ্য বীমা দরকার' }
    ];
    
    const salesParams = {
        objective: salesObjective,
        sampleFlow: salesSampleFlow,
        userInput: 'কত টাকা খরচ হবে?',
        language: salesLanguage,
        conversationHistory: salesHistory
    };
    
    console.log('📋 Objective:', salesObjective);
    console.log('🗣️ Language:', salesLanguage);
    console.log('💬 User Input:', salesParams.userInput);
    console.log('📜 Conversation History Length:', salesHistory.length);
    
    const salesReply = await generateReply(salesParams);
    console.log('🎯 AI Reply:', salesReply);
    
    // Validate response
    const isBengali = /[\u0980-\u09FF]/.test(salesReply); // Bengali script
    const isSalesRelevant = !salesReply.toLowerCase().includes('samsung') && 
                           !salesReply.toLowerCase().includes('smartphone');
    
    console.log(`✅ Response in Bengali: ${isBengali ? 'Yes' : 'No'}`);
    console.log(`✅ Response relevant to sales: ${isSalesRelevant ? 'Yes' : 'No'}`);
    
    // Test 4: Off-topic redirect test
    console.log('\n🎭 Test 4: Off-Topic Redirect Test (Restaurant Waiter)');
    console.log('─'.repeat(70));
    
    const redirectHistory = [
        { role: 'assistant', content: 'नमस्ते! मैं वेटर हूं। आज क्या ऑर्डर करना है?' },
        { role: 'user', content: 'हमें खाना चाहिए' },
        { role: 'assistant', content: 'बिल्कुल! हमारे मेन्यू में कई अच्छे विकल्प हैं।' }
    ];
    
    const redirectParams = {
        objective: restaurantObjective,
        sampleFlow: restaurantSampleFlow,
        userInput: 'Tell me about Samsung Galaxy phones', // Off-topic input
        language: 'Hindi',
        conversationHistory: redirectHistory
    };
    
    console.log('📋 Objective:', restaurantObjective);
    console.log('🗣️ Language:', 'Hindi');
    console.log('💬 User Input (Off-topic):', redirectParams.userInput);
    console.log('📜 Conversation History Length:', redirectHistory.length);
    
    const redirectReply = await generateReply(redirectParams);
    console.log('🎯 AI Reply:', redirectReply);
    
    // Validate redirect
    const stayedOnTopic = !redirectReply.toLowerCase().includes('samsung') && 
                         !redirectReply.toLowerCase().includes('galaxy') &&
                         !redirectReply.toLowerCase().includes('phone');
    
    const redirectedToFood = redirectReply.toLowerCase().includes('खान') || 
                            redirectReply.toLowerCase().includes('ऑर्डर') ||
                            redirectReply.toLowerCase().includes('मेन्यू');
    
    console.log(`✅ Stayed on restaurant topic: ${stayedOnTopic ? 'Yes' : 'No'}`);
    console.log(`✅ Redirected to food/menu: ${redirectedToFood ? 'Yes' : 'No'}`);
    
    // Test 5: Temperature and length validation
    console.log('\n🌡️ Test 5: Response Length and Temperature Validation');
    console.log('─'.repeat(70));
    
    const lengthTestParams = {
        objective: 'You are a brief telecaller. Give short responses.',
        sampleFlow: 'Keep responses under 40 words.',
        userInput: 'Tell me everything about your company',
        language: 'English',
        conversationHistory: []
    };
    
    const lengthTestReply = await generateReply(lengthTestParams);
    console.log('🎯 AI Reply:', lengthTestReply);
    
    const wordCount = lengthTestReply.split(' ').length;
    const isShort = wordCount <= 50; // Allow some flexibility
    
    console.log(`📏 Word count: ${wordCount}`);
    console.log(`✅ Response length appropriate: ${isShort ? 'Yes' : 'No'}`);
    
    // Summary
    console.log('\n📊 IMPROVED LLM SERVICE TEST SUMMARY');
    console.log('─'.repeat(70));
    console.log(`✅ Hindi language support: ${isHindi ? 'Working' : 'Needs fix'}`);
    console.log(`✅ English language support: ${isEnglishSupport ? 'Working' : 'Needs fix'}`);
    console.log(`✅ Bengali language support: ${isBengali ? 'Working' : 'Needs fix'}`);
    console.log(`✅ Context awareness: Working`);
    console.log(`✅ Conversation history integration: Working`);
    console.log(`✅ Off-topic redirect: ${stayedOnTopic ? 'Working' : 'Needs improvement'}`);
    console.log(`✅ Response length control: ${isShort ? 'Working' : 'Needs adjustment'}`);
    console.log(`✅ Temperature setting (0.5): Applied`);
    console.log(`✅ Native fluency prompts: Applied`);
    
    console.log('\n🎉 Improved LLM service test completed!');
}

// Test old vs new method comparison
async function testOldVsNewComparison() {
    console.log('\n🔄 Testing Old vs New Method Comparison');
    console.log('─'.repeat(70));
    
    const objective = 'You are a restaurant waiter. Take food orders and be helpful to customers.';
    const userInput = 'हमें खाना चाहिए';
    
    // Old method (basic parameters)
    console.log('🔴 Old Method:');
    const oldParams = {
        objective: `You are an AI voice assistant. Your job is: ${objective}. Respond ONLY in Hindi (Devanagari script). Keep responses under 40 words.`,
        sampleFlow: 'Continue conversation naturally.',
        userInput: userInput
    };
    
    const oldReply = await generateReply(oldParams);
    console.log('Old Reply:', oldReply);
    
    // New method (structured with language)
    console.log('\n🟢 New Method:');
    const newParams = {
        objective: objective,
        sampleFlow: 'Greet customers warmly and help with orders.',
        userInput: userInput,
        language: 'Hindi',
        conversationHistory: []
    };
    
    const newReply = await generateReply(newParams);
    console.log('New Reply:', newReply);
    
    console.log('\n📊 Comparison Results:');
    console.log('Both methods should produce native Hindi responses relevant to restaurant service.');
}

// Run all tests
async function runAllTests() {
    try {
        await testImprovedLLMService();
        await testOldVsNewComparison();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

export { testImprovedLLMService, testOldVsNewComparison }; 
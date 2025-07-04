import { generateReply } from './services/llm.service.js';

/**
 * Test language detection and response generation
 */
async function testLanguageDetection() {
    console.log('🧪 Testing Language Detection and Response Generation...\n');
    
    const testCases = [
        {
            language: 'English',
            objective: 'You are a customer service representative. Greet customers warmly and help them with their inquiries.',
            userInput: 'Hello, my name is Vivek'
        },
        {
            language: 'Hindi',
            objective: 'आप एक ग्राहक सेवा प्रतिनिधि हैं। ग्राहकों का गर्मजोशी से स्वागत करें और उनकी समस्याओं में मदद करें।',
            userInput: 'नमस्ते, मेरा नाम विवेक है'
        }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📋 Test ${i + 1}: ${testCase.language}`);
        console.log(`🎯 Objective: ${testCase.objective}`);
        console.log(`👤 User Input: ${testCase.userInput}`);
        
        try {
            const aiParams = {
                objective: testCase.objective,
                language: testCase.language,
                userInput: testCase.userInput,
                conversationHistory: []
            };
            
            const aiReply = await generateReply(aiParams);
            console.log(`🤖 AI Response: ${aiReply}`);
            
            // Check if response is in the correct language
            const isEnglish = /^[a-zA-Z\s.,!?]+$/.test(aiReply);
            const isHindi = /[\u0900-\u097F]/.test(aiReply);
            
            if (testCase.language === 'English' && isEnglish) {
                console.log('✅ Language check: PASSED (English response detected)');
            } else if (testCase.language === 'Hindi' && isHindi) {
                console.log('✅ Language check: PASSED (Hindi response detected)');
            } else {
                console.log('❌ Language check: FAILED (Unexpected language detected)');
            }
            
        } catch (error) {
            console.error(`❌ Test ${i + 1} failed:`, error.message);
        }
        
        console.log('─'.repeat(60) + '\n');
    }
    
    console.log('✅ Language detection test completed!');
}

// Test STT language mapping
function testSTTLanguageMapping() {
    console.log('🧪 Testing STT Language Mapping...\n');
    
    const sttLanguageMap = {
        'English': 'en',
        'Hindi': 'hi',
        'Bengali': 'bn'
    };
    
    const testLanguages = ['English', 'Hindi', 'Bengali', 'Unknown'];
    
    testLanguages.forEach(lang => {
        const sttLang = sttLanguageMap[lang] || 'en';
        console.log(`📋 Campaign Language: ${lang} → STT Language: ${sttLang}`);
    });
    
    console.log('\n✅ STT language mapping test completed!');
}

// Run the tests
async function runTests() {
    try {
        await testLanguageDetection();
        console.log('\n' + '='.repeat(70) + '\n');
        testSTTLanguageMapping();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { testLanguageDetection, testSTTLanguageMapping }; 
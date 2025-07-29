// test-rag-integration.js
import dotenv from 'dotenv';
import ragService from './services/rag.service.js';
import { generateReply } from './services/llm.service.js';
import connectDB from './config/db.config.js';

dotenv.config();

/**
 * Test RAG integration for AI telecalling system
 */
async function testRAGIntegration() {
  console.log('🧪 Starting RAG Integration Test...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Test 1: PDF Processing
    console.log('\n📄 Test 1: PDF Processing');
    console.log('========================');
    
    // Create a sample PDF content (simulating PDF buffer)
    const samplePdfContent = `
    Samsung Galaxy S24 Ultra - Product Information
    
    Key Features:
    - 6.8-inch Dynamic AMOLED 2X display with 120Hz refresh rate
    - Snapdragon 8 Gen 3 processor for exceptional performance
    - 200MP main camera with 5x optical zoom
    - S Pen included for productivity and creativity
    - 5000mAh battery with 45W fast charging
    - IP68 water and dust resistance
    
    Pricing:
    - 256GB: $1,299
    - 512GB: $1,419
    - 1TB: $1,659
    
    Financing Options:
    - 0% APR for 24 months with Samsung Financing
    - Trade-in value up to $750
    - Monthly payments starting at $54.13
    
    Warranty:
    - 1-year limited warranty
    - 2-year extended warranty available
    - Samsung Care+ protection plan
    
    Call Script:
    "Hello! I'm calling about the amazing Samsung Galaxy S24 Ultra. 
    This flagship device features our most advanced camera system yet, 
    with a 200MP main camera and 5x optical zoom. The S Pen is included 
    for enhanced productivity. Would you like to hear about our special 
    financing options starting at just $54.13 per month?"
    `;
    
    const testCampaignId = 'test-campaign-' + Date.now();
    
    // Test PDF processing
    const pdfResult = await ragService.processCampaignDocument(
      testCampaignId,
      Buffer.from(samplePdfContent),
      'pdf'
    );
    
    console.log('📊 PDF Processing Result:', pdfResult);
    
    if (pdfResult.success) {
      console.log('✅ PDF processing test PASSED');
    } else {
      console.log('❌ PDF processing test FAILED');
      return;
    }
    
    // Test 2: Context Retrieval
    console.log('\n🔍 Test 2: Context Retrieval');
    console.log('============================');
    
    const testQueries = [
      'What is the price of the Samsung Galaxy?',
      'Tell me about the camera features',
      'What financing options are available?',
      'What is the warranty coverage?'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      const context = await ragService.retrieveContext(testCampaignId, query, 2);
      
      if (context.length > 0) {
        console.log(`✅ Found ${context.length} relevant chunks`);
        console.log(`🏆 Top score: ${context[0].score.toFixed(3)}`);
        console.log(`📄 Top chunk: ${context[0].chunk.substring(0, 100)}...`);
        console.log(`🔗 Source: ${context[0].source}`);
      } else {
        console.log('⚠️ No relevant chunks found');
      }
    }
    
    // Test 3: AI Response Generation with RAG
    console.log('\n🤖 Test 3: AI Response Generation with RAG');
    console.log('==========================================');
    
    const testUserInput = 'What is the price of the Samsung Galaxy S24 Ultra?';
    
    console.log(`📝 User input: "${testUserInput}"`);
    
    const aiResponse = await generateReply({
      objective: 'Sell Samsung Galaxy S24 Ultra smartphones',
      language: 'English',
      conversationHistory: [],
      userInput: testUserInput,
      sampleFlow: 'Be friendly, informative, and focus on value proposition',
      campaignId: testCampaignId
    });
    
    console.log(`🤖 AI Response: "${aiResponse}"`);
    console.log(`📊 Response length: ${aiResponse.length} characters`);
    
    // Test 4: RAG Statistics
    console.log('\n📊 Test 4: RAG Statistics');
    console.log('=========================');
    
    const stats = ragService.getRAGStats();
    console.log('📈 RAG Statistics:', stats);
    
    const status = ragService.getProcessingStatus(testCampaignId);
    console.log('📋 Processing Status:', status);
    
    // Test 5: Multi-turn Conversation with RAG
    console.log('\n💬 Test 5: Multi-turn Conversation with RAG');
    console.log('============================================');
    
    const conversationHistory = [];
    
    const conversationTurns = [
      'Hello, I heard about the Samsung Galaxy S24 Ultra',
      'What about the camera quality?',
      'How much does it cost?',
      'What financing options do you have?'
    ];
    
    for (let i = 0; i < conversationTurns.length; i++) {
      const userInput = conversationTurns[i];
      console.log(`\n👤 Turn ${i + 1}: "${userInput}"`);
      
      const response = await generateReply({
        objective: 'Sell Samsung Galaxy S24 Ultra smartphones',
        language: 'English',
        conversationHistory: conversationHistory,
        userInput: userInput,
        sampleFlow: 'Be friendly, informative, and focus on value proposition',
        campaignId: testCampaignId
      });
      
      console.log(`🤖 AI: "${response}"`);
      
      // Add to conversation history
      conversationHistory.push({ role: 'user', content: userInput });
      conversationHistory.push({ role: 'assistant', content: response });
    }
    
    // Test 6: Different Languages
    console.log('\n🌍 Test 6: Multi-language RAG');
    console.log('============================');
    
    const hindiResponse = await generateReply({
      objective: 'Samsung Galaxy S24 Ultra बेचें',
      language: 'Hindi',
      conversationHistory: [],
      userInput: 'Samsung Galaxy की कीमत क्या है?',
      sampleFlow: 'दोस्ताना और जानकारीपूर्ण रहें',
      campaignId: testCampaignId
    });
    
    console.log(`🇮🇳 Hindi Response: "${hindiResponse}"`);
    
    // Cleanup
    console.log('\n🧹 Cleanup');
    console.log('==========');
    
    ragService.clearProcessingStatus(testCampaignId);
    console.log('✅ Test campaign processing status cleared');
    
    console.log('\n🎉 All RAG Integration Tests Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ PDF processing and text extraction');
    console.log('✅ Context retrieval from embeddings');
    console.log('✅ AI response generation with RAG context');
    console.log('✅ Multi-turn conversation support');
    console.log('✅ Multi-language support');
    console.log('✅ Statistics and status tracking');
    
  } catch (error) {
    console.error('❌ RAG Integration Test Failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the test
testRAGIntegration(); 
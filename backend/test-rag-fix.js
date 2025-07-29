// test-rag-fix.js
import dotenv from 'dotenv';
import ragService from './services/rag.service.js';
import connectDB from './config/db.config.js';

dotenv.config();

/**
 * Test the ObjectId fix for RAG integration
 */
async function testRAGFix() {
  console.log('🧪 Testing RAG ObjectId Fix...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Test with a valid ObjectId format
    const testCampaignId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
    const sampleContent = `
    Samsung Galaxy S24 Ultra - Product Information
    
    Key Features:
    - 6.8-inch Dynamic AMOLED 2X display
    - 200MP main camera with 5x optical zoom
    - S Pen included for productivity
    
    Pricing:
    - Starting at $1,299
    - Financing available at $54.13/month
    
    This is a test document for RAG processing.
    `;
    
    console.log('📄 Testing with valid ObjectId format...');
    const result = await ragService.processCampaignDocument(
      testCampaignId,
      Buffer.from(sampleContent),
      'pdf'
    );
    
    console.log('📊 Processing Result:', result);
    
    if (result.success) {
      console.log('✅ ObjectId fix test PASSED');
      
      // Test context retrieval
      console.log('\n🔍 Testing context retrieval...');
      const context = await ragService.retrieveContext(testCampaignId, 'What is the price?', 2);
      
      if (context.length > 0) {
        console.log(`✅ Context retrieval successful: ${context.length} chunks found`);
        console.log(`🏆 Top score: ${context[0].score.toFixed(3)}`);
      } else {
        console.log('⚠️ No context found');
      }
    } else {
      console.log('❌ ObjectId fix test FAILED');
    }
    
    // Cleanup
    console.log('\n🧹 Cleanup');
    ragService.clearProcessingStatus(testCampaignId);
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testRAGFix(); 
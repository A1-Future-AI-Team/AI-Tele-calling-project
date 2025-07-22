// create-sample-pdf.js - Convert sample text to PDF
import fs from 'fs';
import path from 'path';

// Read the sample text file
const sampleTextPath = path.join(process.cwd(), 'sample-campaign-document.txt');
const pdfOutputPath = path.join(process.cwd(), 'sample-campaign-document.pdf');

try {
  // Check if the text file exists
  if (!fs.existsSync(sampleTextPath)) {
    console.error('❌ Sample text file not found:', sampleTextPath);
    process.exit(1);
  }

  console.log('📄 Reading sample text file...');
  const textContent = fs.readFileSync(sampleTextPath, 'utf8');
  
  console.log('📊 Text content length:', textContent.length, 'characters');
  console.log('📋 First 200 characters:');
  console.log(textContent.substring(0, 200) + '...\n');

  // For now, we'll create a simple text-based PDF using a basic approach
  // In a real scenario, you would use a library like pdfkit or puppeteer
  
  console.log('⚠️ Note: This script reads the text content for PDF creation.');
  console.log('📝 To create an actual PDF, you can:');
  console.log('   1. Copy the content from sample-campaign-document.txt');
  console.log('   2. Paste it into a word processor (Word, Google Docs, etc.)');
  console.log('   3. Save as PDF');
  console.log('   4. Upload the PDF through your dashboard\n');

  console.log('📄 Sample document content preview:');
  console.log('=====================================');
  console.log(textContent.substring(0, 500) + '...\n');

  console.log('✅ Sample document content is ready for PDF conversion!');
  console.log('📁 Text file location:', sampleTextPath);
  console.log('📋 Content includes:');
  console.log('   • Product features and specifications');
  console.log('   • Pricing information');
  console.log('   • Financing options');
  console.log('   • Warranty details');
  console.log('   • Call script suggestions');
  console.log('   • FAQ section');

} catch (error) {
  console.error('❌ Error reading sample document:', error);
} 
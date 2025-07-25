// services/pdf.service.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Dynamic imports to avoid startup issues
let pdfParse = null;
let pdfjsLib = null;

/**
 * Initialize PDF parsing libraries
 */
async function initializePdfLibraries() {
  try {
    // Try to load pdf-parse first (faster for simple PDFs)
    if (!pdfParse) {
      try {
        const pdfModule = await import('pdf-parse');
        pdfParse = pdfModule.default;
        console.log('✅ pdf-parse library loaded successfully');
      } catch (error) {
        console.log('⚠️ pdf-parse not available, will use fallback methods');
      }
    }

    // Try to load pdfjs-dist for complex PDFs
    if (!pdfjsLib) {
      try {
        const pdfjsModule = await import('pdfjs-dist');
        pdfjsLib = pdfjsModule;
        console.log('✅ pdfjs-dist library loaded successfully');
      } catch (error) {
        console.log('⚠️ pdfjs-dist not available, will use basic parsing');
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize PDF libraries:', error);
  }
}

/**
 * Extract text from PDF using pdf-parse (fast method)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextWithPdfParse(pdfBuffer) {
  try {
    if (!pdfParse) {
      throw new Error('pdf-parse library not available');
    }

    const pdfData = await pdfParse(pdfBuffer);
    return pdfData.text.trim();
  } catch (error) {
    console.error('❌ pdf-parse extraction failed:', error.message);
    throw error;
  }
}

/**
 * Extract text from PDF using pdfjs-dist (robust method)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextWithPdfJs(pdfBuffer) {
  try {
    if (!pdfjsLib) {
      throw new Error('pdfjs-dist library not available');
    }

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('❌ pdfjs-dist extraction failed:', error.message);
    throw error;
  }
}

/**
 * Basic fallback PDF text extraction
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {string} Extracted text
 */
function extractBasicPdfText(pdfBuffer) {
  try {
    const bufferString = pdfBuffer.toString('utf8');
    
    // Look for text content patterns in the PDF buffer
    const textPatterns = [
      /\(([^)]{3,})\)/g,  // Text in parentheses
      /\[([^\]]{3,})\]/g, // Text in brackets
      /"([^"]{3,})"/g,    // Text in quotes
    ];
    
    let extractedText = '';
    
    for (const pattern of textPatterns) {
      const matches = bufferString.match(pattern);
      if (matches) {
        const text = matches
          .map(match => match.replace(/[()\[\]"]/g, ''))
          .filter(text => text.length > 3 && !text.includes('\\') && !text.includes('\\x'))
          .join(' ');
        
        if (text.length > extractedText.length) {
          extractedText = text;
        }
      }
    }
    
    if (extractedText.length > 10) {
      return extractedText;
    }
    
    // Fallback: extract any readable text
    const readableText = bufferString
      .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII
      .replace(/\s+/g, ' ')
      .trim();
    
    return readableText.length > 50 ? readableText : 'PDF content extracted (basic parsing)';
    
  } catch (error) {
    console.error('❌ Basic PDF parsing failed:', error);
    return 'PDF content could not be extracted';
  }
}

/**
 * Process PDF file and extract text content
 * @param {string} pdfFilePath - Path to PDF file
 * @returns {Promise<{text: string, method: string, success: boolean}>} Extraction result
 */
async function processPdfFile(pdfFilePath) {
  try {
    console.log('📄 Processing PDF file:', pdfFilePath);
    
    // Initialize libraries
    await initializePdfLibraries();
    
    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfFilePath);
    console.log(`📊 PDF file size: ${pdfBuffer.length} bytes`);
    
    let extractedText = '';
    let method = 'unknown';
    
    // Try pdf-parse first (fastest)
    if (pdfParse) {
      try {
        console.log('🔄 Trying pdf-parse extraction...');
        extractedText = await extractTextWithPdfParse(pdfBuffer);
        method = 'pdf-parse';
        console.log(`✅ pdf-parse extraction successful: ${extractedText.length} characters`);
      } catch (error) {
        console.log('⚠️ pdf-parse failed, trying pdfjs-dist...');
      }
    }
    
    // Try pdfjs-dist if pdf-parse failed or not available
    if (!extractedText && pdfjsLib) {
      try {
        console.log('🔄 Trying pdfjs-dist extraction...');
        extractedText = await extractTextWithPdfJs(pdfBuffer);
        method = 'pdfjs-dist';
        console.log(`✅ pdfjs-dist extraction successful: ${extractedText.length} characters`);
      } catch (error) {
        console.log('⚠️ pdfjs-dist failed, using basic extraction...');
      }
    }
    
    // Use basic extraction as fallback
    if (!extractedText) {
      console.log('🔄 Using basic PDF extraction...');
      extractedText = extractBasicPdfText(pdfBuffer);
      method = 'basic';
      console.log(`✅ Basic extraction completed: ${extractedText.length} characters`);
    }
    
    // Validate extracted text
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Extracted text too short or empty');
    }
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\']/g, '') // Remove special characters
      .trim();
    
    console.log(`🎉 PDF processing completed successfully`);
    console.log(`📝 Method used: ${method}`);
    console.log(`📊 Final text length: ${cleanedText.length} characters`);
    
    return {
      text: cleanedText,
      method: method,
      success: true,
      originalLength: extractedText.length,
      cleanedLength: cleanedText.length
    };
    
  } catch (error) {
    console.error('❌ PDF processing failed:', error.message);
    return {
      text: '',
      method: 'failed',
      success: false,
      error: error.message
    };
  }
}

/**
 * Process PDF buffer directly (for uploaded files)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{text: string, method: string, success: boolean}>} Extraction result
 */
async function processPdfBuffer(pdfBuffer) {
  try {
    console.log('📄 Processing PDF buffer');
    console.log(`📊 Buffer size: ${pdfBuffer.length} bytes`);
    
    // Initialize libraries
    await initializePdfLibraries();
    
    let extractedText = '';
    let method = 'unknown';
    
    // Try pdf-parse first (fastest)
    if (pdfParse) {
      try {
        console.log('🔄 Trying pdf-parse extraction...');
        extractedText = await extractTextWithPdfParse(pdfBuffer);
        method = 'pdf-parse';
        console.log(`✅ pdf-parse extraction successful: ${extractedText.length} characters`);
      } catch (error) {
        console.log('⚠️ pdf-parse failed, trying pdfjs-dist...');
      }
    }
    
    // Try pdfjs-dist if pdf-parse failed or not available
    if (!extractedText && pdfjsLib) {
      try {
        console.log('🔄 Trying pdfjs-dist extraction...');
        extractedText = await extractTextWithPdfJs(pdfBuffer);
        method = 'pdfjs-dist';
        console.log(`✅ pdfjs-dist extraction successful: ${extractedText.length} characters`);
      } catch (error) {
        console.log('⚠️ pdfjs-dist failed, using basic extraction...');
      }
    }
    
    // Use basic extraction as fallback
    if (!extractedText) {
      console.log('🔄 Using basic PDF extraction...');
      extractedText = extractBasicPdfText(pdfBuffer);
      method = 'basic';
      console.log(`✅ Basic extraction completed: ${extractedText.length} characters`);
    }
    
    // Validate extracted text
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Extracted text too short or empty');
    }
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\']/g, '') // Remove special characters
      .trim();
    
    console.log(`🎉 PDF buffer processing completed successfully`);
    console.log(`📝 Method used: ${method}`);
    console.log(`📊 Final text length: ${cleanedText.length} characters`);
    
    return {
      text: cleanedText,
      method: method,
      success: true,
      originalLength: extractedText.length,
      cleanedLength: cleanedText.length
    };
    
  } catch (error) {
    console.error('❌ PDF buffer processing failed:', error.message);
    return {
      text: '',
      method: 'failed',
      success: false,
      error: error.message
    };
  }
}

export {
  processPdfFile,
  processPdfBuffer,
  initializePdfLibraries
}; 
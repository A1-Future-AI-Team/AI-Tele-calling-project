/**
 * TTS + Twilio Integration Test Script
 * 
 * This script demonstrates the complete integration between:
 * - Reverie TTS API for voice generation
 * - Twilio API for making phone calls
 * - Audio file management and serving
 * 
 * HOW TO RUN:
 * 1. Make sure all environment variables are set in .env:
 *    - REVERIE_API_KEY=your_reverie_api_key
 *    - REVERIE_APP_ID=your_reverie_app_id
 *    - TWILIO_ACCOUNT_SID=your_twilio_account_sid
 *    - TWILIO_AUTH_TOKEN=your_twilio_auth_token
 *    - TWILIO_PHONE_NUMBER=your_twilio_phone_number
 *    - BASE_URL=your_ngrok_or_domain_url (for webhooks)
 * 
 * 2. Start the backend server:
 *    npm run dev
 * 
 * 3. Run this test script:
 *    node testCalling.js
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Loads environment variables
 * 2. Calls TwilioService.makeCall() with a test phone number
 * 3. TwilioService generates TTS audio using Reverie API
 * 4. Saves the audio file to /public/audio/tts_timestamp.mp3
 * 5. Initiates a Twilio call with webhook pointing to the audio
 * 6. Twilio calls the webhook /api/twilio/play-tts which plays the audio
 * 7. Logs the complete call flow and results
 * 
 * EXPECTED FLOW:
 * TTS Generation → Audio File Saved → Twilio Call → Webhook → Audio Playback
 * 
 * AUDIO FILES:
 * Audio files are PRESERVED and not automatically deleted
 * Files are saved in /public/audio/ with names like tts_timestamp.mp3 or revup_timestamp.mp3
 * You can manually clean up old files by calling TwilioService.cleanupOldAudioFiles(hours)
 */

import dotenv from 'dotenv';
dotenv.config();
import TwilioService from './services/twilio.service.js';
import ttsService from './services/tts.service.js';
import axios from 'axios';

// Test configuration
const TEST_PHONE_NUMBER = '+919531670207'; // Replace with your test number
const TEST_CAMPAIGN_ID = 'test-campaign-reverie-tts';
const TEST_MESSAGE = 'नमस्ते, यह Reverie और Twilio का टेस्ट कॉल है। आपका स्वागत है।';
const TEST_LANGUAGE = 'Hindi';

/**
 * Test if audio files are accessible via HTTP
 */
async function testAudioAccessibility() {
    try {
        console.log('🧪 Testing audio generation and accessibility...');
        
        // Generate a test audio file
        const result = await ttsService.generateTTSAudio('Hello, this is a test message.', 'hi', 'female');
        const audioUrl = result.audioUrl;
        console.log(`🎵 Generated test audio: ${audioUrl}`);
        
        // Test if the audio file is accessible via HTTP
        const response = await axios.get(audioUrl, {
            timeout: 5000,
            validateStatus: (status) => status < 500 // Accept any status < 500
        });
        
        console.log(`✅ Audio file accessible! Status: ${response.status}, Size: ${response.data.length || 'unknown'} bytes`);
        return true;
        
    } catch (error) {
        console.error('❌ Audio accessibility test failed:', error.message);
        if (error.response) {
            console.error(`HTTP Status: ${error.response.status}`);
        }
        return false;
    }
}

async function runTTSTest() {
    console.log('🚀 Starting TTS + Twilio Integration Test...');
    console.log('='.repeat(60));
    
    try {
        // Test audio accessibility first
        const audioAccessible = await testAudioAccessibility();
        if (!audioAccessible) {
            console.error('❌ Audio accessibility test failed. Aborting call test.');
            return;
        }
        
        console.log('');
        
        // Check if TwilioService is properly configured
        if (!TwilioService.isConfigured()) {
            console.error('❌ TwilioService is not properly configured!');
            console.error('Please check your environment variables:');
            console.error('- TWILIO_ACCOUNT_SID');
            console.error('- TWILIO_AUTH_TOKEN');
            console.error('- TWILIO_PHONE_NUMBER');
            process.exit(1);
        }
        
        console.log('✅ TwilioService is properly configured');
        console.log(`📞 Test phone number: ${TEST_PHONE_NUMBER}`);
        console.log(`🎵 Test message: "${TEST_MESSAGE}"`);
        console.log(`🌍 Test language: ${TEST_LANGUAGE}`);
        console.log('');
        
        // Make the test call
        console.log('📞 Initiating test call...');
        const result = await TwilioService.makeCall(
            TEST_PHONE_NUMBER, 
            TEST_CAMPAIGN_ID, 
            TEST_MESSAGE, 
            TEST_LANGUAGE
        );
        
        console.log('');
        console.log('📊 Call Result:');
        console.log('-'.repeat(40));
        
        if (result.success) {
            console.log('✅ Call initiated successfully!');
            console.log(`📞 Call SID: ${result.callSid}`);
            console.log(`📞 From: ${result.from}`);
            console.log(`📞 To: ${result.to}`);
            console.log(`📞 Status: ${result.status}`);
            console.log(`🎵 Audio URL: ${result.audioUrl}`);
            console.log(`🔗 Webhook URL: ${result.webhookUrl}`);
            console.log(`📅 Date Created: ${result.dateCreated}`);
            
            console.log('');
            console.log('🎯 Next Steps:');
            console.log('1. Check your phone for the incoming call');
            console.log('2. Answer the call to hear the TTS audio');
            console.log('3. Check the console for webhook logs');
            console.log('4. Audio files are preserved for later use/analysis');
            
        } else {
            console.log('❌ Call failed!');
            console.log(`❌ Error: ${result.error}`);
            console.log(`📞 To: ${result.to}`);
            console.log(`📞 Campaign ID: ${result.campaignId}`);
        }
        
        console.log('');
        console.log('='.repeat(60));
        console.log('🏁 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('❌ Stack trace:', error.stack);
        process.exit(1);
    }
}

// Additional test function to manually clean up old audio files (OPTIONAL)
async function manualCleanupTest() {
    console.log('🧹 Manual cleanup test - cleaning files older than 0 hours (all files)...');
    TwilioService.cleanupOldAudioFiles(0); // Clean up all files for testing
    console.log('✅ Manual cleanup completed');
}

// Run the test
runTTSTest().catch(console.error);

// Uncomment the line below ONLY if you want to test manual cleanup functionality
// manualCleanupTest().catch(console.error);
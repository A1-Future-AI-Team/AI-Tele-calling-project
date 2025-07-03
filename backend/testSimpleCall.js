import dotenv from 'dotenv';
dotenv.config();
import TwilioService from './services/twilio.service.js';

// Test with a known working audio file
const TEST_PHONE_NUMBER = '+919531670207';

async function testSimpleAudio() {
    try {
        console.log('🧪 Testing simple audio playback...');
        
        const client = TwilioService.getClient();
        
        if (!client) {
            console.error('❌ Twilio client not available');
            return;
        }
        
        // Create a call with a simple webhook that plays a known audio file
        const call = await client.calls.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: TEST_PHONE_NUMBER,
            url: `${process.env.BASE_URL}/api/twilio/test-simple-audio?audioUrl=${encodeURIComponent('https://www.soundjay.com/misc/sounds/bell-ringing-05.wav')}`, // Known working audio
            method: 'POST'
        });
        
        console.log(`✅ Simple audio test call initiated: ${call.sid}`);
        console.log('📞 Answer the call to test if ANY audio playback works');
        
    } catch (error) {
        console.error('❌ Simple audio test failed:', error.message);
    }
}

testSimpleAudio(); 
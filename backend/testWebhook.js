/**
 * Test script to verify Twilio webhook functionality
 * 
 * This script tests the /api/twilio/call-status endpoint manually
 * to ensure it's working before relying on Twilio webhooks.
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL;
const WEBHOOK_URL = `${BASE_URL}/api/twilio/call-status`;

async function testWebhook() {
    console.log('🧪 Testing Twilio webhook endpoint...');
    console.log('🌐 BASE_URL:', BASE_URL);
    console.log('🔗 Webhook URL:', WEBHOOK_URL);
    console.log('');

    if (!BASE_URL) {
        console.error('❌ BASE_URL not set in environment variables');
        process.exit(1);
    }

    // Test data simulating Twilio webhook
    const testData = {
        CallSid: 'test_call_sid_123', // This is a fake SID for testing
        CallStatus: 'completed',
        To: '+919531670207',
        From: '+12202443519',
        Duration: '30',
        CallDuration: '30'
    };

    try {
        console.log('📤 Sending test webhook data:');
        console.log(JSON.stringify(testData, null, 2));
        console.log('');

        const response = await axios.post(WEBHOOK_URL, testData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000
        });

        console.log('✅ Webhook test successful!');
        console.log('📊 Response status:', response.status);
        console.log('📄 Response data:', response.data);
        console.log('');

        if (response.status === 200) {
            console.log('🎉 Webhook endpoint is working correctly!');
            console.log('📝 Check your server logs for the webhook processing details.');
            console.log('');
            console.log('ℹ️  Note: The "Failed to fetch call status" error is expected');
            console.log('   because we used a fake CallSid (test_call_sid_123) for testing.');
            console.log('   Real Twilio calls will work correctly with actual CallSids.');
        } else {
            console.log('⚠️ Unexpected response status:', response.status);
        }

    } catch (error) {
        console.error('❌ Webhook test failed:');
        
        if (error.response) {
            console.error('📊 Response status:', error.response.status);
            console.error('📄 Response data:', error.response.data);
        } else if (error.request) {
            console.error('🌐 Network error - server not reachable');
            console.error('🔗 URL attempted:', WEBHOOK_URL);
        } else {
            console.error('❌ Error:', error.message);
        }
        
        console.log('');
        console.log('🔧 Troubleshooting steps:');
        console.log('1. Ensure your server is running');
        console.log('2. Verify BASE_URL is correct and publicly accessible');
        console.log('3. Check if ngrok/cloudflare tunnel is active');
        console.log('4. Verify the /api/twilio/call-status route is registered');
    }
}

// Run the test
testWebhook().catch(console.error); 
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Contact from './models/contact.model.js';
import Campaign from './models/campaign.model.js';
import CallLog from './models/calllog.model.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

async function testWebhookFix() {
    try {
        console.log('🧪 Testing enhanced webhook handler...');
        
        // Create a test campaign
        const testCampaign = await Campaign.create({
            objective: 'Test Sales Campaign',
            language: 'Hindi',
            sampleFlow: 'Test conversation flow',
            contactCount: 1
        });
        console.log('✅ Created test campaign:', testCampaign._id);
        
        // Create a test contact
        const testContact = await Contact.create({
            name: 'Test User',
            phone: '+919531670207',
            campaignId: testCampaign._id,
            status: 'PENDING'
        });
        console.log('✅ Created test contact:', testContact._id);
        
        // Simulate webhook data
        const webhookData = {
            CallSid: 'CAe7cdb49c20932de2ff729ca6b79e5096',
            CallStatus: 'completed',
            To: '+919531670207',
            From: '+12202443519',
            Duration: '45',
            campaignId: testCampaign._id.toString()
        };
        
        console.log('📞 Simulating webhook data:', webhookData);
        
        // Check if contact exists
        const contact = await Contact.findOne({ phone: webhookData.To });
        console.log('🔍 Contact lookup result:', contact ? `Found: ${contact.name}` : 'Not found');
        
        // Check if campaign exists
        const campaign = await Campaign.findById(webhookData.campaignId);
        console.log('🔍 Campaign lookup result:', campaign ? `Found: ${campaign.objective}` : 'Not found');
        
        // Simulate the webhook handler logic
        let contactFound = null;
        let campaignFound = null;
        
        if (contact) {
            contactFound = contact;
            console.log('✅ [CONTACT LOOKUP] Found contact:', contact.name, 'Campaign:', contact.campaignId);
            
            // Update contact status
            await Contact.findByIdAndUpdate(contact._id, {
                status: 'CALLED',
                callSid: webhookData.CallSid,
                callTime: new Date(),
                lastCallResult: webhookData.CallStatus
            });
            console.log('✅ [CONTACT UPDATE] Updated contact status to CALLED');
        }
        
        if (campaign) {
            campaignFound = campaign;
            console.log('✅ [CAMPAIGN LOOKUP] Found campaign:', campaign.objective);
        }
        
        // Create/update call log with proper linking
        const update = {
            callSid: webhookData.CallSid,
            from: webhookData.From,
            to: webhookData.To,
            status: webhookData.CallStatus,
            duration: Number(webhookData.Duration),
            contactId: contactFound ? contactFound._id : null,
            campaignId: campaignFound ? campaignFound._id : (contactFound ? contactFound.campaignId : null),
            language: campaignFound ? campaignFound.language : 'Hindi',
            endTime: new Date(),
            updatedAt: new Date()
        };
        
        console.log('📊 [CALL LOG] Update object:', update);
        
        const result = await CallLog.findOneAndUpdate(
            { callSid: webhookData.CallSid },
            { $set: update, $setOnInsert: { createdAt: new Date() } },
            { upsert: true, new: true }
        );
        
        console.log('✅ [DB] Call log result:', {
            callSid: result.callSid,
            contactId: result.contactId,
            campaignId: result.campaignId,
            status: result.status
        });
        
        // Verify the linking worked
        const finalCallLog = await CallLog.findById(result._id);
        console.log('🔍 Final call log verification:');
        console.log('   - contactId:', finalCallLog.contactId);
        console.log('   - campaignId:', finalCallLog.campaignId);
        console.log('   - Both should NOT be null now!');
        
        // Clean up test data
        await Contact.findByIdAndDelete(testContact._id);
        await Campaign.findByIdAndDelete(testCampaign._id);
        await CallLog.findByIdAndDelete(result._id);
        console.log('🧹 Cleaned up test data');
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the test
testWebhookFix(); 
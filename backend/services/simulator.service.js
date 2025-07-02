import Contact from '../models/contact.model.js';

class SimulatorService {
    /**
     * Simulate calls for all contacts in a campaign
     * @param {string} campaignId - The campaign ID to simulate calls for
     */
    async simulateCalls(campaignId) {
        try {
            console.log(`🚀 Starting call simulation for campaign: ${campaignId}`);

            // Fetch all contacts for the campaign
            const contacts = await Contact.find({ campaignId });
            
            if (contacts.length === 0) {
                console.log('⚠️ No contacts found for the campaign');
                return;
            }

            console.log(`📞 Found ${contacts.length} contacts to call`);

            // Simulate calls for each contact
            const callPromises = contacts.map((contact, index) => 
                this.simulateIndividualCall(contact, index)
            );

            // Wait for all calls to complete
            await Promise.all(callPromises);

            console.log(`✅ Call simulation completed for campaign: ${campaignId}`);

        } catch (error) {
            console.error('❌ Error in call simulation:', error);
            throw error;
        }
    }

    /**
     * Simulate an individual call to a contact
     * @param {Object} contact - The contact to call
     * @param {number} index - Index for logging purposes
     */
    async simulateIndividualCall(contact, index) {
        return new Promise((resolve) => {
            console.log(`📞 [${index + 1}] Simulating call to ${contact.phone} (${contact.name})`);
            
            const startTime = new Date();

            // Simulate call delay (2 seconds)
            setTimeout(async () => {
                try {
                    const endTime = new Date();
                    const duration = 2; // 2 seconds

                    // Randomly determine call success (80% success rate)
                    const isSuccess = Math.random() < 0.8;
                    const status = isSuccess ? 'SUCCESS' : 'FAILED';

                    // Update contact in database
                    await Contact.findByIdAndUpdate(
                        contact._id,
                        {
                            status: status,
                            startTime: startTime,
                            endTime: endTime,
                            duration: duration
                        },
                        { new: true }
                    );

                    // Log the result
                    const statusEmoji = isSuccess ? '✅' : '❌';
                    console.log(
                        `${statusEmoji} [${index + 1}] Call to ${contact.phone} (${contact.name}): ${status} - Duration: ${duration}s`
                    );

                    resolve();

                } catch (error) {
                    console.error(`❌ Error updating contact ${contact.phone}:`, error);
                    resolve(); // Still resolve to not break Promise.all
                }
            }, 2000);
        });
    }

    /**
     * Get call statistics for a campaign
     * @param {string} campaignId - The campaign ID
     * @returns {Object} Statistics object
     */
    async getCallStatistics(campaignId) {
        try {
            const totalContacts = await Contact.countDocuments({ campaignId });
            const successfulCalls = await Contact.countDocuments({ 
                campaignId, 
                status: 'SUCCESS' 
            });
            const failedCalls = await Contact.countDocuments({ 
                campaignId, 
                status: 'FAILED' 
            });
            const pendingCalls = await Contact.countDocuments({ 
                campaignId, 
                status: 'PENDING' 
            });

            const successRate = totalContacts > 0 ? (successfulCalls / totalContacts * 100).toFixed(1) : 0;

            return {
                totalContacts,
                successfulCalls,
                failedCalls,
                pendingCalls,
                successRate: parseFloat(successRate)
            };

        } catch (error) {
            console.error('❌ Error getting call statistics:', error);
            throw error;
        }
    }
}

export default new SimulatorService(); 
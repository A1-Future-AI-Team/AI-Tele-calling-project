import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class TwilioService {
    constructor() {
        // Initialize Twilio client with environment variables
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        console.log(this.twilioPhoneNumber);
        console.log(this.accountSid);
        console.log(this.authToken);

        // Validate required environment variables
        if (!this.accountSid || !this.authToken) {
            console.warn('⚠️ Twilio credentials not found in environment variables');
            console.warn('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
            this.client = null;
        } else {
            // Initialize Twilio client
            try {
                this.client = twilio(this.accountSid, this.authToken);
                console.log('📞 Twilio client initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Twilio client:', error);
                this.client = null;
            }
        }
    }

    /**
     * Make a call to a contact for a specific campaign
     * @param {string} to - Phone number to call
     * @param {string} campaignId - Campaign ID for reference
     * @returns {Promise} Call result
     */
    async makeCall(to, campaignId) {
        try {
            console.log(`📞 Making call to ${to} for campaign ${campaignId}`);
            
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }

            if (!this.twilioPhoneNumber) {
                throw new Error('TWILIO_PHONE_NUMBER not set in environment variables');
            }

            // Create the voice call using Twilio API
            const call = await this.client.calls.create({
                from: this.twilioPhoneNumber,
                to: to,
                url: `https://phrase-scheme-chair-festivals.trycloudflare.com/api/twilio/voice-response?campaignId=${campaignId}`
            });

            // Log successful call initiation
            console.log(`📞 Call initiated to ${to}: SID ${call.sid}`);
            
            return {
                success: true,
                callSid: call.sid,
                to: to,
                from: this.twilioPhoneNumber,
                campaignId: campaignId,
                status: call.status,
                dateCreated: call.dateCreated
            };

        } catch (error) {
            // Log the error with proper formatting
            console.error(`❌ Failed to call ${to}: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                to: to,
                campaignId: campaignId
            };
        }
    }

    /**
     * Get Twilio client instance
     * @returns {Object} Twilio client
     */
    getClient() {
        return this.client;
    }

    /**
     * Check if Twilio service is properly configured
     * @returns {boolean} Configuration status
     */
    isConfigured() {
        return this.client !== null && this.twilioPhoneNumber !== undefined;
    }

    /**
     * Get account information
     * @returns {Promise} Account details
     */
    async getAccountInfo() {
        try {
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }

            const account = await this.client.api.accounts(this.accountSid).fetch();
            return {
                accountSid: account.sid,
                friendlyName: account.friendlyName,
                status: account.status,
                type: account.type
            };

        } catch (error) {
            console.error('❌ Error fetching account info:', error);
            throw error;
        }
    }
}

// Export singleton instance
export default new TwilioService(); 
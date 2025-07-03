import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import Campaign from '../models/campaign.model.js';
import Contact from '../models/contact.model.js';
import simulatorService from '../services/simulator.service.js';
import twilioService from '../services/twilio.service.js';

class CampaignController {
    /**
     * Start a new telecalling campaign
     * POST /api/campaign/start
     */
    async startCampaign(req, res) {
        try {
            const { language, objective, sampleFlow } = req.body;
            
            // Validate required fields
            if (!language || !objective) {
                return res.status(400).json({
                    success: false,
                    message: 'Language and objective are required'
                });
            }

            // Check if CSV file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is required'
                });
            }

            const csvFilePath = req.file.path;
            const contacts = [];

            try {
                // Parse CSV file
                await new Promise((resolve, reject) => {
                    fs.createReadStream(csvFilePath)
                        .pipe(csv())
                        .on('data', (row) => {
                            // Extract phone and name from CSV row
                            const phone = row.phone || row.Phone || row.PHONE;
                            const name = row.name || row.Name || row.NAME || 'Unknown';

                            if (phone) {
                                contacts.push({
                                    name: name.trim(),
                                    phone: phone.trim()
                                });
                            }
                        })
                        .on('end', () => {
                            console.log(`✅ CSV parsing completed. Found ${contacts.length} contacts.`);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error('❌ CSV parsing error:', error);
                            reject(error);
                        });
                });

                // Delete the temporary CSV file
                fs.unlinkSync(csvFilePath);
                console.log('🗑️ Temporary CSV file deleted');

                // Validate that we have contacts
                if (contacts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No valid contacts found in CSV file'
                    });
                }

                // Create new campaign
                const campaign = new Campaign({
                    language,
                    objective,
                    sampleFlow: sampleFlow || '',
                    contactCount: contacts.length,
                    createdAt: new Date()
                });

                const savedCampaign = await campaign.save();
                console.log(`📋 Campaign created with ID: ${savedCampaign._id}`);

                // Create contact documents
                const contactDocuments = contacts.map(contact => ({
                    name: contact.name,
                    phone: contact.phone,
                    campaignId: savedCampaign._id,
                    status: 'PENDING'
                }));

                // Bulk insert contacts
                const savedContacts = await Contact.insertMany(contactDocuments);
                console.log(`👥 ${savedContacts.length} contacts saved to database`);

                // Start REAL Twilio calls in the background
                console.log(`📞 Starting REAL Twilio calls for campaign: ${savedCampaign._id}`);
                makeRealCalls(savedCampaign._id, savedCampaign.language, savedCampaign.objective, savedCampaign.sampleFlow).catch(error => {
                    console.error('❌ Real call error:', error);
                });

                // Return success response
                return res.status(201).json({
                    success: true,
                    message: 'Campaign created successfully',
                    campaignId: savedCampaign._id,
                    totalContacts: contacts.length
                });

            } catch (parseError) {
                // Delete the temporary file if parsing fails
                if (fs.existsSync(csvFilePath)) {
                    fs.unlinkSync(csvFilePath);
                }
                throw parseError;
            }

        } catch (error) {
            console.error('❌ Campaign creation error:', error);
            
            // Clean up file if it still exists
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to create campaign',
                error: error.message
            });
        }
    }

    /**
     * Get all campaigns
     * GET /api/campaign/list
     */
    async getCampaigns(req, res) {
        try {
            const campaigns = await Campaign.find()
                .sort({ createdAt: -1 })
                .select('language objective contactCount createdAt updatedAt');

            return res.status(200).json({
                success: true,
                data: campaigns,
                total: campaigns.length
            });

        } catch (error) {
            console.error('❌ Get campaigns error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch campaigns',
                error: error.message
            });
        }
    }

    /**
     * Get campaign by ID
     * GET /api/campaign/:id
     */
    async getCampaignById(req, res) {
        try {
            const { id } = req.params;

            const campaign = await Campaign.findById(id);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: campaign
            });

        } catch (error) {
            console.error('❌ Get campaign by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign',
                error: error.message
            });
        }
    }

    /**
     * Get campaign statistics
     * GET /api/campaign/:id/stats
     */
    async getCampaignStats(req, res) {
        try {
            const { id } = req.params;

            // Check if campaign exists
            const campaign = await Campaign.findById(id);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            // Get call statistics
            const stats = await simulatorService.getCallStatistics(id);

            return res.status(200).json({
                success: true,
                data: {
                    campaignId: id,
                    campaignObjective: campaign.objective,
                    campaignLanguage: campaign.language,
                    ...stats
                }
            });

        } catch (error) {
            console.error('❌ Get campaign stats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign statistics',
                error: error.message
            });
        }
    }
}

/**
 * Make real Twilio calls to all contacts in a campaign (standalone function)
 * @param {string} campaignId - Campaign ID
 * @param {string} language - Campaign language
 * @param {string} objective - Campaign objective  
 * @param {string} sampleFlow - Campaign sample flow
 */
async function makeRealCalls(campaignId, language, objective, sampleFlow) {
        try {
            console.log(`📞 Starting real calls for campaign: ${campaignId}`);
            
            // Get all contacts for this campaign
            const contacts = await Contact.find({ 
                campaignId: campaignId, 
                status: 'PENDING' 
            });
            
            if (contacts.length === 0) {
                console.log('⚠️ No pending contacts found for campaign');
                return;
            }
            
            console.log(`📞 Found ${contacts.length} contacts to call`);
            console.log(`📋 Campaign will use: Language=${language}, Objective=${objective}`);
            
            // Make calls to each contact with delay between calls
            // Each call will use the voice-response endpoint with proper campaign context
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                
                try {
                    console.log(`📞 [${i + 1}/${contacts.length}] Calling ${contact.phone} (${contact.name})...`);
                    
                    // Update contact status to CALLING
                    await Contact.findByIdAndUpdate(contact._id, { 
                        status: 'CALLING',
                        callStartTime: new Date()
                    });
                    
                    // Make real Twilio call using campaign-based voice response
                    const callResult = await twilioService.makeCallLegacy(
                        contact.phone,
                        campaignId
                    );
                    
                    if (callResult.success) {
                        console.log(`✅ [${i + 1}] Call initiated to ${contact.phone} - SID: ${callResult.callSid}`);
                        
                        // Update contact with call details
                        await Contact.findByIdAndUpdate(contact._id, {
                            status: 'CALLED',
                            callSid: callResult.callSid,
                            callTime: new Date(),
                            lastCallResult: 'SUCCESS'
                        });
                        
                    } else {
                        console.error(`❌ [${i + 1}] Call failed to ${contact.phone}: ${callResult.error}`);
                        
                        // Update contact with error
                        await Contact.findByIdAndUpdate(contact._id, {
                            status: 'FAILED',
                            lastCallResult: 'FAILED',
                            errorMessage: callResult.error
                        });
                    }
                    
                } catch (contactError) {
                    console.error(`❌ Error calling ${contact.phone}:`, contactError.message);
                    
                    // Update contact with error
                    await Contact.findByIdAndUpdate(contact._id, {
                        status: 'FAILED',
                        lastCallResult: 'ERROR',
                        errorMessage: contactError.message
                    });
                }
                
                // Add delay between calls to avoid rate limiting (2 seconds)
                if (i < contacts.length - 1) {
                    console.log('⏳ Waiting 2 seconds before next call...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            console.log(`✅ Real calling completed for campaign: ${campaignId}`);
            
        } catch (error) {
            console.error('❌ Error in makeRealCalls:', error);
            throw error;
        }
}

export default new CampaignController(); 
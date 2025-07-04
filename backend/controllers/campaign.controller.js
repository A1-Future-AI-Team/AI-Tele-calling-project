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

    /**
     * Get real-time campaign status with live call monitoring
     * GET /api/campaign/:id/live-status
     */
    async getCampaignLiveStatus(req, res) {
        try {
            console.log('📊 [LIVE STATUS] Request received for campaign:', req.params.id);
            const { id } = req.params;

            // Check if campaign exists
            const campaign = await Campaign.findById(id);
            if (!campaign) {
                console.log('❌ [LIVE STATUS] Campaign not found:', id);
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            console.log('✅ [LIVE STATUS] Campaign found:', campaign._id, 'Objective:', campaign.objective);

            // Get all contacts for this campaign with their call status
            const contacts = await Contact.find({ campaignId: id });
            console.log(`📞 [LIVE STATUS] Found ${contacts.length} contacts for campaign ${id}`);
            
            // Get call logs for this campaign
            const CallLog = (await import('../models/calllog.model.js')).default;
            const callLogs = await CallLog.find({ campaignId: id }).sort({ createdAt: -1 });
            console.log(`📋 [LIVE STATUS] Found ${callLogs.length} call logs for campaign ${id}`);

            // Get real-time status for each call
            const twilioService = (await import('../services/twilio.service.js')).default;
            console.log('🔄 [LIVE STATUS] Fetching real-time status for contacts...');
            
            const contactsWithLiveStatus = await Promise.all(contacts.map(async (contact) => {
                let liveStatus = contact.status;
                let callLog = null;
                
                // Find the most recent call log for this contact
                if (contact.callSid) {
                    callLog = callLogs.find(log => log.callSid === contact.callSid);
                    console.log(`📞 [LIVE STATUS] Contact ${contact.name} (${contact.phone}) has callSid: ${contact.callSid}`);
                    
                    // Get real-time status from Twilio if we have a callSid
                    try {
                        const realStatus = await twilioService.getCallStatus(contact.callSid);
                        liveStatus = realStatus;
                        console.log(`✅ [LIVE STATUS] Contact ${contact.name} real-time status: ${realStatus} (was: ${contact.status})`);
                    } catch (error) {
                        console.log(`⚠️ [LIVE STATUS] Could not fetch real-time status for ${contact.callSid}: ${error.message}`);
                    }
                } else {
                    console.log(`📞 [LIVE STATUS] Contact ${contact.name} (${contact.phone}) - no callSid, using status: ${contact.status}`);
                }

                return {
                    _id: contact._id,
                    name: contact.name,
                    phone: contact.phone,
                    status: contact.status,
                    liveStatus: liveStatus,
                    callSid: contact.callSid,
                    callTime: contact.callTime,
                    lastCallResult: contact.lastCallResult,
                    errorMessage: contact.errorMessage,
                    callLog: callLog
                };
            }));

            // Calculate real-time statistics
            const totalContacts = contacts.length;
            const calledContacts = contacts.filter(c => c.status === 'CALLED').length;
            const failedContacts = contacts.filter(c => c.status === 'FAILED').length;
            const pendingContacts = contacts.filter(c => c.status === 'PENDING').length;
            const callingContacts = contacts.filter(c => c.status === 'CALLING').length;

            // Get live call status counts
            const liveStats = {
                completed: contactsWithLiveStatus.filter(c => c.liveStatus === 'completed').length,
                in_progress: contactsWithLiveStatus.filter(c => c.liveStatus === 'in-progress').length,
                ringing: contactsWithLiveStatus.filter(c => c.liveStatus === 'ringing').length,
                failed: contactsWithLiveStatus.filter(c => c.liveStatus === 'failed').length,
                busy: contactsWithLiveStatus.filter(c => c.liveStatus === 'busy').length,
                no_answer: contactsWithLiveStatus.filter(c => c.liveStatus === 'no-answer').length
            };

            console.log('📊 [LIVE STATUS] Campaign statistics:');
            console.log(`   📞 Total contacts: ${totalContacts}`);
            console.log(`   ✅ Called: ${calledContacts}`);
            console.log(`   ❌ Failed: ${failedContacts}`);
            console.log(`   ⏳ Pending: ${pendingContacts}`);
            console.log(`   📞 Calling: ${callingContacts}`);

            console.log('📊 [LIVE STATUS] Real-time Twilio status:');
            console.log(`   ✅ Completed: ${liveStats.completed}`);
            console.log(`   📞 In Progress: ${liveStats.in_progress}`);
            console.log(`   🔔 Ringing: ${liveStats.ringing}`);
            console.log(`   ❌ Failed: ${liveStats.failed}`);
            console.log(`   📵 Busy: ${liveStats.busy}`);
            console.log(`   📴 No Answer: ${liveStats.no_answer}`);

            console.log('✅ [LIVE STATUS] Sending response for campaign:', id);

            return res.status(200).json({
                success: true,
                data: {
                    campaignId: id,
                    campaignObjective: campaign.objective,
                    campaignLanguage: campaign.language,
                    totalContacts,
                    calledContacts,
                    failedContacts,
                    pendingContacts,
                    callingContacts,
                    liveStats,
                    contacts: contactsWithLiveStatus,
                    recentCallLogs: callLogs.slice(0, 10) // Last 10 call logs
                }
            });

        } catch (error) {
            console.error('❌ [LIVE STATUS] Get campaign live status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign live status',
                error: error.message
            });
        }
    }

    /**
     * Get real-time call status by callSid
     * GET /api/campaign/call-status/:callSid
     */
    async getCallStatus(req, res) {
        try {
            console.log('📞 [CALL STATUS] Request received for callSid:', req.params.callSid);
            const { callSid } = req.params;

            if (!callSid) {
                console.log('❌ [CALL STATUS] No callSid provided');
                return res.status(400).json({
                    success: false,
                    message: 'CallSid is required'
                });
            }

            console.log('🔄 [CALL STATUS] Fetching real-time status from Twilio for:', callSid);

            // Get real-time status from Twilio
            const twilioService = (await import('../services/twilio.service.js')).default;
            const status = await twilioService.getCallStatus(callSid);
            console.log('✅ [CALL STATUS] Twilio status for', callSid, ':', status);

            // Get call log from database
            const CallLog = (await import('../models/calllog.model.js')).default;
            const callLog = await CallLog.findOne({ callSid });
            
            if (callLog) {
                console.log('📋 [CALL STATUS] Found call log for', callSid, 'Contact:', callLog.contactId);
            } else {
                console.log('⚠️ [CALL STATUS] No call log found for', callSid);
            }

            console.log('✅ [CALL STATUS] Sending response for callSid:', callSid);

            return res.status(200).json({
                success: true,
                data: {
                    callSid,
                    twilioStatus: status,
                    databaseLog: callLog
                }
            });

        } catch (error) {
            console.error('❌ [CALL STATUS] Get call status error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch call status',
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
        
            
        } catch (error) {
            console.error('❌ Error in makeRealCalls:', error);
            throw error;
        }
}

export default new CampaignController(); 
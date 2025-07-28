import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import Campaign from '../models/campaign.model.js';
import Contact from '../models/contact.model.js';
import simulatorService from '../services/simulator.service.js';
import twilioService from '../services/twilio.service.js';
import ragService from '../services/rag.service.js';

// PDF processing is now handled by the dedicated pdf.service.js

class CampaignController {
    /**
     * Start a new telecalling campaign
     * POST /api/campaign/start
     */
    async startCampaign(req, res) {
        try {
            console.log('🚀 Campaign creation started');
            console.log('📋 Request body:', req.body);
            console.log('📁 Request files:', req.files ? Object.keys(req.files) : 'No files');
            
            const { language, objective, sampleFlow } = req.body;
            
            // Validate required fields
            if (!language || !objective) {
                return res.status(400).json({
                    success: false,
                    message: 'Language and objective are required'
                });
            }

            // Check if CSV file was uploaded
            if (!req.files || !req.files.csv) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is required'
                });
            }

            const csvFilePath = req.files.csv[0].path;
            console.log('📄 CSV file details:');
            console.log('   Path:', req.files.csv[0].path);
            console.log('   Name:', req.files.csv[0].originalname);
            console.log('   Size:', req.files.csv[0].size, 'bytes');
            
            const contacts = [];
            let campaignDocData = null;

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
                            console.log(`✅ CSV parsed: ${contacts.length} contacts found`);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error('❌ CSV parsing error:', error);
                            reject(error);
                        });
                });

                // Delete the temporary CSV file
                fs.unlinkSync(csvFilePath);

                // Validate that we have contacts
                if (contacts.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No valid contacts found in CSV file'
                    });
                }

                // Initialize campaign document data with proper structure
                let campaignDocData = {
                    originalName: null,
                    extractedText: null,
                    processingMethod: null,
                    ragChunks: 0,
                    ragSuccessCount: 0
                };
                
                const campaign = new Campaign({
                    language,
                    objective,
                    sampleFlow: sampleFlow || '',
                    contactCount: contacts.length,
                    campaignDoc: campaignDocData,
                    createdAt: new Date()
                });

                const savedCampaign = await campaign.save();
                console.log(`📋 Campaign created: ${savedCampaign._id}`);

                // Process PDF file if uploaded (AFTER campaign is saved)
                console.log('🔍 Checking for PDF file upload...');
                console.log('📁 req.files:', req.files ? Object.keys(req.files) : 'No files');
                console.log('📁 req.files details:', req.files ? JSON.stringify(req.files, null, 2) : 'No files');
                
                if (req.files && req.files.pdf && req.files.pdf.length > 0) {
                    console.log('📄 PDF file found!');
                    console.log('📄 PDF file details:');
                    console.log('   Path:', req.files.pdf[0].path);
                    console.log('   Name:', req.files.pdf[0].originalname);
                    console.log('   Size:', req.files.pdf[0].size, 'bytes');
                    console.log('   MIME Type:', req.files.pdf[0].mimetype);
                    console.log('   Field Name:', req.files.pdf[0].fieldname);
                    
                    try {
                        console.log('📄 Processing PDF file...');
                        console.log('📁 PDF file path:', req.files.pdf[0].path);
                        console.log('📁 PDF file name:', req.files.pdf[0].originalname);
                        console.log('📁 PDF file size:', req.files.pdf[0].size, 'bytes');
                        
                        // Check if file exists
                        if (!fs.existsSync(req.files.pdf[0].path)) {
                            throw new Error(`PDF file not found at path: ${req.files.pdf[0].path}`);
                        }
                        
                        const pdfFilePath = req.files.pdf[0].path;
                        const pdfBuffer = fs.readFileSync(pdfFilePath);
                        console.log('📊 PDF buffer size:', pdfBuffer.length, 'bytes');
                        
                        // Check if buffer is valid
                        if (pdfBuffer.length === 0) {
                            throw new Error('PDF file is empty');
                        }
                        
                        // Use memory-only RAG service for PDF processing
                        console.log(`🔍 Processing PDF for campaign ID: ${savedCampaign._id} (type: ${typeof savedCampaign._id})`);
                        const ragResult = await ragService.processCampaignDocument(
                            savedCampaign._id, 
                            pdfBuffer, 
                            'pdf'
                        );
                        
                        if (ragResult.success) {
                            console.log(`✅ Memory RAG processing completed successfully`);
                            console.log(`📊 Total chunks created: ${ragResult.chunks}`);
                            console.log(`📝 Processing method: ${ragResult.method}`);
                            console.log(`📄 Extracted text length: ${ragResult.textLength} characters`);
                            
                            // Update campaign with RAG information
                            await Campaign.findByIdAndUpdate(savedCampaign._id, {
                                campaignDoc: {
                                    originalName: req.files.pdf[0].originalname,
                                    extractedText: ragResult.extractedText || 'PDF processed successfully',
                                    processingMethod: ragResult.method,
                                    ragChunks: ragResult.chunks,
                                    ragSuccessCount: ragResult.successCount
                                }
                            });
                            
                            console.log('✅ Campaign updated with Memory RAG information');
                        } else {
                            console.log('⚠️ Memory RAG processing failed');
                            console.log('📋 RAG result:', ragResult);
                        }
                        
                        // Delete the temporary PDF file
                        fs.unlinkSync(pdfFilePath);
                        
                    } catch (pdfError) {
                        console.error('❌ PDF processing error:', pdfError);
                        console.error('❌ PDF error stack:', pdfError.stack);
                        
                        // Delete the temporary PDF file if it exists
                        if (req.files.pdf && fs.existsSync(req.files.pdf[0].path)) {
                            fs.unlinkSync(req.files.pdf[0].path);
                        }
                        
                        // Continue without PDF data
                        console.log('⚠️ Continuing without PDF data due to processing error');
                    }
                } else {
                    console.log('⚠️ No PDF file uploaded for this campaign');
                    console.log('📁 Available files:', req.files ? Object.keys(req.files) : 'None');
                }

                // Create contact documents
                const contactDocuments = contacts.map(contact => ({
                    name: contact.name,
                    phone: contact.phone,
                    campaignId: savedCampaign._id,
                    status: 'PENDING'
                }));

                // Bulk insert contacts
                const savedContacts = await Contact.insertMany(contactDocuments);
                console.log(`👥 ${savedContacts.length} contacts saved`);

                // Start REAL Twilio calls in the background
                console.log(`📞 Starting calls for campaign: ${savedCampaign._id}`);
                makeRealCalls(savedCampaign._id, savedCampaign.language, savedCampaign.objective, savedCampaign.sampleFlow).catch(error => {
                    console.error('❌ Real call error:', error);
                });

                // Get RAG processing status
                const ragStatus = ragService.getProcessingStatus(savedCampaign._id);
                
                // Return success response with Memory RAG information
                return res.status(201).json({
                    success: true,
                    message: 'Campaign created successfully',
                    campaignId: savedCampaign._id,
                    totalContacts: contacts.length,
                    pdfProcessed: !!campaignDocData,
                    pdfTextLength: campaignDocData && campaignDocData.extractedText ? campaignDocData.extractedText.length : 0,
                    ragEnabled: true,
                    ragStatus: ragStatus.status,
                    ragChunks: ragStatus.chunks || 0,
                    ragMethod: ragStatus.method || 'memory-only'
                });

            } catch (parseError) {
                // Delete the temporary files if parsing fails
                if (fs.existsSync(csvFilePath)) {
                    fs.unlinkSync(csvFilePath);
                }
                if (req.files.pdf && fs.existsSync(req.files.pdf[0].path)) {
                    fs.unlinkSync(req.files.pdf[0].path);
                }
                throw parseError;
            }

        } catch (error) {
            console.error('❌ Campaign creation error:', error);
            
            // Clean up files if they still exist
            if (req.files) {
                if (req.files.csv && fs.existsSync(req.files.csv[0].path)) {
                    fs.unlinkSync(req.files.csv[0].path);
                }
                if (req.files.pdf && fs.existsSync(req.files.pdf[0].path)) {
                    fs.unlinkSync(req.files.pdf[0].path);
                }
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
            
            // Get RAG statistics
            const ragStatus = ragService.getProcessingStatus(id);
            const ragStats = ragService.getRAGStats();

            return res.status(200).json({
                success: true,
                data: {
                    campaignId: id,
                    campaignObjective: campaign.objective,
                    campaignLanguage: campaign.language,
                    ragEnabled: true,
                    ragStatus: ragStatus.status,
                    ragChunks: ragStatus.chunks || 0,
                    ragMethod: ragStatus.method || 'none',
                    ragProcessingTime: ragStatus.endTime && ragStatus.startTime 
                        ? Math.round((ragStatus.endTime - ragStatus.startTime) / 1000)
                        : null,
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
        const Contact = (await import('../models/contact.model.js')).default;
        const contacts = await Contact.find({ campaignId: campaignId, status: 'PENDING' });
        
        if (contacts.length === 0) {
            console.log('⚠️ No pending contacts found for campaign:', campaignId);
            return;
        }
        
        console.log(`📞 Found ${contacts.length} pending contacts for campaign: ${campaignId}`);
        
        // Make calls to each contact
        const twilioService = (await import('../services/twilio.service.js')).default;
        
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            console.log(`📞 [${i + 1}/${contacts.length}] Calling ${contact.name} (${contact.phone})`);
            
            try {
                const result = await twilioService.makeCallLegacy(contact.phone, campaignId);
                
                if (result.success) {
                    console.log(`✅ [${i + 1}/${contacts.length}] Call initiated successfully to ${contact.phone}`);
                    
                    // Update contact status
                    contact.status = 'CALLING';
                    contact.callSid = result.callSid;
                    await contact.save();
                } else {
                    console.log(`❌ [${i + 1}/${contacts.length}] Failed to call ${contact.phone}: ${result.error}`);
                    
                    // Update contact status
                    contact.status = 'FAILED';
                    contact.errorMessage = result.error;
                    await contact.save();
                }
                
                // Add delay between calls to avoid overwhelming Twilio
                if (i < contacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }
                
            } catch (error) {
                console.error(`❌ [${i + 1}/${contacts.length}] Error calling ${contact.phone}:`, error.message);
                
                // Update contact status
                contact.status = 'FAILED';
                contact.errorMessage = error.message;
                await contact.save();
            }
        }
        
        console.log(`✅ Completed real calls for campaign: ${campaignId}`);
        
    } catch (error) {
        console.error('❌ Error in makeRealCalls:', error);
    }
}

export default CampaignController;
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import Campaign from '../models/campaign.model.js';
import Contact from '../models/contact.model.js';
import simulatorService from '../services/simulator.service.js';

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

                // Start call simulation in the background
                console.log(`🎯 Starting call simulation for campaign: ${savedCampaign._id}`);
                simulatorService.simulateCalls(savedCampaign._id).catch(error => {
                    console.error('❌ Call simulation error:', error);
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

export default new CampaignController(); 
import twilio from 'twilio';
import Campaign from '../models/campaign.model.js';
import Contact from '../models/contact.model.js';
import { generateReply } from '../services/llm.service.js';
import ttsService from '../services/tts.service.js';
import {
  getConversationHistory,
  saveMessage,
  resetConversation
} from '../utils/conversationMemory.js';
import CallLog from '../models/calllog.model.js';

class TwilioController {
    constructor() {
        // User behavior tracking for dynamic timeout adjustment
        this.userBehavior = new Map(); // callSid -> behavior object
    }

    // Track user behavior and calculate optimal timeout
    trackUserBehavior(callSid, recordingDuration, wordCount, wasCutOff = false) {
        if (!this.userBehavior.has(callSid)) {
            this.userBehavior.set(callSid, {
                shortResponses: 0,    // User gets cut off frequently
                longResponses: 0,     // User talks for full duration
                optimalResponses: 0,  // User completes thoughts naturally
                totalCalls: 0
            });
        }

        const behavior = this.userBehavior.get(callSid);
        behavior.totalCalls++;

        // Categorize user response pattern
        if (wasCutOff || (wordCount < 3 && recordingDuration < 2)) {
            behavior.shortResponses++;
            console.log(`📊 User behavior: Short response detected (${wordCount} words, ${recordingDuration}s)`);
        } else if (recordingDuration >= 9) { // Close to maxLength
            behavior.longResponses++;
            console.log(`📊 User behavior: Long response detected (${wordCount} words, ${recordingDuration}s)`);
        } else {
            behavior.optimalResponses++;
            console.log(`📊 User behavior: Optimal response (${wordCount} words, ${recordingDuration}s)`);
        }

        console.log(`📊 Behavior stats for ${callSid}:`, behavior);
    }

    // Calculate optimal timeout based on user behavior
    getOptimalTimeout(callSid, language = 'English') {
        const behavior = this.userBehavior.get(callSid);
        
        if (!behavior || behavior.totalCalls < 2) {
            return 2; // Default timeout for new users
        }

        let timeout;
        if (behavior.shortResponses > 2) {
            timeout = 4; // User needs more time to complete thoughts
            console.log(`⏱️ Increasing timeout to ${timeout}s - user frequently gets cut off`);
        } else if (behavior.longResponses > 2) {
            timeout = 1.5; // User talks too much, need shorter timeout
            console.log(`⏱️ Decreasing timeout to ${timeout}s - user tends to talk too long`);
        } else {
            timeout = 2; // Optimal timeout
            console.log(`⏱️ Using optimal timeout of ${timeout}s`);
        }

        return timeout;
    }

    // Get user feedback message based on behavior
    getUserFeedbackMessage(recordingDuration, wordCount, language = 'English') {
        const wasTooShort = wordCount < 3 && recordingDuration < 2;
        const wasTooLong = recordingDuration >= 9;

        if (wasTooShort) {
            switch (language) {
                case 'Hindi':
                    return 'कृपया जारी रखें, मैं सुन रहा हूँ...';
                case 'Bengali':
                    return 'দয়া করে চালিয়ে যান, আমি শুনছি...';
                default:
                    return 'Please continue, I\'m listening...';
            }
        } else if (wasTooLong) {
            switch (language) {
                case 'Hindi':
                    return 'आपकी विस्तृत जानकारी के लिए धन्यवाद। मैं आपकी मदद करूंगा।';
                case 'Bengali':
                    return 'আপনার বিস্তারিত উত্তর দেওয়ার জন্য ধন্যবাদ। আমি আপনাকে সাহায্য করব।';
                default:
                    return 'Thank you for that detailed response. Let me help you with that.';
            }
        }
        return null; // No feedback needed
    }

    // Reset user behavior after successful conversation
    resetUserBehavior(callSid) {
        this.userBehavior.delete(callSid);
        console.log(`🔄 Reset behavior tracking for call: ${callSid}`);
    }

    /**
     * Handle TTS audio playback webhook
     */
    async playTTS(req, res) {
        try {
            console.log('🎵 TTS Play webhook received');
            console.log('Query params:', req.query);
            // console.log('Request body:', req.body);
            
            const { audioUrl } = req.query;
            console.log(`🔗 Received audioUrl: ${audioUrl}`);
            
            // Create a new TwiML voice response
            const twiml = new twilio.twiml.VoiceResponse();
            
            if (!audioUrl) {
                console.log('⚠️ No audio URL provided');
                twiml.say({
                    voice: 'alice',
                    language: 'en-IN'
                }, 'Hello! This is a test call from TeleCall AI. Audio URL not provided.');
                    } else {
            console.log(`🎵 Playing audio from: ${audioUrl}`);
            console.log(`🔗 Raw audioUrl: "${audioUrl}"`);
            console.log(`🔗 audioUrl type: ${typeof audioUrl}`);
            console.log(`🔗 audioUrl length: ${audioUrl.length}`);
            
            // Decode the URL if it's encoded
            const decodedAudioUrl = decodeURIComponent(audioUrl);
            console.log(`🔗 Decoded audio URL: "${decodedAudioUrl}"`);
            console.log(`🔗 URLs match: ${audioUrl === decodedAudioUrl}`);
            
            // Test if the audio URL is accessible with comprehensive logging
            try {
                console.log(`🧪 Testing audio URL accessibility...`);
                const testResponse = await fetch(decodedAudioUrl, { method: 'HEAD' });
                
                console.log('📊 FULL RESPONSE DETAILS:');
                console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);
                console.log(`   OK: ${testResponse.ok}`);
                console.log(`   URL: ${testResponse.url}`);
                
                console.log('📋 ALL RESPONSE HEADERS:');
                for (const [key, value] of testResponse.headers.entries()) {
                    console.log(`   ${key}: ${value}`);
                }
                
                const contentType = testResponse.headers.get('content-type');
                const contentLength = testResponse.headers.get('content-length');
                const acceptRanges = testResponse.headers.get('accept-ranges');
                const cacheControl = testResponse.headers.get('cache-control');
                
                console.log('🎵 AUDIO FILE ANALYSIS:');
                console.log(`   Content-Type: ${contentType}`);
                console.log(`   Content-Length: ${contentLength} bytes`);
                console.log(`   Accept-Ranges: ${acceptRanges}`);
                console.log(`   Cache-Control: ${cacheControl}`);
                console.log(`   Size check: ${contentLength && parseInt(contentLength) > 0 ? '✅ File not empty' : '❌ File might be empty'}`);
                console.log(`   MIME type check: ${contentType && (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3') || contentType.includes('audio/wav')) ? '✅ Valid audio type' : '❌ Invalid/missing audio type'}`);
                
                if (testResponse.status === 200) {
                    console.log('✅ Audio URL is accessible - adding to TwiML');
                    
                    console.log('🎵 Playing ONLY Reverie TTS audio (no test sounds)...');
                    twiml.play(decodedAudioUrl);
                    
                    console.log('✅ Reverie TTS audio added to TwiML');
                    
                    // Add recording capability for dynamic AI conversation
                    console.log('🎤 Adding recording capability for user response...');
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: 2,
                        playBeep: false,
                        trim: 'do-not-trim'
                    });
                    
                    console.log('✅ Recording capability added to TwiML');
                } else {
                    console.error(`❌ Audio URL returned status ${testResponse.status}`);
                    console.error('📄 Response details:', {
                        status: testResponse.status,
                        statusText: testResponse.statusText,
                        headers: Object.fromEntries(testResponse.headers.entries())
                    });
                    
                    twiml.say({
                        voice: 'alice',
                        language: 'en-IN'
                    }, 'Sorry, the audio file could not be loaded.');
                }
            } catch (fetchError) {
                console.error(`❌ Audio URL fetch failed:`, {
                    message: fetchError.message,
                    stack: fetchError.stack,
                    name: fetchError.name
                });
                
                // Try to provide more specific error info
                if (fetchError.code) {
                    console.error(`   Error code: ${fetchError.code}`);
                }
                if (fetchError.errno) {
                    console.error(`   Error number: ${fetchError.errno}`);
                }
                
                twiml.say({
                    voice: 'alice',
                    language: 'en-IN'
                }, 'Sorry, there was an error accessing the audio file.');
            }
            
            // Add a brief follow-up message
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Thank you for listening.');
        }
            
            const twimlResponse = twiml.toString();
            console.log('📄 Generated TwiML response:');
            console.log(twimlResponse);
            
            // Set response content type to XML and send TwiML
            res.type('text/xml');
            res.send(twimlResponse);
            
            console.log('✅ TTS TwiML response sent successfully');
            
        } catch (error) {
            console.error('❌ Error in TTS play webhook:', error);
            
            // Send fallback TwiML response
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Sorry, there was an error processing your call. Please try again later.');
            
            res.type('text/xml');
            res.send(twiml.toString());
        }
    }

    /**
     * Handle call status updates
     */
    async handleCallStatus(req, res) {
        try {
            // Enhanced debug logging
            console.log('🔍 DEBUG: handleCallStatus called');
            console.log('🔍 DEBUG: Request method:', req.method);
            console.log('🔍 DEBUG: Request URL:', req.url);
            console.log('🔍 DEBUG: Request headers:', req.headers);
            console.log('📞 Webhook HIT - handleCallStatus');
            console.log('🧾 req.body:', req.body);
            
            const { CallSid, CallStatus, To, From, Duration, CallDuration } = req.body;
            console.log(`📞 Call ${CallSid} status: ${CallStatus}`);
            console.log(`📞 From: ${From}, To: ${To}`);
            if (Duration) {
                console.log(`📞 Call duration: ${Duration} seconds`);
            }
            
            let dbAction = null;
            let dbError = null;
            let dbResult = null;
            let contactFound = null;
            let campaignFound = null;
            
            // STEP 1: Find campaign context FIRST (this is the source of truth)
            let campaignId = null;
            
            try {
                // Priority order for campaignId:
                // 1. Query params (from webhook URL when call was initiated)
                // 2. Request body
                // 3. Fallback to contact lookup (but this is unreliable for duplicate phone numbers)
                
                if (req.query.campaignId) {
                    campaignId = req.query.campaignId;
                    console.log('✅ [CAMPAIGN LOOKUP] Using campaignId from query params:', campaignId);
                } else if (req.body.campaignId) {
                    campaignId = req.body.campaignId;
                    console.log('✅ [CAMPAIGN LOOKUP] Using campaignId from request body:', campaignId);
                }
                
                if (campaignId) {
                    const campaign = await Campaign.findById(campaignId);
                    if (campaign) {
                        campaignFound = campaign;
                        console.log('✅ [CAMPAIGN LOOKUP] Found campaign:', campaign.objective);
                    } else {
                        console.log('⚠️ [CAMPAIGN LOOKUP] Campaign not found for ID:', campaignId);
                    }
                } else {
                    console.log('⚠️ [CAMPAIGN LOOKUP] No campaignId found in webhook');
                }
            } catch (campaignErr) {
                console.error('❌ [CAMPAIGN LOOKUP] Error finding campaign:', campaignErr);
            }
            
            // STEP 2: Find the correct contact using BOTH phone number AND campaignId
            
            try {
                console.log('🔍 [CONTACT LOOKUP] Looking for contact with phone:', To, 'and campaignId:', campaignId);
                
                let contact = null;
                
                if (campaignId) {
                    // CRITICAL FIX: Find contact by BOTH phone number AND campaignId
                    // This prevents the bug where same phone number in different campaigns gets mixed up
                    contact = await Contact.findOne({ 
                        phone: To, 
                        campaignId: campaignId 
                    });
                    
                    if (contact) {
                        console.log('✅ [CONTACT LOOKUP] Found contact by phone + campaignId:', contact.name, 'Campaign:', contact.campaignId);
                    } else {
                        console.log('⚠️ [CONTACT LOOKUP] No contact found for phone + campaignId combination');
                    }
                } else {
                    // Fallback: if no campaignId in webhook, try to find by phone only
                    // This is less reliable but maintains backward compatibility
                    contact = await Contact.findOne({ phone: To });
                    
                    if (contact) {
                        console.log('⚠️ [CONTACT LOOKUP] Found contact by phone only (fallback):', contact.name, 'Campaign:', contact.campaignId);
                        // Use this contact's campaignId as fallback
                        if (!campaignId && contact.campaignId) {
                            campaignId = contact.campaignId;
                            console.log('🔄 [CAMPAIGN LOOKUP] Using fallback campaignId from contact:', campaignId);
                        }
                    } else {
                        console.log('⚠️ [CONTACT LOOKUP] No contact found for phone:', To);
                    }
                }
                
                if (contact) {
                    contactFound = contact;
                    
                    // Update contact status based on call status
                    let contactStatus = 'PENDING';
                    switch (CallStatus) {
                        case 'initiated':
                        case 'ringing':
                            contactStatus = 'CALLING';
                            break;
                        case 'in-progress':
                        case 'answered':
                            contactStatus = 'CALLING';
                            break;
                        case 'completed':
                            contactStatus = 'CALLED';
                            break;
                        case 'failed':
                        case 'busy':
                        case 'no-answer':
                            contactStatus = 'FAILED';
                            break;
                    }
                    
                    // Update contact with call details and status
                    await Contact.findByIdAndUpdate(contact._id, {
                        status: contactStatus,
                        callSid: CallSid,
                        callTime: new Date(),
                        lastCallResult: CallStatus,
                        errorMessage: (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') ? `Call ${CallStatus}` : null
                    });
                    
                    console.log('✅ [CONTACT UPDATE] Updated contact status to:', contactStatus);
                }
            } catch (contactErr) {
                console.error('❌ [CONTACT LOOKUP] Error finding/updating contact:', contactErr);
            }
            
            // STEP 3: Update or create call log with proper linking
            try {
                const filter = { callSid: CallSid };
                
                // Build comprehensive update object
                const update = {
                    callSid: CallSid,
                    from: From,
                    to: To,
                    status: CallStatus,
                    duration: Duration ? Number(Duration) : (CallDuration ? Number(CallDuration) : 0),
                    contactId: contactFound ? contactFound._id : null,
                    campaignId: campaignFound ? campaignFound._id : (contactFound ? contactFound.campaignId : null),
                    language: campaignFound ? campaignFound.language : (contactFound ? 'Hindi' : 'Hindi'),
                    endTime: (CallStatus === 'completed' && (Duration || CallDuration)) ? new Date() : undefined,
                    updatedAt: new Date()
                };
                
                // Remove undefined values
                Object.keys(update).forEach(key => update[key] === undefined && delete update[key]);
                
                console.log('📊 [CALL LOG] Update object:', update);
                
                const result = await CallLog.findOneAndUpdate(
                    filter,
                    { $set: update, $setOnInsert: { createdAt: new Date() } },
                    { upsert: true, new: true }
                );
                
                dbResult = result;
                if (result) {
                    if (result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
                        dbAction = 'created';
                        console.log('✅ [DB] New call log created with proper linking:', {
                            callSid: result.callSid,
                            contactId: result.contactId,
                            campaignId: result.campaignId,
                            status: result.status
                        });
                    } else {
                        dbAction = 'updated';
                        console.log('✅ [DB] Existing call log updated with proper linking:', {
                            callSid: result.callSid,
                            contactId: result.contactId,
                            campaignId: result.campaignId,
                            status: result.status
                        });
                    }
                } else {
                    dbAction = 'none';
                    console.log('⚠️ [DB] No call log found or updated for:', CallSid);
                }
            } catch (err) {
                dbError = err;
                console.error('❌ [DB] Error while saving/updating call log:', err);
            }
            
            // STEP 4: Fetch and print real-time status from Twilio
            console.log('➡️ About to fetch real status...');
            try {
                const twilioService = (await import('../services/twilio.service.js')).default;
                const realStatus = await twilioService.getCallStatus(CallSid);
                console.log(`📞 [Twilio API] Real-time status for ${CallSid}: ${realStatus}`);
            } catch (err) {
                console.error('❌ Failed to fetch call status:', err.message);
            }
            
            // STEP 5: Handle different call statuses
            switch (CallStatus) {
                case 'initiated':
                    console.log('📞 Call initiated');
                    break;
                case 'ringing':
                    console.log('📞 Call ringing');
                    break;
                case 'in-progress':
                    console.log('📞 Call in progress');
                    break;
                case 'answered':
                    console.log('📞 Call answered');
                    break;
                case 'completed':
                    console.log('📞 Call completed');
                    try {
                        console.log('🧹 Automatic cleanup: Deleting recent audio files...');
                        await this.cleanupRecentAudioFiles(CallSid);
                        console.log('✅ Audio files cleaned up successfully');
                    } catch (cleanupError) {
                        console.error('❌ Error during automatic cleanup:', cleanupError.message);
                    }
                    break;
                case 'failed':
                    console.log('📞 Call failed');
                    break;
                case 'busy':
                    console.log('📞 Call busy');
                    break;
                case 'no-answer':
                    console.log('📞 Call no answer');
                    break;
                default:
                    console.log(`📞 Unknown call status: ${CallStatus}`);
            }
            
            // STEP 6: Summary log
            console.log(`📋 [Summary] CallSid: ${CallSid}, Status: ${CallStatus}, DB Action: ${dbAction}, DB Error: ${dbError ? dbError.message : 'none'}`);
            console.log(`📋 [Summary] Contact: ${contactFound ? contactFound.name : 'Not found'}, Campaign: ${campaignFound ? campaignFound.objective : 'Not found'}`);
            
            res.status(200).send('OK');
        } catch (error) {
            console.error('❌ Error in call status webhook:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    /**
     * Clean up recent audio files (called after call completion)
     * This method deletes audio files that were likely used in the recent call
     * @param {string} callSid - The Twilio call SID for logging purposes
     */
    async cleanupRecentAudioFiles(callSid) {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        try {
            console.log(`🧹 Starting cleanup for call ${callSid}...`);
            const audioDir = path.join(__dirname, '..', 'public', 'audio');
            
            if (!fs.existsSync(audioDir)) {
                console.log('📁 No audio directory found, nothing to clean');
                return;
            }
            
            const files = fs.readdirSync(audioDir);
            let deletedCount = 0;
            
            files.forEach(file => {
                if (file.startsWith('reverie_') && file.endsWith('.wav')) {
                    const filePath = path.join(audioDir, file);
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`🗑️ Deleted file: ${file}`);
                }
            });
            
            console.log(`📊 Cleanup summary for call ${callSid}: ${deletedCount} deleted`);
        } catch (error) {
            console.error('❌ Error during audio file cleanup:', error.message);
            throw error;
        }
    }

    /**
     * Simple test webhook for audio playback
     */
    async testSimpleAudio(req, res) {
        try {
            console.log('🧪 Simple audio test webhook received');
            
            const twiml = new twilio.twiml.VoiceResponse();
            
            // Test with a publicly available audio file first
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Testing audio playback. Please wait.');
            
            // Get the most recent audio file from our directory
            const audioUrl = req.query.audioUrl;
            if (audioUrl) {
                console.log(`🎵 Testing audio playback with: ${audioUrl}`);
                twiml.play(audioUrl);
            }
            
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Audio test completed.');
            
            const twimlResponse = twiml.toString();
            console.log('📄 Simple test TwiML response:');
            console.log(twimlResponse);
            
            res.type('text/xml');
            res.send(twimlResponse);
            
            console.log('✅ Simple test TwiML response sent');
            
        } catch (error) {
            console.error('❌ Error in simple test webhook:', error);
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say('Error in audio test.');
            res.type('text/xml');
            res.send(twiml.toString());
        }
    }

    /**
     * Campaign-based voice response handler with AI generation
     */
    async voiceResponse(req, res) {
        try {
            console.log('📞 Received Twilio voice response request');
            console.log('Query params:', req.query);
            const { campaignId, CallSid } = req.query;
            const twiml = new twilio.twiml.VoiceResponse();
            if (!campaignId) {
                console.log('⚠️ No campaign ID provided');
                twiml.say({ voice: 'alice', language: 'en-IN' }, 'Hello! This is a call from TeleCall AI. Campaign not specified.');
                res.type('text/xml');
                return res.send(twiml.toString());
            }
            // Fetch campaign by campaignId
            console.log(`🔍 Fetching campaign: ${campaignId}`);
            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                console.log(`❌ Campaign not found: ${campaignId}`);
                twiml.say({ voice: 'alice', language: 'en-IN' }, 'Campaign not found. Please contact support.');
                res.type('text/xml');
                return res.send(twiml.toString());
            }
            console.log(`✅ Campaign found: ${campaign._id}`);
            const { language, objective, sampleFlow } = campaign;
            console.log(`📋 Campaign Language: ${language}`);
            console.log(`🎯 Campaign Objective: ${objective}`);
            console.log(`📝 Campaign Sample Flow: ${sampleFlow || 'Not provided'}`);
            // Use callSid+campaignId as the only memory key for initial message (if CallSid is available)
            const memoryKey = { callSid: CallSid || 'init', campaignId };
            console.log(`🧠 Using memory key: ${(CallSid || 'init')}::${campaignId}`);
            try {
                // --- FIX: Generate a real AI greeting using LLM ---
                const systemPrompt = `
You are a professional telecaller. Your job is: ${objective}
Greet the customer, introduce yourself, and start a natural sales conversation about the Tata Safari.
Be concise, polite, and context-aware. Do NOT just repeat the objective—act like a real agent.
`;
                const { generateReply } = await import('../services/llm.service.js');
                const aiReply = await generateReply({
                  objective,
                  language,
                  sampleFlow,
                  conversationHistory: [], // No history for the first message
                  userInput: 'Start the call', // Use a generic, non-empty input
                  systemPrompt
                });
                // --- END FIX ---
                
                // Save the initial AI message to memory for this call/campaign
                saveMessage({ ...memoryKey, role: 'assistant', content: aiReply });
                
                // Save initial AI greeting to transcript
                console.log('💾 Saving initial AI greeting to transcript...');
                const Transcript = (await import('../models/transcript.model.js')).default;
                const Contact = (await import('../models/contact.model.js')).default;
                
                // Find the contact for this call
                let contact = null;
                if (CallSid) {
                    // Try to find contact by phone number from the call
                    const callLog = await CallLog.findOne({ callSid: CallSid });
                    if (callLog && callLog.to) {
                        contact = await Contact.findOne({ phone: callLog.to });
                    }
                }
                
                // Find or create transcript for this specific contact and campaign
                let transcript = null;
                if (contact) {
                    transcript = await Transcript.findOne({ 
                        contactId: contact._id, 
                        campaignId: campaignId 
                    });
                }
                
                if (!transcript) {
                    transcript = new Transcript({ 
                        contactId: contact?._id,
                        campaignId: campaignId, 
                        entries: [] 
                    });
                }
                
                // Add initial AI greeting to transcript
                transcript.entries.push({
                    from: 'ai',
                    text: aiReply,
                    timestamp: new Date()
                });
                
                await transcript.save();
                console.log('✅ Initial AI greeting saved to transcript');
                
                // Update contact with transcript ID if we have a contact
                if (contact && transcript._id) {
                    await Contact.findByIdAndUpdate(contact._id, {
                        transcriptId: transcript._id.toString()
                    });
                    console.log('✅ Contact updated with transcript ID:', transcript._id);
                }
                const speakerMapping = this.mapLanguageToSpeaker(language, 'female');
                console.log(`🗣️ Selected Speaker ID: ${speakerMapping}`);
                const [langCode, genderCode] = speakerMapping.split('_');
                const ttsResult = await ttsService.generateTTSAudio(aiReply, langCode, genderCode, 1.0, 1.0);
                const audioUrl = ttsResult.audioUrl;
                console.log(`🔗 Generated TTS Audio URL: ${audioUrl}`);
                if (audioUrl) {
                    console.log('🎵 Adding TTS audio to TwiML...');
                    twiml.play(audioUrl);
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: 2,
                        playBeep: false,
                        trim: 'do-not-trim'
                    });
                    console.log('✅ Campaign-based AI response added to TwiML');
                } else {
                    throw new Error('Failed to generate TTS audio');
                }
            } catch (aiError) {
                console.error('❌ Error in AI/TTS generation:', aiError.message);
                const fallbackText = objective || 'Hello! Thank you for answering our call.';
                twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(language) }, fallbackText);
            }
            res.type('text/xml');
            res.send(twiml.toString());
            console.log('✅ Campaign-based TwiML response sent successfully');
        } catch (error) {
            console.error('❌ Error creating campaign-based voice response:', error);
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say({ voice: 'alice', language: 'en-IN' }, 'Sorry, there was an error processing your call. Please try again later.');
            res.type('text/xml');
            res.send(twiml.toString());
        }
    }

    /**
     * Map campaign language to Reverie speaker ID
     * @param {string} language - Campaign language (e.g., "Hindi", "English")
     * @param {string} gender - Speaker gender ("male" or "female")
     * @returns {string} Reverie speaker ID (e.g., "hi_female")
     */
    mapLanguageToSpeaker(language, gender = 'female') {
        const speakerMap = {
            'English': {
                'male': 'en_male',
                'female': 'en_female'
            },
            'Hindi': {
                'male': 'hi_male',
                'female': 'hi_female'
            },
            'Bengali': {
                'male': 'bn_male',
                'female': 'bn_female'
            }
        };
        
        const langSpeakers = speakerMap[language];
        if (!langSpeakers) {
            console.log(`⚠️ Language '${language}' not found, defaulting to Hindi female`);
            return 'hi_female'; // Default to Hindi female
        }
        
        return langSpeakers[gender] || langSpeakers['female'] || 'hi_female';
    }

    /**
     * Map language to Twilio TwiML language codes (fallback)
     * @param {string} language - Language string from campaign
     * @returns {string} Twilio TwiML language code
     */
    mapLanguageToTwimlLanguage(language) {
        const languageMap = {
            'English': 'en-US',
            'Hindi': 'hi-IN',
            'Bengali': 'bn-IN'
        };
        return languageMap[language] || 'en-US';
    }

    /**
     * Handle recorded audio transcription using Reverie STT API
     */
    async transcribeAudio(req, res) {
        try {
            console.log('🎤 Transcribe webhook received');
            // console.log('Request body:', req.body);
            const { RecordingUrl, CallSid } = req.body;

            let campaignId = req.body.campaignId || req.query.campaignId;

            let callSid = CallSid;

            // Fallback for missing keys
            if (!callSid) callSid = `unknown_${Date.now()}`;

            if (!campaignId) campaignId = `unknown_${Date.now()}`;
            
            if (!RecordingUrl || !callSid || !campaignId) {
                console.error('❌ Missing required parameters: RecordingUrl, CallSid, or campaignId');
                const twiml = new twilio.twiml.VoiceResponse();
                twiml.say({ voice: 'alice', language: 'en-IN' }, 'Sorry, missing call or campaign information.');
                res.type('text/xml');
                return res.send(twiml.toString());
            }

            // Fetch campaign by campaignId early to get language information
            const campaign = await Campaign.findById(campaignId);

            if (!campaign) {
                console.error('❌ Campaign not found for campaignId:', campaignId);
                return res.status(400).send('Campaign not found for this call');
            }
            console.log('✅ Using campaign:', campaign._id, 'Objective:', campaign.objective, 'SampleFlow:', campaign.sampleFlow);
            const currentLanguage = campaign.language || 'Hindi';
            const campaignObjective = campaign.objective || '';
            const campaignSampleFlow = campaign.sampleFlow || '';
            console.log(`📋 Campaign Language: ${currentLanguage}`);
            console.log(`🎯 Campaign Objective: ${campaignObjective}`);
            console.log(`📝 Campaign Sample Flow: ${campaignSampleFlow}`);

            const twiml = new twilio.twiml.VoiceResponse();
            try {
                console.log('📥 Downloading recorded audio from Twilio...');
                
                // Import axios and form-data for Node.js
                const axios = (await import('axios')).default;
                const FormData = (await import('form-data')).default;
                
                // Download the recorded audio file from Twilio with authentication
                const audioResponse = await axios.get(RecordingUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000, // 30 seconds timeout
                    auth: {
                        username: process.env.TWILIO_ACCOUNT_SID,
                        password: process.env.TWILIO_AUTH_TOKEN
                    }
                });
                
                console.log(`✅ Downloaded audio: ${audioResponse.data.byteLength} bytes`);
                console.log(`📊 Audio Content-Type: ${audioResponse.headers['content-type']}`);
                
                const audioBuffer = audioResponse.data;
                
                // Prepare Reverie STT API request
                console.log('🗣️ Sending audio to Reverie STT API...');
                
                const formData = new FormData();
                
                // Add audio buffer to form data using official format
                // Determine correct content type from Twilio response
                const contentType = audioResponse.headers['content-type'] || 'audio/wav';
                const isMp3 = contentType.includes('mp3');
                const filename = isMp3 ? 'recording.mp3' : 'recording.wav';
                const fileContentType = isMp3 ? 'audio/mpeg' : 'audio/wav';
                
                console.log(`🎵 Audio format detected: ${contentType}, using filename: ${filename}`);
                
                formData.append('audio_file', Buffer.from(audioBuffer), {
                    filename: filename,
                    contentType: fileContentType
                });
                
                // Make request to Reverie STT API using official format
                // Map campaign language to STT language code
                const sttLanguageMap = {
                    'English': 'en',
                    'Hindi': 'hi',
                    'Bengali': 'bn'
                };
                const sttLang = sttLanguageMap[currentLanguage] || 'en';
                console.log(`🗣️ Using STT language: ${sttLang} for campaign language: ${currentLanguage}`);
                
                // Prepare headers for Reverie STT API
                const sttHeaders = {
                    'REV-API-KEY': process.env.REVERIE_API_KEY,
                    'REV-APP-ID': process.env.REVERIE_APP_ID,
                    'REV-APPNAME': 'stt_file',
                    'src_lang': sttLang,
                    'domain': 'generic',
                    ...formData.getHeaders()
                };
                
                console.log('🔧 STT Headers:', {
                    'REV-API-KEY': process.env.REVERIE_API_KEY ? 'SET' : 'MISSING',
                    'REV-APP-ID': process.env.REVERIE_APP_ID ? 'SET' : 'MISSING',
                    'REV-APPNAME': 'stt_file',
                    'src_lang': sttLang,
                    'domain': 'generic'
                });
                
                let sttResponse;
                try {
                    // Log the actual headers being sent
                    console.log('🔧 ACTUAL STT Headers being sent:', sttHeaders);
                    
                    sttResponse = await axios.post('https://revapi.reverieinc.com/', formData, {
                        headers: sttHeaders,
                        timeout: 30000 // 30 seconds timeout
                    });
                } catch (sttError) {
                    console.error('❌ STT API Request Failed:', sttError.message);
                    console.error('❌ STT Error Details:', sttError.response?.data || 'No response data');
                    console.error('❌ STT Error Status:', sttError.response?.status || 'No status');
                    
                    // Fallback to Twilio's built-in transcription if STT fails
                    console.log('🔄 Falling back to Twilio transcription...');
                    twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(currentLanguage) }, 
                        currentLanguage === 'Hindi' ? 'माफ़ करें, तकनीकी समस्या है। कृपया फिर से बोलें।' :
                        currentLanguage === 'Bengali' ? 'দুঃখিত, প্রযুক্তিগত সমস্যা। দয়া করে আবার বলুন।' :
                        'Sorry, technical issue. Please speak again.'
                    );
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 20,
                        timeout: 4,
                        playBeep: false,
                        trim: 'do-not-trim'
                    });
                    res.type('text/xml');
                    return res.send(twiml.toString());
                }
                
                console.log(`📊 Reverie STT response status: ${sttResponse.status}`);
                console.log(`📊 Reverie STT response headers:`, sttResponse.headers);
                
                const sttResult = sttResponse.data;
                console.log('🎯 Reverie STT response:', sttResult);
                
                // Check for STT API errors
                if (sttResult.error || sttResult.status === 'error') {
                    console.error('❌ STT API Error:', sttResult.error || sttResult.message || 'Unknown STT error');
                    throw new Error(`STT API Error: ${sttResult.error || sttResult.message || 'Unknown error'}`);
                }
                
                // Extract transcribed text
                let transcribedText = sttResult.text || sttResult.transcript || sttResult.result || 'No transcription available';
                console.log(`📝 Transcribed text: "${transcribedText}"`);
                console.log(`📊 STT Confidence: ${sttResult.confidence}`);
                console.log(`📊 Word count: ${transcribedText.trim().split(/\s+/).filter(Boolean).length}`);
                
                // If Reverie STT fails, try to use Twilio's transcription as fallback
                if (!transcribedText || transcribedText.trim().toLowerCase() === 'no transcription available') {
                    console.log('⚠️ Reverie STT returned no transcription, checking for Twilio transcription...');
                    
                    // Check if Twilio provided transcription in the webhook
                    const twilioTranscription = req.body.SpeechResult || req.body.TranscriptionText;
                    if (twilioTranscription) {
                        transcribedText = twilioTranscription;
                        console.log(`📝 Using Twilio transcription: "${transcribedText}"`);
                    }
                }
                
                // Initialize failCountKey at the top level for proper scoping
                let failCountKey = `failCount_${callSid}::${campaignId}`;
                if (!global._failCounts) global._failCounts = {};
                
                // Track user behavior for dynamic timeout adjustment
                const recordingDuration = parseFloat(req.body.RecordingDuration) || 0;
                let wordCount = transcribedText.trim().split(/\s+/).filter(Boolean).length;
                const sttConfidence = typeof sttResult.confidence === 'number' ? sttResult.confidence : 1;
                
                // Track user behavior (even for failed transcriptions to learn patterns)
                this.trackUserBehavior(callSid, recordingDuration, wordCount, false);
                
                // Lower confidence threshold and be more lenient with valid transcriptions
                const hasValidTranscription = transcribedText &&
                    transcribedText.trim().toLowerCase() !== 'no transcription available' &&
                    wordCount > 0;
                
                // Only reject if we have no transcription at all (ignore confidence if text is present)
                if (!hasValidTranscription) {
                    // Log failed audio for analysis
                    if (RecordingUrl) {
                        console.warn('⚠️ Logging failed audio RecordingUrl for analysis:', RecordingUrl);
                    }
                    global._failCounts[failCountKey] = (global._failCounts[failCountKey] || 0) + 1;
                    let failCount = global._failCounts[failCountKey];
                    // Always use correct language for retry prompt
                    let repeatMsg, twimlLang;
                    if (currentLanguage === 'Bengali') {
                        repeatMsg = 'দয়া করে আবার স্পষ্টভাবে বলুন।';
                        twimlLang = 'bn-IN';
                    } else if (currentLanguage === 'Hindi') {
                        repeatMsg = 'कृपया फिर से स्पष्ट रूप से कहें।';
                        twimlLang = 'hi-IN';
                    } else {
                        repeatMsg = 'Sorry, I did not catch that. Please speak clearly after the beep.';
                        twimlLang = 'en-US';
                    }
                    if (failCount < 3) {
                        // Get dynamic timeout based on user behavior
                        const dynamicTimeout = this.getOptimalTimeout(callSid, currentLanguage);
                        
                        twiml.say({ voice: 'alice', language: twimlLang }, repeatMsg);
                        twiml.record({
                            action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                            method: 'POST',
                            maxLength: 20,
                            timeout: dynamicTimeout,
                            playBeep: false,
                            trim: 'do-not-trim'
                        });
                        res.type('text/xml');
                        return res.send(twiml.toString());
                    } else {
                        let endMsg, endLang;
                        if (currentLanguage === 'Bengali') {
                            endMsg = 'ধন্যবাদ! কল শেষ করা হচ্ছে।';
                            endLang = 'bn-IN';
                        } else if (currentLanguage === 'Hindi') {
                            endMsg = 'धन्यवाद! कॉल समाप्त की जा रही है।';
                            endLang = 'hi-IN';
                        } else {
                            endMsg = 'Thank you! Ending the call.';
                            endLang = 'en-US';
                        }
                        twiml.say({ voice: 'alice', language: endLang }, endMsg);
                        res.type('text/xml');
                        delete global._failCounts[failCountKey];
                        
                        // Reset user behavior after successful conversation
                        this.resetUserBehavior(callSid);
                        
                        return res.send(twiml.toString());
                    }
                } else if (wordCount <= 2) {
                    // Accept short answer, but confirm
                    let confirmMsg = currentLanguage === 'Bengali' ? `আপনি কি বললেন: '${transcribedText}'? দয়া করে স্পষ্টভাবে বলুন।` : currentLanguage === 'Hindi' ? `क्या आपने कहा: '${transcribedText}'? कृपया स्पष्ट रूप से कहें।` : `Did you say: '${transcribedText}'? Please say it clearly.`;
                    twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(currentLanguage) }, confirmMsg);
                    
                    // Use dynamic timeout for short responses
                    const dynamicTimeout = this.getOptimalTimeout(callSid, currentLanguage);
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: dynamicTimeout,
                        playBeep: false,
                        trim: 'do-not-trim'
                    });
                    res.type('text/xml');
                    return res.send(twiml.toString());
                } else {
                    // Reset fail count on valid answer
                    delete global._failCounts[failCountKey];
                }
                
                // Use callSid+campaignId as the only memory key
                let history = getConversationHistory({ callSid, campaignId });
                console.log('🧠 Memory loaded:', history.length, 'messages');
                if (history.length === 0) {
                    console.warn('⚠️ Conversation history is empty after loading');
                }
                saveMessage({ callSid, campaignId, role: 'user', content: transcribedText });
                const aiParams = {
                    objective: campaignObjective,
                    language: currentLanguage,
                    sampleFlow: campaignSampleFlow,
                    conversationHistory: getConversationHistory({ callSid, campaignId }),
                    userInput: transcribedText,
                    systemPrompt: 'You are a professional telecaller. Keep your responses concise and focused unless the user asks for a detailed description. If the user asks for more details, then provide a longer answer. Try to sense the user\'s sentiment and respond accordingly.'
                };
                console.log('🎯 LLM INPUT:', aiParams);
                const aiReply = await generateReply(aiParams);
                saveMessage({ callSid, campaignId, role: 'assistant', content: aiReply });
                
                // Validate response alignment
                if (aiReply.toLowerCase().includes('samsung') || aiReply.toLowerCase().includes('galaxy') || aiReply.toLowerCase().includes('smartphone')) {
                    console.warn('⚠️ AI response seems off-topic! This suggests context loss.');
                    console.warn('⚠️ Expected role:', campaignObjective);
                    console.warn('⚠️ Actual response:', aiReply);
                } else {
                    console.log('✅ AI response seems aligned with campaign objective');
                }
                
                // Save to persistent transcript (for long-term storage)
                console.log('💾 Saving conversation to persistent transcript...');
                const Transcript = (await import('../models/transcript.model.js')).default;
                const Contact = (await import('../models/contact.model.js')).default;
                
                // Find the contact for this call
                let contact = null;
                if (callSid) {
                    // First try to find contact through call log
                    const callLog = await CallLog.findOne({ callSid: callSid });
                    if (callLog && callLog.contactId) {
                        contact = await Contact.findById(callLog.contactId);
                        console.log(`✅ Found contact through call log: ${contact?.name} (${contact?.phone})`);
                    } else {
                        // Fallback: try to find contact by phone number
                        contact = await Contact.findOne({ phone: req.body.To || req.query.To });
                        console.log(`✅ Found contact by phone number: ${contact?.name} (${contact?.phone})`);
                    }
                }
                
                // Find or create transcript for this specific contact and campaign
                let transcript = null;
                if (contact) {
                    transcript = await Transcript.findOne({ 
                        contactId: contact._id, 
                        campaignId: campaignId 
                    });
                }
                
                if (!transcript) {
                    transcript = new Transcript({ 
                        contactId: contact?._id,
                        campaignId: campaignId, 
                        entries: [] 
                    });
                }
                
                // Add both user input and AI response to transcript
                transcript.entries.push({
                    from: 'user',
                    text: transcribedText,
                    timestamp: new Date()
                });
                transcript.entries.push({
                    from: 'ai',
                    text: aiReply,
                    timestamp: new Date()
                });

                // Prepare DB save promises
                const transcriptSavePromise = transcript.save();
                let contactUpdatePromise = Promise.resolve();
                if (contact && transcript._id) {
                    contactUpdatePromise = Contact.findByIdAndUpdate(contact._id, {
                        transcriptId: transcript._id.toString()
                    });
                }

                // Generate TTS audio for AI reply using campaign language
                console.log('🎵 Converting AI reply to speech using campaign language...');
                const speakerMapping = this.mapLanguageToSpeaker(currentLanguage, 'female');
                console.log(`🗣️ Using speaker: ${speakerMapping} for language: ${currentLanguage}`);
                const [langCode, genderCode] = speakerMapping.split('_');
                const ttsPromise = ttsService.generateTTSAudio(aiReply, langCode, genderCode, 1.0, 1.0);

                // Await all in parallel
                const [ttsResult] = await Promise.all([
                    ttsPromise,
                    transcriptSavePromise,
                    contactUpdatePromise
                ]);
                const audioUrl = ttsResult.audioUrl;
                console.log(`🔗 AI TTS Audio URL: ${audioUrl}`);
                
                // Play AI response
                if (audioUrl) {
                    console.log('🎵 Playing AI response audio...');
                    twiml.play(audioUrl);
                    
                    // Add user feedback message if needed
                    const feedbackMsg = this.getUserFeedbackMessage(recordingDuration, wordCount, currentLanguage);
                    if (feedbackMsg) {
                        console.log(`💬 Adding user feedback: ${feedbackMsg}`);
                        twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(currentLanguage) }, feedbackMsg);
                    }
                    
                    // Add another recording for continued conversation with dynamic timeout
                    console.log('🔄 Adding recording for continued conversation...');
                    const dynamicTimeout = this.getOptimalTimeout(callSid, currentLanguage);
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: dynamicTimeout,
                        playBeep: false,
                        trim: 'do-not-trim'
                    });
                    
                    console.log(`✅ AI conversation flow added to TwiML with ${dynamicTimeout}s timeout`);
                } else {
                    // TTS fallback
                    twiml.say({ voice: 'alice', language: 'en-IN' }, aiReply || 'Please wait...');
                }
                
            } catch (aiError) {
                console.error('❌ Error in AI response generation:', aiError.message);
                
                // Fallback to simple acknowledgment
                twiml.say({
                    voice: 'alice',
                    language: 'en-IN'
                }, 'Thank you for your response. We have received your message.');
            }
            
            const twimlResponse = twiml.toString();
            console.log('📄 Generated TwiML response:');
            console.log(twimlResponse);
            
            // Set response content type to XML and send TwiML
            res.type('text/xml');
            res.send(twimlResponse);
            
            console.log('✅ Transcribe TwiML response sent successfully');
            
        } catch (error) {
            console.error('❌ Error in transcribe webhook:', error);
            
            // Send fallback TwiML response
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say({
                voice: 'alice',
                language: 'en-IN'
            }, 'Sorry, there was an error processing your recording. Please try again later.');
            
            res.type('text/xml');
            res.send(twiml.toString());
        }
    }

    /**
     * Get real-time status of a call by SID (API endpoint)
     */
    async getCallStatusBySid(req, res) {
        try {
            const { callSid } = req.params;
            if (!callSid) {
                return res.status(400).json({ error: 'Missing callSid parameter' });
            }
            const status = await (await import('../services/twilio.service.js')).default.getCallStatus(callSid);
            return res.json({ callSid, status });
        } catch (error) {
            console.error('❌ Error fetching call status:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}

// Export the class instance with properly bound methods
const twilioController = new TwilioController();

// Bind methods to maintain 'this' context
twilioController.playTTS = twilioController.playTTS.bind(twilioController);
twilioController.handleCallStatus = twilioController.handleCallStatus.bind(twilioController);
twilioController.testSimpleAudio = twilioController.testSimpleAudio.bind(twilioController);
twilioController.voiceResponse = twilioController.voiceResponse.bind(twilioController);
twilioController.transcribeAudio = twilioController.transcribeAudio.bind(twilioController);
twilioController.getCallStatusBySid = twilioController.getCallStatusBySid.bind(twilioController);

// Export both controller and conversation manager
export default twilioController; 
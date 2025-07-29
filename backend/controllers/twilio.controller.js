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
        // Simple constructor - no barge-in functionality
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
                    contact = await Contact.findOne(
                        { 
                        phone: To, 
                        campaignId: campaignId 
                    });
                    
                    if (contact) {
                        console.log('✅ [CONTACT LOOKUP] Found contact by phone + campaignId:', contact.name, 'Campaign:', contact.campaignId);
                    } else {
                        console.log('⚠️ [CONTACT LOOKUP] No contact found for phone + campaignId combination');
                    }
                } else {
                    // Fallback: try to find contact by phone number only (less reliable)
                    contact = await Contact.findOne({ phone: To });
                    if (contact) {
                        console.log('⚠️ [CONTACT LOOKUP] Found contact by phone only (fallback):', contact.name, 'Campaign:', contact.campaignId);
                    } else {
                        console.log('❌ [CONTACT LOOKUP] No contact found for phone:', To);
                    }
                }
                
                contactFound = contact;
                
            } catch (contactErr) {
                console.error('❌ [CONTACT LOOKUP] Error finding contact:', contactErr);
            }
            
            // STEP 3: Update call log with status
            try {
                console.log('💾 [CALL LOG] Updating call log for CallSid:', CallSid);
                
                if (CallSid) {
                    const callLog = await CallLog.findOne({ callSid: CallSid });
                    
                    if (callLog) {
                        console.log('✅ [CALL LOG] Found existing call log, updating status');
                        
                        const updateData = {
                            status: CallStatus,
                            updatedAt: new Date()
                        };
                        
                        if (Duration) {
                            updateData.duration = parseInt(Duration);
                        }
                        
                        if (CallDuration) {
                            updateData.callDuration = parseInt(CallDuration);
                        }
                        
                        dbAction = 'update';
                        dbResult = await CallLog.findByIdAndUpdate(
                            callLog._id,
                            updateData,
                            { new: true }
                        );
                        
                        console.log('✅ [CALL LOG] Call log updated successfully');
                        
                    } else {
                        console.log('⚠️ [CALL LOG] No call log found for CallSid:', CallSid);
                    }
                } else {
                    console.log('⚠️ [CALL LOG] No CallSid provided, skipping call log update');
                }
                
            } catch (dbErr) {
                console.error('❌ [CALL LOG] Error updating call log:', dbErr);
                dbError = dbErr;
            }
            
            // STEP 4: Update contact status if we have a contact
            try {
                if (contactFound) {
                    console.log('👤 [CONTACT] Updating contact status for:', contactFound.name);
                    
                    let contactStatus = 'pending';
                    
                    if (CallStatus === 'completed') {
                        contactStatus = 'completed';
                    } else if (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
                        contactStatus = 'failed';
                    } else if (CallStatus === 'in-progress') {
                        contactStatus = 'in-progress';
                    }
                    
                    await Contact.findByIdAndUpdate(contactFound._id, {
                        status: contactStatus,
                        updatedAt: new Date()
                    });
                    
                    console.log('✅ [CONTACT] Contact status updated to:', contactStatus);
                } else {
                    console.log('⚠️ [CONTACT] No contact found, skipping contact update');
                }
                
            } catch (contactUpdateErr) {
                console.error('❌ [CONTACT] Error updating contact status:', contactUpdateErr);
            }
            
            // STEP 5: Send response
            console.log('📤 [RESPONSE] Sending webhook response');
            res.status(200).json({
                success: true,
                message: 'Call status updated successfully',
                data: {
                    callSid: CallSid,
                    status: CallStatus,
                    campaignFound: !!campaignFound,
                    contactFound: !!contactFound,
                    dbAction: dbAction,
                    dbError: dbError ? dbError.message : null
                }
            });
            
        } catch (error) {
            console.error('❌ [ERROR] handleCallStatus error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * Campaign-based voice response handler with AI generation
     */
    async voiceResponse(req, res) {
        console.log('🚀 voiceResponse method called');
        console.log('📋 Request body:', req.body);
        console.log('🔍 Request query:', req.query);
        
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
                // --- RAG ENABLED - Using enhanced LLM with document context ---
                console.log('🔄 Using enhanced LLM system with RAG integration');
                
                const { generateReply } = await import('../services/llm.service.js');
                console.log(`🔍 Generating AI reply for campaign ID: ${campaignId} (type: ${typeof campaignId})`);
                const aiReply = await generateReply({
                    objective,
                    language,
                    sampleFlow,
                    conversationHistory: [],
                    userInput: 'Start the call',
                    campaignId: campaignId
                });
                console.log('✅ Enhanced LLM response with RAG generated successfully');
                // --- END RAG ENABLE ---
                
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
                    console.log('🎵 Adding TTS audio to TwiML (simple play approach)...');
                    
                    // Simple play approach - no barge-in
                    twiml.play(audioUrl);
                    
                    // Add recording capability after TTS playback
                    console.log('🎤 Adding recording capability for user response...');
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: 5,
                        playBeep: true,
                        trim: 'do-not-trim'
                    });
                    
                    res.type('text/xml');
                    res.send(twiml.toString());
                    console.log('✅ Campaign-based AI response with simple play sent successfully');
                    return;
                } else {
                    throw new Error('Failed to generate TTS audio');
                }
            } catch (aiError) {
                console.error('❌ Error in AI/TTS generation:', aiError.message);
                console.error('❌ Full error stack:', aiError.stack);
                const fallbackText = objective || 'Hello! Thank you for answering our call.';
                twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(language) }, fallbackText);
                
                // Add recording capability even for fallback
                twiml.record({
                    action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                    method: 'POST',
                    maxLength: 10,
                    timeout: 5,
                    playBeep: true,
                    trim: 'do-not-trim'
                });
                
                res.type('text/xml');
                res.send(twiml.toString());
                return;
            }
        } catch (outerError) {
            console.error('❌ CRITICAL ERROR in voiceResponse:', outerError.message);
            console.error('❌ Full error stack:', outerError.stack);
            
            // Send a basic TwiML response to prevent call failure
            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say({ voice: 'alice', language: 'en-IN' }, 'Hello! Thank you for your call. We are experiencing technical difficulties. Please try again later.');
            res.type('text/xml');
            res.send(twiml.toString());
            return;
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
                // This ensures STT processes audio in the correct campaign language
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
                    'REV-APP-ID': process.env.REV_APP_ID ? 'SET' : 'MISSING',
                    'src_lang': sttLang,
                    'domain': 'generic'
                });
                
                // Make the STT API call with retry mechanism
                let sttResponse;
                let sttError;
                
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        console.log(`🔄 STT API attempt ${attempt}/3...`);
                        sttResponse = await axios.post('https://revapi.reverieinc.com/', formData, {
                            headers: sttHeaders,
                            timeout: 15000 // 15 seconds timeout per attempt
                        });
                        console.log(`✅ STT API attempt ${attempt} successful`);
                        break;
                    } catch (error) {
                        sttError = error;
                        console.error(`❌ STT API attempt ${attempt} failed:`, error.message);
                        
                        if (attempt < 3) {
                            console.log(`⏳ Waiting 2 seconds before retry...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }
                
                if (!sttResponse) {
                    throw new Error(`STT API failed after 3 attempts: ${sttError?.message || 'Unknown error'}`);
                }
                
                console.log('✅ STT API response received');
                console.log('📊 STT Response status:', sttResponse.status);
                console.log('📄 STT Response data:', sttResponse.data);
                
                let transcribedText = '';
                
                // Handle Reverie STT API response format
                if (sttResponse.data && sttResponse.data.success && sttResponse.data.text) {
                    transcribedText = sttResponse.data.text.trim();
                    console.log('✅ Transcription successful:', transcribedText);
                    console.log('📊 Confidence:', sttResponse.data.confidence);
                } else if (sttResponse.data && sttResponse.data.response) {
                    // Fallback for old format
                    transcribedText = sttResponse.data.response.trim();
                    console.log('✅ Transcription successful (fallback format):', transcribedText);
                } else {
                    console.error('❌ STT API returned unexpected response format');
                    console.error('STT Response:', sttResponse.data);
                    throw new Error('STT API returned unexpected response format');
                }
                
                // Validate transcription quality
                if (!transcribedText || transcribedText.length === 0) {
                    console.error('❌ Empty transcription received from STT API');
                    throw new Error('Empty transcription received from STT API');
                }
                
                const wordCount = transcribedText.split(/\s+/).length;
                console.log(`📊 Transcription word count: ${wordCount}`);
                
                // Handle very short or unclear transcriptions
                const failCountKey = `${callSid}_${campaignId}`;
                if (!global._failCounts) global._failCounts = {};
                
                if (wordCount <= 1) {
                    // Increment fail count
                    global._failCounts[failCountKey] = (global._failCounts[failCountKey] || 0) + 1;
                    console.warn(`⚠️ Very short transcription (${wordCount} words). Fail count: ${global._failCounts[failCountKey]}`);
                    
                    if (global._failCounts[failCountKey] >= 3) {
                        console.warn('⚠️ Too many failed attempts, ending call gracefully');
                        twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(currentLanguage) }, 
                            currentLanguage === 'Bengali' ? 'ধন্যবাদ আপনার কলের জন্য। আবার চেষ্টা করুন।' :
                            currentLanguage === 'Hindi' ? 'धन्यवाद आपके कॉल के लिए। कृपया बाद में फिर से कोशिश करें।' :
                            'Thank you for your call. Please try again later.'
                        );
                        
                        delete global._failCounts[failCountKey];
                        
                        return res.send(twiml.toString());
                    }
                } else if (wordCount <= 2) {
                    // Accept short answer, but confirm
                    let confirmMsg = currentLanguage === 'Bengali' ? `আপনি কি বললেন: '${transcribedText}'? দয়া করে স্পষ্টভাবে বলুন।` : currentLanguage === 'Hindi' ? `क्या आपने कहा: '${transcribedText}'? कृपया स्पष्ट रूप से कहें।` : `Did you say: '${transcribedText}'? Please say it clearly.`;
                    twiml.say({ voice: 'alice', language: this.mapLanguageToTwimlLanguage(currentLanguage) }, confirmMsg);
                    
                    // Use fixed timeout for short responses
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: 5,
                        playBeep: false,
                        trim: 'do-not-trim'
                    });
                    res.type('text/xml');
                    return res.send(twiml.toString());
                } else {
                    // Reset fail count on valid answer
                    delete global._failCounts[failCountKey];
                }
                
                // --- RAG ENABLED - Using enhanced LLM with document context for transcription ---
                console.log('🔄 Using enhanced LLM system with RAG integration for transcription');
                
                // Use callSid+campaignId as the only memory key
                let history = getConversationHistory({ callSid, campaignId });
                console.log('🧠 Memory loaded:', history.length, 'messages');
                if (history.length === 0) {
                    console.warn('⚠️ Conversation history is empty after loading');
                }
                saveMessage({ callSid, campaignId, role: 'user', content: transcribedText });
                
                const { generateReply } = await import('../services/llm.service.js');
                const aiReply = await generateReply({
                    objective: campaignObjective,
                    language: currentLanguage,
                    sampleFlow: campaignSampleFlow,
                    conversationHistory: getConversationHistory({ callSid, campaignId }),
                    userInput: transcribedText,
                    campaignId: campaignId
                });
                saveMessage({ callSid, campaignId, role: 'assistant', content: aiReply });
                console.log('✅ Enhanced LLM response with RAG generated successfully');
                // --- END RAG ENABLE ---
                
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
                
                // Play AI response with simple approach
                if (audioUrl) {
                    console.log('🎵 Playing AI response audio (simple approach)...');
                    
                    // Simple play approach - no barge-in
                    twiml.play(audioUrl);
                    
                    // Add recording capability after TTS playback
                    console.log('🎤 Adding recording capability for next user response...');
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: 5,
                        playBeep: true,
                        trim: 'do-not-trim'
                    });
                    
                    res.type('text/xml');
                    res.send(twiml.toString());
                    console.log('✅ AI response with simple play sent successfully');
                    return;
                } else {
                    // TTS fallback
                    twiml.say({ voice: 'alice', language: 'en-IN' }, aiReply || 'Please wait...');
                }
                
            } catch (aiError) {
                console.error('❌ Error in AI/TTS generation:', aiError.message);
                console.error('❌ Full error stack:', aiError.stack);
                
                // Check if it's a network connectivity issue
                if (aiError.message.includes('ENOTFOUND') || aiError.message.includes('ECONNREFUSED')) {
                    console.error('🌐 Network connectivity issue detected');
                    
                    // Fallback to simple acknowledgment with recording
                    twiml.say({
                        voice: 'alice',
                        language: 'en-IN'
                    }, 'Thank you for your response. We are experiencing technical difficulties. Please try again later.');
                    
                    // Still add recording capability for next attempt
                    twiml.record({
                        action: `/api/twilio/transcribe?campaignId=${campaignId}`,
                        method: 'POST',
                        maxLength: 10,
                        timeout: 5,
                        playBeep: true,
                        trim: 'do-not-trim'
                    });
                } else {
                    // Other errors - fallback to simple acknowledgment
                    twiml.say({
                        voice: 'alice',
                        language: 'en-IN'
                    }, 'Thank you for your response. We have received your message.');
                }
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
     * Clean up old conversation sessions
     */
    cleanupOldSessions() {
        try {
            // conversationManager.cleanupOldSessions(60); // Clean sessions older than 60 minutes
            console.log('🧹 Cleaned up old conversation sessions');
        } catch (error) {
            console.error('❌ Failed to cleanup old sessions:', error);
        }
    }

    /**
     * Get conversation statistics
     */
    getConversationStats(req, res) {
        try {
            // const stats = conversationManager.getStats(); // conversationManager is removed
            res.json({
                success: true,
                // stats // conversationManager is removed
            });
        } catch (error) {
            console.error('❌ Failed to get conversation stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get conversation statistics'
            });
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
twilioController.handleCallStatus = twilioController.handleCallStatus.bind(twilioController);
twilioController.voiceResponse = twilioController.voiceResponse.bind(twilioController);
twilioController.transcribeAudio = twilioController.transcribeAudio.bind(twilioController);
twilioController.getCallStatusBySid = twilioController.getCallStatusBySid.bind(twilioController);
twilioController.getConversationStats = twilioController.getConversationStats.bind(twilioController);
twilioController.cleanupOldSessions = twilioController.cleanupOldSessions.bind(twilioController);

// Export both controller and conversation manager
export default twilioController; 
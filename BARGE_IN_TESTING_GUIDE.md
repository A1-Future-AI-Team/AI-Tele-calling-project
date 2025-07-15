# Barge-In Testing Guide

## 🎯 Current Status

✅ **Barge-in functionality is now implemented in the main flow!**

The following methods now use barge-in:
- `voiceResponse()` - Initial AI greeting with barge-in
- `transcribeAudio()` - AI responses with barge-in
- `processSpeech()` - Handles interrupted speech

## 🧪 Testing Steps

### Step 1: Test Simple Barge-In (Recommended First)

```bash
# Test the simple barge-in functionality
curl -X POST "https://your-domain.com/api/twilio/simple-barge-in-test"
```

**What this does:**
- Plays a clear instruction message
- Then plays a long message that can be interrupted
- You can speak at any time to interrupt the message
- Will confirm if barge-in is working

### Step 2: Test Main Flow with Barge-In

```bash
# Test the main conversation flow with barge-in
curl -X POST "https://your-domain.com/api/twilio/voice-response?campaignId=your_campaign_id"
```

**What this does:**
- Generates AI greeting using Groq LLM
- Converts to TTS using Reverie
- Plays TTS with barge-in enabled
- You can interrupt the AI response by speaking

### Step 3: Test Full Conversation Loop

1. Make a call to your Twilio number
2. When AI starts speaking, try interrupting by saying something
3. The AI should stop and process your speech
4. AI will respond with barge-in enabled again

## 📋 Expected Behavior

### ✅ Working Barge-In:
- AI starts speaking TTS audio
- You can interrupt by speaking at any time
- AI stops playing and processes your speech
- AI responds with new TTS audio (also interruptible)
- Conversation continues naturally

### ❌ Not Working:
- AI plays full TTS audio without stopping
- No response when you speak during TTS
- Call ends with error

## 🔍 Debugging

### Check Server Logs

Look for these log messages:

**Successful barge-in:**
```
🎵 Creating barge-in enabled TwiML response...
📄 Generated TwiML:
<Response>
  <Gather input="speech" language="en-US" bargeIn="true" ...>
    <Play>https://your-domain.com/audio/tts_file.wav</Play>
  </Gather>
  ...
</Response>
✅ Barge-in TwiML response created
```

**Speech detection:**
```
🎤 Process speech webhook received (barge-in)
🎤 User speech detected: "Hello, I want to interrupt"
📊 Confidence: 0.95
```

### Check Generated TwiML

The TwiML should look like this:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" 
            language="en-US" 
            bargeIn="true" 
            action="/api/twilio/process-speech?campaignId=123" 
            method="POST" 
            speechTimeout="auto" 
            enhanced="true" 
            speechModel="phone_call">
        <Play>https://your-domain.com/audio/tts_response.wav</Play>
    </Gather>
    <Say voice="alice" language="en-IN">Please speak after the beep.</Say>
    <Record action="/api/twilio/transcribe?campaignId=123" 
            method="POST" 
            maxLength="10" 
            timeout="5" 
            playBeep="true" 
            trim="do-not-trim"/>
</Response>
```

## 🚨 Common Issues & Solutions

### Issue 1: Barge-in not working
**Symptoms:** AI plays full message without stopping
**Solutions:**
- Check if `bargeIn="true"` is in the TwiML
- Verify webhook URLs are accessible
- Check Twilio account settings for speech recognition

### Issue 2: Speech not detected
**Symptoms:** You speak but nothing happens
**Solutions:**
- Check `speechTimeout` setting (should be "auto")
- Verify `language` parameter matches your speech
- Ensure `enhanced="true"` is set

### Issue 3: Webhook errors
**Symptoms:** Call ends with error
**Solutions:**
- Check server logs for specific error messages
- Verify all routes are properly configured
- Test webhook URLs manually

## 🧪 Test Commands

### Quick Health Check
```bash
# Test basic endpoint accessibility
curl -X POST "https://your-domain.com/api/twilio/simple-barge-in-test"

# Test main flow
curl -X POST "https://your-domain.com/api/twilio/voice-response?campaignId=test"

# Check server status
curl -X GET "https://your-domain.com/health"
```

### Monitor Logs
```bash
# Real-time log monitoring
tail -f /var/log/your-app/app.log | grep -E "(🎤|🎵|📄|✅|❌)"

# Filter for barge-in specific logs
tail -f /var/log/your-app/app.log | grep -E "(barge-in|Gather|SpeechResult)"
```

## 📞 Testing with Real Calls

### Test Call Flow:
1. **Dial your Twilio number**
2. **Wait for AI greeting** (should be interruptible)
3. **Try interrupting** by saying "Hello" or "Stop"
4. **Verify AI stops** and processes your speech
5. **Check AI response** (should also be interruptible)
6. **Continue conversation** naturally

### Expected Log Sequence:
```
📞 Received Twilio voice response request
🎵 Adding TTS audio to TwiML with barge-in support...
🎵 Creating barge-in enabled TwiML response...
📄 Generated TwiML: <Response>...
✅ Campaign-based AI response with barge-in sent successfully

🎤 Process speech webhook received (barge-in)
🎤 User speech detected: "Hello"
🎯 LLM INPUT: {...}
🎵 Playing AI response with barge-in support...
✅ Process speech response with barge-in sent successfully
```

## 🔧 Configuration Check

### Environment Variables:
```bash
BASE_URL=https://your-domain.com
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
REVERIE_API_KEY=your_reverie_key
REVERIE_APP_ID=your_reverie_app_id
```

### Twilio Webhook URLs:
- Voice webhook: `https://your-domain.com/api/twilio/voice-response`
- Status callback: `https://your-domain.com/api/twilio/call-status`

## 🎯 Success Criteria

Barge-in is working correctly if:
1. ✅ AI TTS can be interrupted by user speech
2. ✅ Interrupted speech is processed correctly
3. ✅ AI responds appropriately to interrupted speech
4. ✅ Conversation continues naturally
5. ✅ No application errors occur

## 📞 Next Steps

1. **Test simple barge-in first** - Use `/simple-barge-in-test`
2. **Test main flow** - Use `/voice-response` with campaign
3. **Test real calls** - Make actual phone calls
4. **Monitor logs** - Watch for any errors
5. **Report results** - Let me know what you observe

Let me know what happens when you test this! 
# Debugging Application Error Guide

## Current Status

The application error you're experiencing is likely due to the barge-in implementation. I've temporarily reverted the main flow to the working version and created safe test endpoints.

## Immediate Fixes Applied

### 1. Fixed Missing Variables
- ✅ Fixed missing `campaignId` variable in `playTTS` method
- ✅ Fixed missing `generateReply` import in `processSpeech` method

### 2. Reverted to Working Version
- ✅ Reverted `voiceResponse()` to use standard `twiml.play()` and `twiml.record()`
- ✅ Reverted `transcribeAudio()` to use standard `twiml.play()` and `twiml.record()`

### 3. Added Safe Test Endpoints
- ✅ `POST /api/twilio/test-barge-in` - Simple barge-in test
- ✅ `POST /api/twilio/test-barge-in-response` - Handle test responses

## Testing Steps

### Step 1: Test Current Working Version
```bash
# Test the current working version
curl -X POST "https://your-domain.com/api/twilio/voice-response?campaignId=your_campaign_id"
```

### Step 2: Test Barge-In Separately
```bash
# Test barge-in functionality safely
curl -X POST "https://your-domain.com/api/twilio/test-barge-in"
```

### Step 3: Check Server Logs
Look for these log messages:
- `📞 Received Twilio voice response request`
- `✅ Campaign-based TwiML response sent successfully`
- `🎤 Transcribe webhook received`
- `✅ Transcribe TwiML response sent successfully`

## Common Error Sources

### 1. Missing Environment Variables
Check if these are set:
```bash
BASE_URL=https://your-domain.com
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
REVERIE_API_KEY=your_reverie_key
REVERIE_APP_ID=your_reverie_app_id
```

### 2. Database Connection Issues
Check MongoDB connection:
```bash
# Check if MongoDB is running
# Check connection string in .env file
```

### 3. Audio File Issues
Check if TTS audio files are accessible:
```bash
# Test audio URL accessibility
curl -I "https://your-domain.com/audio/tts_file.wav"
```

### 4. Webhook URL Issues
Ensure webhook URLs are accessible:
```bash
# Test webhook endpoints
curl -X POST "https://your-domain.com/api/twilio/voice-response"
curl -X POST "https://your-domain.com/api/twilio/transcribe"
```

## Debugging Commands

### 1. Check Server Status
```bash
# Check if server is running
ps aux | grep node

# Check server logs
tail -f /path/to/your/logs
```

### 2. Test Individual Components
```bash
# Test TTS service
curl -X POST "https://your-domain.com/api/tts/generate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "English"}'

# Test LLM service
curl -X POST "https://your-domain.com/api/llm/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "language": "English"}'
```

### 3. Check Twilio Webhook Configuration
Ensure your Twilio webhook URLs are correctly set:
- Voice webhook: `https://your-domain.com/api/twilio/voice-response`
- Status callback: `https://your-domain.com/api/twilio/call-status`

## Error Log Analysis

### Look for these error patterns:

1. **Import Errors**
```
Error: Cannot find module '../services/llm.service.js'
```
**Fix:** Check file paths and imports

2. **Database Errors**
```
MongoError: connection failed
```
**Fix:** Check MongoDB connection

3. **TTS Errors**
```
Error: Failed to generate TTS audio
```
**Fix:** Check Reverie API credentials

4. **Webhook Errors**
```
Error: Request timeout
```
**Fix:** Check webhook URL accessibility

## Safe Barge-In Implementation

Once the main flow is working, we can implement barge-in safely:

### Phase 1: Test Basic Barge-In
```bash
# Test the simple barge-in endpoint
curl -X POST "https://your-domain.com/api/twilio/test-barge-in"
```

### Phase 2: Implement Gradually
1. Test with simple TTS first
2. Add speech recognition
3. Integrate with AI responses
4. Add to main flow

## Emergency Rollback

If you need to completely rollback to the working version:

1. **Comment out barge-in methods:**
```javascript
// Comment out these methods temporarily
// async processSpeech(req, res) { ... }
// createBargeInResponse(twiml, audioUrl, campaignId, language) { ... }
```

2. **Remove barge-in routes:**
```javascript
// Comment out these routes
// router.post('/process-speech', twilioController.processSpeech);
// router.post('/example-barge-in', twilioController.exampleBargeIn);
```

3. **Restart server:**
```bash
npm restart
# or
pm2 restart your-app
```

## Next Steps

1. **Test current version** - Ensure basic functionality works
2. **Check logs** - Identify specific error messages
3. **Test barge-in separately** - Use test endpoints
4. **Implement gradually** - Add barge-in step by step

## Support Commands

### Quick Health Check
```bash
# Check if all endpoints are accessible
curl -X GET "https://your-domain.com/health"
curl -X POST "https://your-domain.com/api/twilio/test-barge-in"
curl -X POST "https://your-domain.com/api/twilio/voice-response?campaignId=test"
```

### Monitor Logs
```bash
# Real-time log monitoring
tail -f /var/log/your-app/app.log | grep -E "(ERROR|❌|🎤|📞)"
```

Let me know what specific error messages you see in the logs, and I can help you fix them! 
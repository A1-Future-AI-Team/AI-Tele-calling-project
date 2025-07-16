# Twilio Barge-In Implementation Guide

## Overview

This implementation adds **barge-in functionality** to your AI telecalling app, allowing users to interrupt TTS playback and start speaking immediately. This creates a more natural conversation flow.

## Key Changes

### 1. New Endpoints Added

- **`POST /api/twilio/process-speech`** - Handles speech input from Gather with barge-in
- **`POST /api/twilio/example-barge-in`** - Example demonstrating barge-in functionality

### 2. Updated Methods

- **`voiceResponse()`** - Now uses barge-in for initial AI greeting
- **`transcribeAudio()`** - Now uses barge-in for AI responses
- **`createBargeInResponse()`** - Helper method to create barge-in enabled TwiML

## How Barge-In Works

### Before (Non-Interruptible)
```javascript
// Old approach - user must wait for TTS to finish
twiml.play(audioUrl);
twiml.record({
    action: '/api/twilio/transcribe',
    method: 'POST',
    maxLength: 10,
    timeout: 2
});
```

### After (Interruptible with Barge-In)
```javascript
// New approach - user can interrupt TTS
const gather = twiml.gather({
    input: 'speech',
    language: 'en-US',
    bargeIn: 'true',  // This enables interruption
    action: '/api/twilio/process-speech',
    method: 'POST',
    speechTimeout: 'auto',
    enhanced: 'true',
    speechModel: 'phone_call'
});

gather.play(audioUrl);  // TTS can be interrupted
```

## Implementation Details

### 1. Gather Configuration

```javascript
const gather = twiml.gather({
    input: 'speech',           // Enable speech recognition
    language: 'en-US',         // Speech recognition language
    bargeIn: 'true',           // Allow interruption
    action: '/api/twilio/process-speech',  // Webhook for speech results
    method: 'POST',
    speechTimeout: 'auto',     // Wait for natural pauses
    enhanced: 'true',          // Enhanced recognition
    speechModel: 'phone_call'  // Optimized for calls
});
```

### 2. Speech Processing

When user interrupts TTS, Twilio sends speech data to `/api/twilio/process-speech`:

```javascript
// Request body from Twilio
{
    SpeechResult: "Hello, I'm interested in your product",
    Confidence: 0.95,
    CallSid: "CA1234567890",
    campaignId: "campaign_123"
}
```

### 3. AI Response Generation

The `processSpeech()` method:
1. Receives speech input from Gather
2. Generates AI response using Groq LLM
3. Converts AI response to TTS using Reverie
4. Returns new barge-in enabled response

## Usage Examples

### Basic Barge-In Example

```javascript
const twiml = new twilio.twiml.VoiceResponse();

// Create Gather with barge-in
const gather = twiml.gather({
    input: 'speech',
    language: 'en-US',
    bargeIn: 'true',
    action: '/api/twilio/process-speech',
    method: 'POST',
    speechTimeout: 'auto',
    enhanced: 'true',
    speechModel: 'phone_call'
});

// Play TTS audio (interruptible)
gather.play('https://your-domain.com/audio/tts_response.wav');

// Fallback if no speech
twiml.say('Please speak after the beep.');
twiml.record({
    action: '/api/twilio/transcribe',
    method: 'POST',
    maxLength: 10,
    timeout: 5
});

res.type('text/xml');
res.send(twiml.toString());
```

### Campaign-Based Barge-In

```javascript
// In voiceResponse() or transcribeAudio()
if (audioUrl) {
    return this.createBargeInResponse(twiml, audioUrl, campaignId, language);
}
```

## Generated TwiML Example

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

## Language Support

The implementation supports multiple languages:

```javascript
const speechLanguageMap = {
    'English': 'en-US',
    'Hindi': 'hi-IN',
    'Bengali': 'bn-IN'
};
```

## Testing

### 1. Test Barge-In Functionality

```bash
# Test the example endpoint
curl -X POST https://your-domain.com/api/twilio/example-barge-in
```

### 2. Test with Campaign

```bash
# Test with a real campaign
curl -X POST "https://your-domain.com/api/twilio/voice-response?campaignId=your_campaign_id"
```

### 3. Monitor Logs

Watch for these log messages:
- `🎤 Process speech webhook received (barge-in)`
- `🎵 Creating barge-in enabled TwiML response...`
- `✅ Barge-in TwiML response created`

## Benefits

1. **Natural Conversation Flow** - Users can interrupt AI responses
2. **Faster Interaction** - No need to wait for TTS to finish
3. **Better User Experience** - More human-like conversation
4. **Reduced Call Duration** - Faster response times

## Fallback Behavior

If speech recognition fails or no speech is detected:
1. Falls back to recording mode
2. Uses existing transcription pipeline
3. Maintains conversation continuity

## Configuration

### Environment Variables

Ensure these are set:
```bash
BASE_URL=https://your-domain.com
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
REVERIE_API_KEY=your_reverie_key
REVERIE_APP_ID=your_reverie_app_id
```

### Speech Recognition Settings

You can adjust these parameters in `createBargeInResponse()`:

```javascript
const gather = twiml.gather({
    input: 'speech',
    language: speechLang,
    bargeIn: 'true',
    action: `/api/twilio/process-speech?campaignId=${campaignId}`,
    method: 'POST',
    speechTimeout: 'auto',  // or specific timeout like '3'
    enhanced: 'true',
    speechModel: 'phone_call'  // or 'default'
});
```

## Troubleshooting

### Common Issues

1. **Speech not detected**
   - Check `speechTimeout` setting
   - Verify `language` parameter matches user's language
   - Ensure `enhanced="true"` is set

2. **Barge-in not working**
   - Verify `bargeIn="true"` is set
   - Check that audio URL is accessible
   - Ensure proper TwiML structure

3. **Webhook errors**
   - Verify `/api/twilio/process-speech` endpoint is accessible
   - Check server logs for errors
   - Ensure proper request/response format

### Debug Logs

Enable detailed logging to troubleshoot:

```javascript
console.log('🎤 User speech detected:', SpeechResult);
console.log('📊 Confidence:', Confidence);
console.log('🎵 Audio URL:', audioUrl);
```

## Migration Guide

### From Old Implementation

1. **Update voiceResponse() method**
   - Replace `twiml.play()` with `createBargeInResponse()`

2. **Update transcribeAudio() method**
   - Replace `twiml.play()` with `createBargeInResponse()`

3. **Add new routes**
   - Add `/api/twilio/process-speech` route

4. **Test thoroughly**
   - Test with different languages
   - Test interruption scenarios
   - Verify fallback behavior

### Backward Compatibility

The implementation maintains backward compatibility:
- Existing recording endpoints still work
- Fallback to recording if speech fails
- Same conversation flow and memory management 
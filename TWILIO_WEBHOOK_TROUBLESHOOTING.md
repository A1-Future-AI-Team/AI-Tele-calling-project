# Twilio Webhook Troubleshooting Guide

## ✅ Fixed Issues

### 1. **Express Middleware Configuration**
- **Fixed**: Changed `express.urlencoded({ extended: true })` to `express.urlencoded({ extended: false })`
- **Why**: Twilio sends form-encoded data, not JSON
- **Location**: `backend/app.js` line 47

### 2. **Trust Proxy for Cloudflare Tunnel**
- **Fixed**: Added `app.set('trust proxy', true)`
- **Why**: Required for proper IP handling with cloudflare tunnel
- **Location**: `backend/app.js` line 33

### 3. **BASE_URL Validation**
- **Fixed**: Added validation to ensure BASE_URL is set before making calls
- **Why**: Prevents calls with invalid webhook URLs
- **Location**: `backend/services/twilio.service.js` lines 153-155 and 254-256

### 4. **Enhanced Debug Logging**
- **Fixed**: Added comprehensive debug logging in handleCallStatus
- **Why**: Better visibility into webhook processing
- **Location**: `backend/controllers/twilio.controller.js` lines 164-169

### 5. **Fixed Undefined Update Variable**
- **Fixed**: Properly defined update object with all required fields
- **Why**: Prevents database update errors
- **Location**: `backend/controllers/twilio.controller.js` lines 180-190

## 🔧 Testing Steps

### Step 1: Verify Environment Variables
```bash
# Check if all required variables are set
node -e "
console.log('BASE_URL:', process.env.BASE_URL || 'NOT SET');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');
"
```

### Step 2: Test Webhook Endpoint Manually
```bash
# Run the test script
node backend/testWebhook.js
```

### Step 3: Check Server Startup Logs
Look for these logs when starting the server:
```
🌐 Using BASE_URL: https://your-domain.trycloudflare.com
Server running on port 3000
```

### Step 4: Test with curl
```bash
curl -X POST https://your-domain.trycloudflare.com/api/twilio/call-status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&CallStatus=completed&To=+919531670207&From=+12202443519"
```

## 🚨 Common Issues & Solutions

### Issue 1: "BASE_URL not set" Error
**Symptoms**: Calls fail with "BASE_URL not set in environment variables"
**Solution**: 
1. Add to `.env` file: `BASE_URL=https://your-domain.trycloudflare.com`
2. Restart server

### Issue 2: Webhook Not Reaching Server
**Symptoms**: No "📞 Webhook HIT - handleCallStatus" logs
**Solutions**:
1. **Check ngrok/cloudflare tunnel**: Ensure it's running and accessible
2. **Verify BASE_URL**: Must be publicly accessible
3. **Test manually**: Use `node backend/testWebhook.js`

### Issue 3: Database Not Updated
**Symptoms**: Webhook logs appear but no database entries
**Solutions**:
1. **Check MongoDB connection**: Ensure database is running
2. **Verify CallLog model**: Check if model is properly imported
3. **Check database permissions**: Ensure write access

### Issue 4: Twilio Console Shows Webhook Errors
**Symptoms**: 404 or 500 errors in Twilio Console → Call Logs
**Solutions**:
1. **Check route registration**: Verify `/api/twilio/call-status` is mounted
2. **Test endpoint manually**: Use curl or test script
3. **Check server logs**: Look for error messages

## 📋 Verification Checklist

### ✅ Server Configuration
- [ ] `express.urlencoded({ extended: false })` is set
- [ ] `app.set('trust proxy', true)` is added
- [ ] Routes are properly mounted: `app.use('/api/twilio', twilioRoutes)`
- [ ] Server starts without errors

### ✅ Environment Variables
- [ ] `BASE_URL` is set and publicly accessible
- [ ] `TWILIO_ACCOUNT_SID` is set
- [ ] `TWILIO_AUTH_TOKEN` is set
- [ ] `TWILIO_PHONE_NUMBER` is set

### ✅ Webhook Endpoint
- [ ] Manual test passes: `node backend/testWebhook.js`
- [ ] curl test returns 200 OK
- [ ] Debug logs appear in console

### ✅ Twilio Configuration
- [ ] Phone number webhooks are configured in Twilio Console
- [ ] Voice webhook: `https://your-domain.com/api/twilio/voice-response`
- [ ] Status callback: `https://your-domain.com/api/twilio/call-status`

### ✅ Database
- [ ] MongoDB is running and accessible
- [ ] CallLog model is properly defined
- [ ] Database connection is established

## 🎯 Expected Behavior After Fixes

### When Making a Call:
1. **Call Initiation**: `makeCall()` or `makeCallLegacy()` creates call
2. **Pre-call Log**: Database entry created with status 'initiated'
3. **Twilio Webhook**: Sends status updates to `/api/twilio/call-status`
4. **Server Logs**: Show "📞 Webhook HIT - handleCallStatus"
5. **Database Update**: Call log updated with new status
6. **Console Output**: Detailed status progression logs

### Console Logs You Should See:
```
🌐 Using BASE_URL: https://your-domain.trycloudflare.com
📞 Making call to +919531670207 for campaign test-campaign
✅ Call log (pre-call) saved to database
📞 Call initiated to +919531670207: SID CA1234567890abcdef
📞 Webhook HIT - handleCallStatus
📞 Call CA1234567890abcdef status: ringing
✅ [DB] Existing call log updated
📞 Call CA1234567890abcdef status: answered
✅ [DB] Existing call log updated
📞 Call CA1234567890abcdef status: completed
✅ [DB] Existing call log updated
```

## 🔍 Debugging Commands

### Check Webhook Registration:
```bash
# List all registered routes
node -e "
const app = require('./backend/app.js').default;
console.log(app._router.stack.filter(r => r.route).map(r => r.route.path));
"
```

### Test Database Connection:
```bash
# Test MongoDB connection
node -e "
import connectDB from './backend/config/db.config.js';
connectDB().then(() => console.log('✅ DB connected')).catch(console.error);
"
```

### Monitor Webhook Requests:
```bash
# Watch server logs for webhook hits
tail -f logs/server.log | grep "Webhook HIT"
```

## 📞 Next Steps

1. **Restart your server** after applying all fixes
2. **Run the test script**: `node backend/testWebhook.js`
3. **Make a test call** using your existing test scripts
4. **Monitor console logs** for webhook activity
5. **Check Twilio Console** for webhook delivery status
6. **Verify database** has call log entries

If issues persist, check the Twilio Console → Monitor → Logs → Call Logs for specific error messages from Twilio's side. 
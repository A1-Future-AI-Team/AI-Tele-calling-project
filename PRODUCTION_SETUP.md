# Production Setup Guide

## 🌐 **Environment Variables for Production**

### **Required Environment Variables:**
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC3e9e1c30c7c3f0f03f95087a8844c1b8
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12202443519

# Public URL (Must be publicly accessible)
BASE_URL=https://your-production-domain.com

# Database
MONGODB_URI=mongodb://localhost:27017/ai_telecalling
# OR for cloud database:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai_telecalling

# AI Services
REVERIE_API_KEY=87ccfe93b075e81ac7b39daa5f4b48ee1980693a
REVERIE_APP_ID=dev.marutawa
GROQ_API_KEY=your_groq_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=production
```

## 📞 **Twilio Console Configuration**

### **Phone Number Webhooks Setup:**
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number: `+12202443519`
4. Configure webhooks:

#### **Voice Configuration:**
- **Webhook URL**: `https://your-production-domain.com/api/twilio/voice-response`
- **HTTP Method**: `POST`

#### **Status Callback:**
- **Webhook URL**: `https://your-production-domain.com/api/twilio/call-status`
- **HTTP Method**: `POST`

## 🔧 **Production Deployment Checklist**

### **✅ Server Configuration:**
- [ ] `NODE_ENV=production` is set
- [ ] `BASE_URL` points to your production domain
- [ ] Server is publicly accessible (no firewall blocking)
- [ ] HTTPS is enabled (required by Twilio)

### **✅ Database Setup:**
- [ ] MongoDB is running and accessible
- [ ] Database connection string is correct
- [ ] Database has proper authentication/security

### **✅ Twilio Configuration:**
- [ ] Phone number webhooks are configured
- [ ] Account SID and Auth Token are correct
- [ ] Phone number is active and verified

### **✅ AI Services:**
- [ ] Reverie API key is valid
- [ ] Groq API key is valid
- [ ] All API quotas are sufficient

## 🧪 **Production Testing**

### **1. Test Webhook Endpoint:**
```bash
# Test the webhook endpoint
curl -X POST https://your-production-domain.com/api/twilio/call-status \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&CallStatus=completed&To=+919531670207&From=+12202443519"
```

### **2. Test Real Call:**
```bash
# Run production call test
node backend/testCalling.js
```

### **3. Monitor Logs:**
Look for these logs in production:
```
🌐 Using BASE_URL: https://your-production-domain.com
📞 Making call to +919531670207 for campaign test-campaign
✅ Call log (pre-call) saved to database
📞 Call initiated to +919531670207: SID CA1234567890abcdef
📞 Webhook HIT - handleCallStatus
📞 Call CA1234567890abcdef status: ringing
✅ [DB] Existing call log updated
```

## 🚨 **Production Monitoring**

### **Key Metrics to Monitor:**
1. **Webhook Success Rate**: Should be 100%
2. **Call Log Creation**: All calls should have database entries
3. **API Response Times**: Twilio API calls should be fast
4. **Error Rates**: Should be minimal

### **Log Monitoring:**
```bash
# Monitor webhook hits
tail -f logs/server.log | grep "Webhook HIT"

# Monitor call status updates
tail -f logs/server.log | grep "Call.*status:"

# Monitor database operations
tail -f logs/server.log | grep "\[DB\]"
```

## 🔒 **Security Considerations**

### **Environment Variables:**
- [ ] All sensitive keys are in environment variables
- [ ] No hardcoded credentials in code
- [ ] Production keys are different from development

### **API Security:**
- [ ] HTTPS is enforced
- [ ] API rate limiting is configured
- [ ] Input validation is in place

### **Database Security:**
- [ ] Database is not publicly accessible
- [ ] Strong authentication is used
- [ ] Regular backups are configured

## 📊 **Performance Optimization**

### **Database Indexes:**
```javascript
// Add these indexes to your CallLog collection
db.calllogs.createIndex({ "callSid": 1 });
db.calllogs.createIndex({ "campaignId": 1 });
db.calllogs.createIndex({ "createdAt": -1 });
```

### **Caching:**
- Consider adding Redis for session management
- Cache frequently accessed campaign data

### **Load Balancing:**
- Use multiple server instances
- Configure proper load balancing

## 🆘 **Troubleshooting Production Issues**

### **Common Production Issues:**

1. **Webhooks Not Reaching Server:**
   - Check firewall settings
   - Verify BASE_URL is correct
   - Test endpoint manually

2. **Database Connection Issues:**
   - Check MongoDB connection string
   - Verify network connectivity
   - Check database authentication

3. **Twilio API Errors:**
   - Verify account credentials
   - Check account balance
   - Review API quotas

4. **Performance Issues:**
   - Monitor server resources
   - Check database performance
   - Review API response times

## 📞 **Support Contacts**

- **Twilio Support**: https://support.twilio.com/
- **Reverie Support**: Contact via email
- **Groq Support**: https://console.groq.com/support

## 🎯 **Go-Live Checklist**

- [ ] All environment variables are set
- [ ] Twilio webhooks are configured
- [ ] Database is running and accessible
- [ ] Server is publicly accessible
- [ ] HTTPS is enabled
- [ ] Test calls are working
- [ ] Webhook logs are appearing
- [ ] Call logs are being saved
- [ ] Monitoring is set up
- [ ] Error handling is in place

**Ready for Production! 🚀** 
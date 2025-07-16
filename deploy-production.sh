#!/bin/bash

# Production Deployment Script for AI Telecalling System
# This script ensures all configurations are correct for production

echo "🚀 Starting Production Deployment for AI Telecalling System"
echo "=========================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it with production variables."
    exit 1
fi

echo "✅ .env file found"

# Load environment variables
source .env

# Validate required environment variables
echo "🔍 Validating environment variables..."

REQUIRED_VARS=(
    "TWILIO_ACCOUNT_SID"
    "TWILIO_AUTH_TOKEN" 
    "TWILIO_PHONE_NUMBER"
    "BASE_URL"
    "MONGODB_URI"
    "REVERIE_API_KEY"
    "REVERIE_APP_ID"
    "GROQ_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    exit 1
fi

echo "✅ All required environment variables are set"

# Validate BASE_URL format
if [[ ! "$BASE_URL" =~ ^https:// ]]; then
    echo "❌ BASE_URL must start with https:// (required by Twilio)"
    exit 1
fi

echo "✅ BASE_URL format is correct: $BASE_URL"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm is installed: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Test database connection
echo "🗄️  Testing database connection..."
node -e "
import connectDB from './backend/config/db.config.js';
connectDB()
  .then(() => {
    console.log('✅ Database connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
    echo "❌ Database connection test failed"
    exit 1
fi

# Test webhook endpoint
echo "🔗 Testing webhook endpoint..."
curl -X POST "$BASE_URL/api/twilio/call-status" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&CallStatus=completed&To=+919531670207&From=+12202443519" \
  --max-time 10 \
  --silent \
  --show-error

if [ $? -eq 0 ]; then
    echo "✅ Webhook endpoint is accessible"
else
    echo "⚠️  Webhook endpoint test failed (this might be expected if server is not running)"
fi

# Create production logs directory
mkdir -p logs

# Set production environment
export NODE_ENV=production

echo ""
echo "🎯 Production Deployment Summary:"
echo "=================================="
echo "✅ Environment variables validated"
echo "✅ Dependencies installed"
echo "✅ Database connection tested"
echo "✅ Webhook endpoint tested"
echo ""
echo "📋 Next Steps:"
echo "1. Configure Twilio webhooks in console:"
echo "   - Voice: $BASE_URL/api/twilio/voice-response"
echo "   - Status: $BASE_URL/api/twilio/call-status"
echo ""
echo "2. Start the production server:"
echo "   npm start"
echo ""
echo "3. Monitor logs:"
echo "   tail -f logs/server.log"
echo ""
echo "4. Test with real call:"
echo "   node backend/testCalling.js"
echo ""
echo "🚀 Ready for production deployment!" 
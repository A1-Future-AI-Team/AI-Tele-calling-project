# AI Telecalling Application

A complete AI-powered telecalling web application with Twilio integration, Reverie TTS/STT, and Groq LLM.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm run install-backend

# Start the application
npm start
```

### Docker Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Or use the deployment script
./docker-deploy.sh  # Linux/Mac
docker-deploy.bat   # Windows
```

## 🌐 Hugging Face Spaces Deployment

This application is configured for deployment on Hugging Face Spaces.

### Environment Variables Setup

In your Hugging Face Space, go to **Settings** → **Repository secrets** and add the following environment variables:

#### Required Environment Variables:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | `AC3e9e1c30c7c3f0f03f95087a8844c1b8` |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Your Twilio Phone Number | `+12202443519` |
| `REVERIE_API_KEY` | Reverie TTS/STT API Key | `87ccfe93b075e81ac7b39daa5f4b48ee1980693a` |
| `REVERIE_APP_ID` | Reverie Application ID | `dev.marutawa` |
| `GROQ_API_KEY` | Your Groq API Key | `your_groq_api_key_here` |
| `BASE_URL` | Your Hugging Face Space URL | `https://your-username-ai-telecalling.hf.space` |
| `SESSION_SECRET` | Session Secret Key | `your_random_session_secret` |
| `MONGODB_URI` | MongoDB Connection String | `mongodb+srv://username:password@cluster.mongodb.net/ai_telecalling` |

#### Optional Environment Variables:

| Variable Name | Description | Default Value |
|---------------|-------------|---------------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `VERBOSE_LOGS` | Enable verbose logging | `false` |

### How to Add Environment Variables:

1. **Go to your Hugging Face Space**
2. **Click on "Settings"** (gear icon)
3. **Navigate to "Repository secrets"**
4. **Click "New secret"**
5. **Add each variable** with its corresponding value
6. **Save the secret**

### Important Notes for Hugging Face Spaces:

1. **MongoDB**: You'll need to use a cloud MongoDB service (MongoDB Atlas) since Hugging Face Spaces doesn't support running MongoDB containers.

2. **BASE_URL**: This should be your Hugging Face Space URL, which will be in the format: `https://your-username-ai-telecalling.hf.space`

3. **Twilio Webhooks**: Update your Twilio webhook URLs to point to your Hugging Face Space:
   - Voice Response: `https://your-username-ai-telecalling.hf.space/api/twilio/voice-response`
   - Status Callback: `https://your-username-ai-telecalling.hf.space/api/twilio/call-status`

4. **File Storage**: Hugging Face Spaces has limited file storage, so audio files and uploads may need to be stored externally.

## 📋 Features

- **AI-Powered Conversations**: Uses Groq LLM for intelligent responses
- **Multi-language Support**: Hindi, English, Bengali with Reverie TTS/STT
- **Twilio Integration**: Complete telecalling functionality
- **Campaign Management**: Create and manage calling campaigns
- **Call Logs & Transcripts**: Track all conversations
- **Modern UI**: Corporate Memphis design with responsive layout

## 🛠️ Tech Stack

- **Backend**: Node.js + Express + MongoDB
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI**: Groq LLM (llama3-8b-8192)
- **TTS/STT**: Reverie API
- **Telecalling**: Twilio
- **Deployment**: Docker, Hugging Face Spaces

## 📞 API Endpoints

- `GET /` - Main application
- `GET /health` - Health check
- `POST /api/auth/*` - Authentication
- `POST /api/campaign/*` - Campaign management
- `POST /api/twilio/*` - Twilio webhooks
- `GET /api/transcript/*` - Transcript management

## 🔧 Development

```bash
# Install dependencies
npm run install-backend

# Start development server
npm run dev

# Start frontend (optional)
npm run frontend
```

## 📦 Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔒 Security

- Environment variables for sensitive data
- CORS configuration
- Helmet.js for security headers
- Input validation and sanitization

## 📊 Monitoring

- Health check endpoint: `/health`
- Application logs
- Call status tracking
- Error monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For issues and questions:
- Check the documentation
- Review logs and error messages
- Test with the health endpoint
- Verify environment variables are set correctly
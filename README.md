# AI Telecalling Project

Complete AI-powered telecalling web application with Twilio integration, Reverie TTS/STT, and Groq LLM.

## Quick Start

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Return to project root
cd ..
```

### 2. Environment Configuration
Create a `.env` file in the `backend` directory:
```bash
# MongoDB
MONGO_URI=mongodb://localhost:27017/ai-telecalling

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+12202443519

# Reverie TTS/STT
REVERIE_API_KEY=87ccfe93b075e81ac7b39daa5f4b48ee1980693a
REVERIE_APP_ID=dev.marutawa

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Base URL for webhooks
BASE_URL=https://your-webhook-url.com
```

### 3. Start the Application

#### Method 1: Using npm scripts (Recommended)
```bash
# Start backend server
npm start

# Or for development with auto-restart
npm run dev
```

#### Method 2: Direct command
```bash
# Navigate to backend directory
cd backend

# Start the server
node app.js
```

#### Method 3: Start frontend separately (optional)
```bash
# Start frontend on port 8080
npm run frontend
```

### 4. Access the Application
- **Web Interface**: `http://localhost:3000`
- **API Endpoints**: `http://localhost:3000/api/`

## Features

### ✅ Complete AI Conversation Flow
1. **Campaign Creation**: Upload CSV contacts via web dashboard
2. **Real Twilio Calls**: Makes actual phone calls to all contacts
3. **AI-Generated Opening**: Uses campaign context to create personalized opening messages
4. **Multi-Language Support**: 11+ Indian languages with native TTS
5. **Dynamic Conversations**: STT → AI → TTS loop for natural conversations
6. **Call Recording**: Full conversation logging and transcription

### 🌍 Supported Languages
- English
- Hindi
- Bengali
- Tamil
- Telugu
- Malayalam
- Kannada
- Gujarati
- Punjabi
- Marathi
- Urdu

### 🔧 Technical Stack
- **Backend**: Node.js + Express + MongoDB
- **Frontend**: Vanilla HTML/CSS/JS with Corporate Memphis design
- **TTS**: Reverie TTS API (WAV format)
- **STT**: Reverie STT API
- **AI**: Groq LLM (llama3-8b-8192)
- **Telecalling**: Twilio API

## API Endpoints

### Campaign Management
- `POST /api/campaign/start` - Create new campaign with CSV upload
- `GET /api/campaign/list` - List all campaigns
- `GET /api/campaign/:id` - Get campaign details
- `GET /api/campaign/:id/stats` - Get campaign statistics

### Twilio Webhooks
- `POST /api/twilio/voice-response` - Main voice response handler
- `POST /api/twilio/transcribe` - Audio transcription handler
- `POST /api/twilio/call-status` - Call status updates

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

## Usage

### 1. Create a Campaign
1. Access the web dashboard at `http://localhost:3000`
2. Upload a CSV file with columns: `name`, `phone`
3. Select language (Hindi, English, etc.)
4. Enter calling objective (e.g., "Ask users for feedback on their recent purchase")
5. Optional: Add example call flow
6. Click "Start Campaign"

### 2. Campaign Execution
- System automatically makes real Twilio calls to all contacts
- Each call uses AI-generated opening message in selected language
- Users can speak back, triggering AI conversations
- Full conversation flow: TTS → User Speech → STT → AI → TTS → Loop

### 3. Monitor Results
- View call logs and transcriptions in the dashboard
- Track campaign performance and success rates
- Access individual conversation transcripts

## Troubleshooting

### Common Issues

1. **"Cannot find module" error**
   ```bash
   # Make sure you're in the correct directory
   cd backend
   npm install
   node app.js
   ```

2. **"this.mapLanguageToSpeaker is not a function"**
   - Fixed: Controller methods are now properly bound

3. **Language mismatch**
   - Fixed: Dashboard now uses full language names (e.g., "Hindi" instead of "hi")

4. **MongoDB connection error**
   - Ensure MongoDB is running
   - Check MONGO_URI in .env file

5. **Twilio webhook errors**
   - Verify webhook URLs are accessible
   - Check Twilio credentials in .env file

### Testing

#### Test AI Response
```bash
cd backend
node testLLM.js
```

#### Test TTS Generation
```bash
cd backend
node testCalling.js
```

#### Test Simple Call
```bash
cd backend
node testSimpleCall.js
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/ai-telecalling` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC3e9e1c30c7c3f0f03f95087a8844c1b8` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number | `+12202443519` |
| `REVERIE_API_KEY` | Reverie API Key | `87ccfe93b075e81ac7b39daa5f4b48ee1980693a` |
| `REVERIE_APP_ID` | Reverie App ID | `dev.marutawa` |
| `GROQ_API_KEY` | Groq API Key | `your_groq_api_key` |
| `BASE_URL` | Webhook Base URL | `https://your-domain.com` |

## Architecture

```
├── backend/
│   ├── app.js              # Main Express application
│   ├── controllers/        # Route handlers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── public/audio/      # Generated TTS files
├── frontend/
│   ├── index.html         # Login page
│   ├── dashboard.html     # Main dashboard
│   ├── scripts/           # Frontend JavaScript
│   └── styles/            # CSS files
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.
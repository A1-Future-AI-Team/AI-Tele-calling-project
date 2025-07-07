import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.config.js';

// Import routes
import authRoutes from './routes/auth.route.js';
import campaignRoutes from './routes/campaign.route.js';
import twilioRoutes from './routes/twilio.route.js';
import ttsRoutes from './routes/tts.route.js';
import callLogRoutes from './routes/calllog.route.js';
import transcriptRoutes from './routes/transcript.route.js';

dotenv.config();

// Get current directory for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

        connectDB();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Add trust proxy for cloudflare tunnel
    this.app.set('trust proxy', true);
    
    // Log BASE_URL at startup
    console.log('🌐 Using BASE_URL:', process.env.BASE_URL || 'NOT SET');
    
    this.app.use(helmet());
    this.app.use(cors({
            origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
    }));
    this.app.use(morgan('combined'));
    
    // Fix: Use extended: false for Twilio form-encoded data
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json({ limit: '10mb' }));
    
        // Serve frontend static files
        this.app.use(express.static(path.join(__dirname, '..', 'frontend')));
        this.app.use('/public', express.static(path.join(__dirname, 'public')));
        
        // Serve audio files directly under /audio path for TTS with proper headers
        this.app.use('/audio', (req, res, next) => {
            // Set proper headers based on file extension
            const fileExt = path.extname(req.path).toLowerCase();
            
            if (fileExt === '.wav') {
                res.setHeader('Content-Type', 'audio/wav');
            } else if (fileExt === '.mp3') {
                res.setHeader('Content-Type', 'audio/mpeg');
            } else {
                res.setHeader('Content-Type', 'audio/mpeg'); // Default fallback
            }
            
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            next();
        }, express.static(path.join(__dirname, 'public', 'audio')));
  }

  initializeRoutes() {
        // API routes first
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/campaign', campaignRoutes);
        this.app.use('/api/twilio', twilioRoutes);
        this.app.use('/api/tts', ttsRoutes);
        this.app.use('/api', callLogRoutes);
        this.app.use('/api/transcript', transcriptRoutes);
        
        // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
                message: 'Backend server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

        // Frontend routes
    this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
        });
        
        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
        });
        
        this.app.get('/dashboard', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html'));
        });
        
        this.app.get('/logs', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'logs.html'));
        });
        
        this.app.get('/transcript-viewer', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'transcript-viewer.html'));
        });

        // Catch-all handler for frontend routes (SPA support)
        this.app.get('*', (req, res, next) => {
            // Skip API routes
            if (req.path.startsWith('/api/')) {
                return next();
            }
            
            // Serve index.html for frontend routes
            res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    });
  }

  initializeErrorHandling() {
        // 404 handler - must be placed after all other routes
        this.app.use((req, res, next) => {
      res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
      });
    });

    this.app.use((error, req, res, next) => {
      console.error('Error:', error);
      
      res.status(error.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  getApp() {
    return this.app;
  }

    listen() {
        this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
}

async function prewarmLLMandTTS() {
  if (process.env.NODE_ENV !== 'production') return; // Only prewarm in production
  try {
    const ttsService = (await import('./services/tts.service.js')).default;
    const { generateReply } = await import('./services/llm.service.js');
    // Prewarm LLM
    await generateReply({
      objective: 'Prewarm',
      language: 'English',
      sampleFlow: '',
      conversationHistory: [],
      userInput: 'Hi', // Use shortest possible text
      systemPrompt: 'This is a prewarm request.'
    });
    // Prewarm TTS (do NOT save file, use shortest text)
    await ttsService.callReverieTTSAPI('Hi', 'en', 'female', 1.0, 1.0);
    console.log('✅ LLM and TTS prewarmed (production only)');
  } catch (err) {
    console.warn('⚠️ LLM/TTS prewarm failed:', err.message);
  }
}

prewarmLLMandTTS();

const application = new App();
application.listen();

export default application; 
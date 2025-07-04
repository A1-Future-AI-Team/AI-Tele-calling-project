import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import CampaignController from '../controllers/campaign.controller.js';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `campaign-${uniqueSuffix}${extension}`);
    }
});

// File filter to accept only CSV files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' || 
        path.extname(file.originalname).toLowerCase() === '.csv') {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'), false);
    }
};

// Configure multer with options
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Route definitions
router.post('/start', upload.single('csv'), CampaignController.startCampaign);
router.get('/list', CampaignController.getCampaigns);
router.get('/:id/stats', CampaignController.getCampaignStats);
router.get('/:id', CampaignController.getCampaignById);

// Real-time status monitoring routes
router.get('/:id/live-status', CampaignController.getCampaignLiveStatus);
router.get('/call-status/:callSid', CampaignController.getCallStatus);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + error.message
        });
    }
    
    if (error.message === 'Only CSV files are allowed') {
        return res.status(400).json({
            success: false,
            message: 'Only CSV files are allowed'
        });
    }
    
    next(error);
});

export default router; 
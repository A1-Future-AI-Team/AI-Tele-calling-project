import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import CampaignController from '../controllers/campaign.controller.js';

const router = express.Router();

// Create an instance of the controller
const campaignController = new CampaignController();

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

// File filter to accept CSV and PDF files
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'application/pdf'
    ];
    
    const allowedExtensions = ['.csv', '.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV and PDF files are allowed'), false);
    }
};

// Configure multer with options
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for PDF files
    }
});

// Route definitions
router.post('/start', upload.fields([
    { name: 'csv', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), campaignController.startCampaign.bind(campaignController));
router.get('/list', campaignController.getCampaigns.bind(campaignController));
router.get('/:id/stats', campaignController.getCampaignStats.bind(campaignController));
router.get('/:id', campaignController.getCampaignById.bind(campaignController));

// Real-time status monitoring routes
router.get('/:id/live-status', campaignController.getCampaignLiveStatus.bind(campaignController));
router.get('/call-status/:callSid', campaignController.getCallStatus.bind(campaignController));

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
    
    if (error.message === 'Only CSV and PDF files are allowed') {
        return res.status(400).json({
            success: false,
            message: 'Only CSV and PDF files are allowed'
        });
    }
    
    next(error);
});

export default router; 
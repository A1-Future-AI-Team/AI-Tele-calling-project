import express from 'express';
import authController from '../controllers/auth.controller.js';

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile/:userId', authController.getProfile);

export default router; 
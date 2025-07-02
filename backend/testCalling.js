import dotenv from 'dotenv';
dotenv.config();
import TwilioService from './services/twilio.service.js';

TwilioService.makeCall('+919531670207', 'test-campaign');
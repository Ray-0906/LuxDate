import { Router } from 'express';
import webhookController from '../controllers/webhook.controller.js';

const router = Router();

router.post('/razorpay', webhookController.razorpay);

export default router;

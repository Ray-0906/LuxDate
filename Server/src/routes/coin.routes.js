import { Router } from 'express';
import coinController from '../controllers/coin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/balance', coinController.getBalance);
router.get('/transactions', coinController.getTransactions);
router.post('/checkin', coinController.claimCheckin);

export default router;

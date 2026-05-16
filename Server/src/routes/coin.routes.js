import { Router } from 'express';
import coinController from '../controllers/coin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkinClaimLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/packs', coinController.getPacks);
router.get('/economy', coinController.getEconomy);
router.get('/balance', coinController.getBalance);
router.get('/transactions', coinController.getTransactions);
router.get('/checkin/status', coinController.getCheckinStatus);
router.post('/checkin', checkinClaimLimiter, coinController.claimCheckin);

export default router;

import { Router } from 'express';
import vipController from '../controllers/vip.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/plans', vipController.getPlans);
router.get('/status', vipController.getStatus);
router.post('/purchase', vipController.purchase);

export default router;

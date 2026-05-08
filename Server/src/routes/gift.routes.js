import { Router } from 'express';
import giftController from '../controllers/gift.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/catalog', giftController.getCatalog);
router.post('/send', giftController.sendGift);

export default router;

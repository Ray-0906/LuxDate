import { Router } from 'express';
import chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/inbox', chatController.getInbox);
router.get('/:girlId/messages', chatController.getMessages);
router.post('/:girlId/send', chatController.sendMessage);
router.delete('/clear-all', chatController.clearAll);

export default router;

import { Router } from 'express';
import chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/inbox', chatController.getInbox);
router.get('/trigger', chatController.triggerAutoMessage);
router.get('/prefetch', chatController.prefetchAutoMessages);
router.post('/deliver-prefetch', chatController.deliverPrefetchMessage);
router.get('/:girlId/messages', chatController.getMessages);
router.post('/:girlId/send', chatController.sendMessage);
router.delete('/conversation/:girlId', chatController.deleteConversation);
router.delete('/clear-all', chatController.clearAll);

export default router;


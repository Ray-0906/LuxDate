import { Router } from 'express';
import adminChatController from '../../controllers/admin/adminChat.controller.js';
import { authenticateAdmin } from '../../middleware/admin.middleware.js';

const router = Router();
router.use(authenticateAdmin);

router.get('/inbox', adminChatController.getInbox);
router.get('/:userId/:girlId/messages', adminChatController.getMessages);
router.post('/:userId/:girlId/send', adminChatController.sendAsGirl);
router.route('/auto-reply-pool')
  .get(adminChatController.manageAutoReplyPool)
  .post(adminChatController.manageAutoReplyPool);

export default router;

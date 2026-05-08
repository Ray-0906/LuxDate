import { Router } from 'express';
import videoCallController from '../controllers/videoCall.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/trigger', videoCallController.trigger);
router.post('/:callId/accept', videoCallController.acceptCall);
router.post('/:callId/end', videoCallController.endCall);
router.get('/history', videoCallController.history);

export default router;

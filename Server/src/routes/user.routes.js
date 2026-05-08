import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', userController.updateProfile);
router.post('/upload-photo', userController.uploadPhoto);
router.get('/wealth-levels', userController.getWealthLevels);

export default router;

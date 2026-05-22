import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { uploadSingleImage } from '../middleware/upload.middleware.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();
router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', validate(updateProfileSchema), userController.updateProfile);
router.post('/upload-photo', uploadSingleImage, userController.uploadPhoto);
router.get('/wealth-levels', userController.getWealthLevels);

export default router;

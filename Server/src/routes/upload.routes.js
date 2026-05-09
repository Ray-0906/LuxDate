import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { uploadSingleImage } from '../middleware/upload.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/image', uploadSingleImage, uploadImage);

export default router;

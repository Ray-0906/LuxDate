import { Router } from 'express';
import adminGirlController from '../../controllers/admin/adminGirl.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import { uploadProfilePhoto, uploadMultipleImages, uploadSingleVideo } from '../../middleware/upload.middleware.js';
import { createGirlSchema, updateGirlSchema } from '../../validators/admin.validator.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();

// All routes require admin auth + manage_girls permission
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_GIRLS));

// Girl CRUD
router.get('/', adminGirlController.list);
router.get('/:girlId', adminGirlController.getById);
router.post('/', uploadProfilePhoto, validate(createGirlSchema), adminGirlController.create);
router.put('/:girlId', validate(updateGirlSchema), adminGirlController.update);
router.delete('/:girlId', adminGirlController.delete);

// Photo management
router.put('/:girlId/photo', uploadProfilePhoto, adminGirlController.updatePhoto);
router.post('/:girlId/photos', uploadMultipleImages, adminGirlController.addPhotos);

// Video management
router.get('/:girlId/videos', adminGirlController.listVideos);
router.post('/:girlId/videos', uploadSingleVideo, adminGirlController.uploadVideo);
router.delete('/videos/:videoId', adminGirlController.deleteVideo);
router.patch('/videos/:videoId/toggle', adminGirlController.toggleVideoStatus);

export default router;

import { Router } from 'express';
import adminGiftController from '../../controllers/admin/adminGift.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import { uploadSingleImage } from '../../middleware/upload.middleware.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_GIFTS));

router.get('/', adminGiftController.list);
router.post('/', uploadSingleImage, adminGiftController.create);
router.put('/:giftId', adminGiftController.update);
router.delete('/:giftId', adminGiftController.delete);
router.get('/stats', adminGiftController.getStats);

export default router;

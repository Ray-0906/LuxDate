import { Router } from 'express';
import adminCoinPackController from '../../controllers/admin/adminCoinPack.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_COINS));

router.get('/', adminCoinPackController.list);
router.post('/', adminCoinPackController.create);
router.put('/:packId', adminCoinPackController.update);
router.delete('/:packId', adminCoinPackController.remove);

export default router;

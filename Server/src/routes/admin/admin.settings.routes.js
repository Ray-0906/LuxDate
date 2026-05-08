import { Router } from 'express';
import adminSettingsController from '../../controllers/admin/adminSettings.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS));

router.get('/', adminSettingsController.getAll);
router.post('/', adminSettingsController.set);
router.delete('/:key', adminSettingsController.delete);
router.post('/seed', adminSettingsController.seedDefaults);
router.get('/call-logs', adminSettingsController.getCallLogs);

export default router;

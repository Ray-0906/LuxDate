import { Router } from 'express';
import adminPaymentController from '../../controllers/admin/adminPayment.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS));

router.get('/transactions', adminPaymentController.list);

export default router;

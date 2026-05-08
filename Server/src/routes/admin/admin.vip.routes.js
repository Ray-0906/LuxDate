import { Router } from 'express';
import adminVipController from '../../controllers/admin/adminVip.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_VIP));

router.get('/plans', adminVipController.listPlans);
router.post('/plans', adminVipController.createPlan);
router.put('/plans/:planId', adminVipController.updatePlan);
router.delete('/plans/:planId', adminVipController.deletePlan);
router.get('/subscriptions', adminVipController.listSubscriptions);

export default router;

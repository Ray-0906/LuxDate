import { Router } from 'express';
import adminUserController from '../../controllers/admin/adminUser.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();

// All routes require admin auth + manage_users permission
router.use(authenticateAdmin, requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS));

router.get('/', adminUserController.list);
router.get('/:userId', adminUserController.getById);
router.patch('/:userId/block', adminUserController.toggleBlock);
router.post('/:userId/coins/add', adminUserController.addCoins);
router.post('/:userId/coins/deduct', adminUserController.deductCoins);
router.get('/:userId/transactions', adminUserController.getTransactions);

export default router;

import { Router } from 'express';
import adminAuthController from '../../controllers/admin/adminAuth.controller.js';
import { authenticateAdmin, requirePermission } from '../../middleware/admin.middleware.js';
import validate from '../../middleware/validate.middleware.js';
import { authLimiter } from '../../middleware/rateLimiter.middleware.js';
import { adminLoginSchema, createAdminSchema } from '../../validators/admin.validator.js';
import { refreshTokenSchema } from '../../validators/auth.validator.js';
import { ADMIN_PERMISSIONS } from '../../utils/constants.js';

const router = Router();

// Public admin routes
router.post('/login', authLimiter, validate(adminLoginSchema), adminAuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), adminAuthController.refreshToken);

// Protected admin routes
router.get('/me', authenticateAdmin, adminAuthController.getMe);
router.post('/logout', authenticateAdmin, adminAuthController.logout);

// Super admin only — manage sub-admins
router.get(
  '/admins',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.MANAGE_ADMINS),
  adminAuthController.listAdmins
);

router.post(
  '/admins',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.MANAGE_ADMINS),
  validate(createAdminSchema),
  adminAuthController.createAdmin
);

router.put(
  '/admins/:adminId',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.MANAGE_ADMINS),
  adminAuthController.updateAdmin
);

export default router;

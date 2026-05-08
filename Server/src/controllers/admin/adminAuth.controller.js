import adminAuthService from '../../services/admin/adminAuth.service.js';
import ApiResponse from '../../utils/response.js';

/**
 * Admin auth controller — thin HTTP layer for admin authentication.
 */
const adminAuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await adminAuthService.login(email, password);
      return ApiResponse.success(res, {
        data: { admin: result.admin, tokens: result.tokens },
        message: 'Admin login successful',
      });
    } catch (error) {
      console.error('Admin login error:', error);
      next(error);
    }
  },

  async createAdmin(req, res, next) {
    try {
      const admin = await adminAuthService.createAdmin(req.body);
      return ApiResponse.created(res, {
        data: { admin },
        message: 'Admin created',
      });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await adminAuthService.refreshToken(refreshToken);
      return ApiResponse.success(res, { data: result, message: 'Token refreshed' });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await adminAuthService.logout(req.admin._id);
      return ApiResponse.success(res, { message: 'Admin logged out' });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      return ApiResponse.success(res, { data: { admin: req.admin } });
    } catch (error) {
      next(error);
    }
  },

  async listAdmins(req, res, next) {
    try {
      const admins = await adminAuthService.listAdmins();
      return ApiResponse.success(res, { data: { admins } });
    } catch (error) {
      next(error);
    }
  },

  async updateAdmin(req, res, next) {
    try {
      const admin = await adminAuthService.updateAdmin(req.params.adminId, req.body);
      return ApiResponse.success(res, { data: { admin }, message: 'Admin updated' });
    } catch (error) {
      next(error);
    }
  },
};

export default adminAuthController;

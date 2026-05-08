import authService from '../services/auth.service.js';
import FakeInteractionEngine from '../engines/FakeInteractionEngine.js';
import ApiResponse from '../utils/response.js';

/**
 * Auth controller — thin HTTP layer. All logic lives in authService.
 */
const authController = {
  async sendOtp(req, res, next) {
    try {
      const { phone } = req.body;
      const result = await authService.sendOtp(phone);
      return ApiResponse.success(res, { data: result, message: 'OTP sent' });
    } catch (error) {
      next(error);
    }
  },

  async verifyOtp(req, res, next) {
    try {
      const { phone, otp } = req.body;
      const result = await authService.verifyOtp(phone, otp);

      // Fire registration messages for new users (async, don't block)
      if (result.isNewUser) {
        FakeInteractionEngine.sendRegistrationMessages(result.user._id).catch(() => {});
      }

      return ApiResponse.success(res, {
        data: {
          user: result.user,
          tokens: result.tokens,
          isNewUser: result.isNewUser,
          requiresOnboarding: result.requiresOnboarding,
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  },

  async googleLogin(req, res, next) {
    try {
      const { idToken } = req.body;
      const result = await authService.googleLogin(idToken);
      return ApiResponse.success(res, { data: result });
    } catch (error) {
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return ApiResponse.success(res, { data: result, message: 'Token refreshed' });
    } catch (error) {
      next(error);
    }
  },

  async completeOnboarding(req, res, next) {
    try {
      const user = await authService.completeOnboarding(req.user._id, req.body);
      return ApiResponse.success(res, { data: { user }, message: 'Onboarding complete' });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await authService.logout(req.user._id);
      return ApiResponse.success(res, { message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      return ApiResponse.success(res, { data: { user: req.user } });
    } catch (error) {
      next(error);
    }
  },
};

export default authController;

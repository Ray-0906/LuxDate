import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
  refreshTokenSchema,
  onboardingSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes (rate-limited)
router.post('/send-otp', authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/google-login', authLimiter, validate(googleLoginSchema), authController.googleLogin);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post('/onboarding', authenticate, validate(onboardingSchema), authController.completeOnboarding);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;

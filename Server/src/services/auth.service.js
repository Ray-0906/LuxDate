import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import otpService from './otp.service.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';
import { DEFAULTS } from '../utils/constants.js';

/**
 * Auth service — handles all authentication business logic.
 */
const authService = {
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId, type: 'user' },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.accessExpiry }
    );
    const refreshToken = jwt.sign(
      { userId, type: 'user' },
      env.jwt.refreshSecret,
      { expiresIn: env.jwt.refreshExpiry }
    );
    return { accessToken, refreshToken };
  },

  async sendOtp(phone) {
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.isBlocked) {
      throw new UnauthorizedError('Account has been blocked');
    }
    return otpService.sendOtp(phone);
  },

  async verifyOtp(phone, otp) {
    const result = await otpService.verifyOtp(phone, otp);
    if (!result.valid) {
      throw new ValidationError(result.message);
    }

    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        phone,
        username: `user_${Date.now().toString(36)}`,
        freeCallsRemaining: DEFAULTS.FREE_CALLS,
      });
      isNewUser = true;
    }

    if (user.isBlocked) {
      throw new UnauthorizedError('Account has been blocked');
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    user.lastActiveAt = new Date();
    await user.save();

    return {
      user,
      tokens,
      isNewUser,
      requiresOnboarding: !user.name,
    };
  },

  async googleLogin(idToken) {
    throw new ValidationError('Google login not yet configured — set up Firebase Admin SDK');
  },

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    if (user.isBlocked) {
      throw new UnauthorizedError('Account has been blocked');
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { tokens };
  },

  async completeOnboarding(userId, { name, age, gender, username }) {
    const user = await User.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');

    if (name) user.name = name;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (username) user.username = username;
    await user.save();
    return user;
  },

  async setProfilePhoto(userId, photoUrl) {
    const user = await User.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    user.profilePhotoUrl = photoUrl;
    await user.save();
    return user;
  },

  async logout(userId) {
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      lastActiveAt: new Date(),
    });
  },
};

export default authService;

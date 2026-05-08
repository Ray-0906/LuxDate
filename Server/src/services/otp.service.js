import logger from '../utils/logger.js';
import { generateOtp } from '../utils/helpers.js';

/**
 * OTP Service — abstracts the OTP provider.
 * Currently uses a simple in-memory store for development.
 * Swap this with Firebase Auth, Twilio, or MSG91 for production.
 */

// In-memory OTP store (replace with Redis or Firebase in production)
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const otpService = {
  /**
   * Generate and "send" an OTP for a phone number.
   * In production, this calls the actual SMS provider.
   */
  async sendOtp(phone) {
    const otp = generateOtp(6);
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    otpStore.set(phone, { otp, expiresAt, attempts: 0 });

    // TODO: Replace with actual SMS provider call
    // await firebaseAdmin.auth().createUser({ phoneNumber: phone });
    // await twilioClient.messages.create({ ... });

    logger.info({ phone, otp }, 'OTP generated (dev mode — remove in production)');

    return { success: true, message: 'OTP sent successfully' };
  },

  /**
   * Verify an OTP for a phone number.
   */
  async verifyOtp(phone, otp) {
    const stored = otpStore.get(phone);

    if (!stored) {
      return { valid: false, message: 'OTP not found — request a new one' };
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return { valid: false, message: 'OTP has expired' };
    }

    stored.attempts += 1;
    if (stored.attempts > 5) {
      otpStore.delete(phone);
      return { valid: false, message: 'Too many attempts — request a new OTP' };
    }

    if (stored.otp !== otp) {
      return { valid: false, message: 'Invalid OTP' };
    }

    // OTP is valid — remove from store
    otpStore.delete(phone);
    return { valid: true, message: 'OTP verified' };
  },
};

export default otpService;

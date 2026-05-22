import Joi from 'joi';

export const sendOtpSchema = {
  body: Joi.object({
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{7,14}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be a valid international format',
      }),
  }),
};

export const verifyOtpSchema = {
  body: Joi.object({
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{7,14}$/)
      .required(),
    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must be numeric',
      }),
  }),
};

export const googleLoginSchema = {
  body: Joi.object({
    idToken: Joi.string().required(),
  }),
};

export const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const onboardingSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(50).optional(),
    age: Joi.number().integer().min(18).max(100).required(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    language: Joi.string().valid('English', 'Hindi', 'Bengali').optional(),
    username: Joi.string().trim().min(3).max(30).optional(),
    location: Joi.string().trim().max(100).optional(),
  }),
};

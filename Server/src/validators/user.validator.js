import Joi from 'joi';

export const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(50).optional(),
    username: Joi.string().trim().min(3).max(30).optional(),
    age: Joi.number().integer().min(18).max(100).optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    bio: Joi.string().trim().allow('').max(500).optional(),
    language: Joi.string().valid('English', 'Hindi', 'Bengali').optional(),
    location: Joi.string().trim().max(100).optional(),
    profilePhotoUrl: Joi.string().uri().optional(),
    fcmToken: Joi.string().optional(),
  }),
};

export const userIdParamSchema = {
  params: Joi.object({
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
      }),
  }),
};

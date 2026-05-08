import Joi from 'joi';

export const adminLoginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }),
};

export const createAdminSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().trim().min(1).max(100).required(),
    role: Joi.string().valid('admin', 'sub_admin').default('sub_admin'),
    permissions: Joi.array().items(Joi.string()).default([]),
  }),
};

export const createGirlSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    age: Joi.number().integer().min(18).max(100).required(),
    bio: Joi.string().trim().max(500).optional().default(''),
    location: Joi.string().trim().max(100).optional().default(''),
    tags: Joi.array().items(Joi.string().trim()).optional().default([]),
    followers: Joi.number().integer().min(0).optional(),
    likes: Joi.number().integer().min(0).optional(),
  }),
};

export const updateGirlSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    age: Joi.number().integer().min(18).max(100).optional(),
    bio: Joi.string().trim().max(500).optional(),
    location: Joi.string().trim().max(100).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    isOnline: Joi.boolean().optional(),
    isLive: Joi.boolean().optional(),
    followers: Joi.number().integer().min(0).optional(),
    likes: Joi.number().integer().min(0).optional(),
  }),
};

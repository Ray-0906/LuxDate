import Joi from 'joi';

export const sendMessageSchema = {
  body: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
  }),
};

export const conversationIdParamSchema = {
  params: Joi.object({
    conversationId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),
};

export const startConversationSchema = {
  params: Joi.object({
    girlId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),
};

export const swipeSchema = {
  body: Joi.object({
    girlId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
    action: Joi.string().valid('like', 'skip').required(),
  }),
};

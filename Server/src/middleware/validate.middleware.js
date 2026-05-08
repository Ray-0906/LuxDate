import { ValidationError } from '../utils/errors.js';

/**
 * Create a validation middleware from a Joi schema.
 * Validates req.body, req.query, and req.params based on schema keys.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema with body/query/params keys
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationErrors = [];

    for (const key of ['body', 'query', 'params']) {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          const errors = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/"/g, ''),
          }));
          validationErrors.push(...errors);
        } else {
          // Replace with validated + sanitized values
          req[key] = value;
        }
      }
    }

    if (validationErrors.length > 0) {
      return next(new ValidationError('Validation failed', validationErrors));
    }

    next();
  };
};

export default validate;

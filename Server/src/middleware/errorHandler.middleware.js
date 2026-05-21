import { AppError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Global error handler — must be registered last in the middleware chain.
 * Catches all errors thrown by controllers and services.
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors && !err.statusCode) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    console.log("Validation errors:", err);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // Our custom AppError hierarchy
  if (err instanceof AppError) {
    const body = {
      success: false,
      message: err.message,
    };
    if (err instanceof ValidationError && err.errors) {
      body.errors = err.errors;
    }
    return res.status(err.statusCode).json(body);
  }

  // Unexpected errors
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
    },
    url: req.originalUrl,
    method: req.method,
  }, 'Unhandled error');

  const message = env.isProd ? 'Internal server error' : err.message;
  return res.status(500).json({
    success: false,
    message,
  });
};

export default errorHandler;

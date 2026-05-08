import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Authenticate user via Bearer JWT token.
 * Attaches the full user document to req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.accessSecret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.isBlocked) {
      throw new UnauthorizedError('Account has been blocked');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
};

/**
 * Optional auth — sets req.user if a valid token is present, otherwise continues.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findById(decoded.userId);

    if (user && !user.isBlocked) {
      req.user = user;
    }
  } catch {
    // Silently continue without auth
  }
  next();
};

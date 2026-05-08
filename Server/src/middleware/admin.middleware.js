import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Authenticate admin via Bearer JWT token.
 * Attaches the admin document to req.admin.
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.accessSecret);

    if (decoded.type !== 'admin') {
      throw new UnauthorizedError('Invalid admin token');
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Admin account deactivated');
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
};

/**
 * Check if admin has the required permission(s).
 * Super admins (role === 'admin') bypass permission checks.
 */
export const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    // Super admin bypasses all permission checks
    if (req.admin.role === 'admin') {
      return next();
    }

    const hasPermission = permissions.every((perm) =>
      req.admin.permissions.includes(perm)
    );

    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

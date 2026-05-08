import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import Admin from '../../models/Admin.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../utils/errors.js';
import { USER_ROLES } from '../../utils/constants.js';

/**
 * Admin auth service — handles admin authentication and sub-admin management.
 */
const adminAuthService = {
  /**
   * Generate admin JWT token pair.
   */
  generateTokens(adminId) {
    const accessToken = jwt.sign(
      { adminId, type: 'admin' },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.accessExpiry }
    );

    const refreshToken = jwt.sign(
      { adminId, type: 'admin' },
      env.jwt.refreshSecret,
      { expiresIn: env.jwt.refreshExpiry }
    );

    return { accessToken, refreshToken };
  },

  /**
   * Admin login with email + password.
   */
  async login(email, password) {
    console.log('Admin login attempt:', email);
    console.log('Admin login attempt:', password);
    const admin = await Admin.findOne({ email});
    console.log('Admin found:', admin);
    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Account deactivated');
    }

    let isMatch = false;
    
    // Developer Fix: If admin password in database is plaintext (doesn't start with a bcrypt hash pattern), 
    // allow matching plaintext, then automatically secure it with bcrypt for the future.
    if (!admin.password.startsWith('$2a$') && !admin.password.startsWith('$2b$')) {
      console.log('Plaintext password detected in DB. Migrating to bcrypted hash...');
      isMatch = (password === admin.password);
      if (isMatch) {
        admin.password = password; // Trigger the Mongoose pre('save') hook
        await admin.save();
      }
    } else {
      isMatch = await admin.comparePassword(password);
    }

    if (!isMatch) {
       console.log('Password mismatch for admin:', email);
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = this.generateTokens(admin._id);
    admin.refreshToken = tokens.refreshToken;
    await admin.save();

    return { admin, tokens };
  },

  /**
   * Create a new admin or sub-admin account.
   */
  async createAdmin({ email, password, name, role, permissions }) {
    const existing = await Admin.findOne({ email });
    if (existing) {
      throw new ConflictError('Admin with this email already exists');
    }

    const admin = await Admin.create({
      email,
      password,
      name,
      role: role || USER_ROLES.SUB_ADMIN,
      permissions: permissions || [],
    });

    return admin;
  },

  /**
   * Refresh admin access token.
   */
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

    if (decoded.type !== 'admin') {
      throw new UnauthorizedError('Invalid admin refresh token');
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin || admin.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokens = this.generateTokens(admin._id);
    admin.refreshToken = tokens.refreshToken;
    await admin.save();

    return { tokens };
  },

  /**
   * Logout — clear refresh token.
   */
  async logout(adminId) {
    await Admin.findByIdAndUpdate(adminId, { refreshToken: null });
  },

  /**
   * List all admins (for super admin).
   */
  async listAdmins() {
    return Admin.find().sort({ createdAt: -1 }).lean();
  },

  /**
   * Update admin (toggle active, update permissions).
   */
  async updateAdmin(adminId, updates) {
    const admin = await Admin.findById(adminId);
    if (!admin) throw new NotFoundError('Admin not found');

    if (updates.permissions) admin.permissions = updates.permissions;
    if (typeof updates.isActive === 'boolean') admin.isActive = updates.isActive;
    if (updates.name) admin.name = updates.name;

    await admin.save();
    return admin;
  },
};

export default adminAuthService;

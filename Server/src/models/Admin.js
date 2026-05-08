import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { USER_ROLES, ADMIN_PERMISSIONS } from '../utils/constants.js';

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [USER_ROLES.ADMIN, USER_ROLES.SUB_ADMIN],
      default: USER_ROLES.SUB_ADMIN,
    },
    permissions: [
      {
        type: String,
        enum: Object.values(ADMIN_PERMISSIONS),
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        delete ret.password;
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

// Hash password before saving
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;

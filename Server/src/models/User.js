import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, sparse: true, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    username: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    age: { type: Number, min: 18 },
    gender: { type: String, enum: ['male', 'female'], default: 'male' },
    location: { type: String, default: '' },
    profilePhotoUrl: { type: String, default: '' },

    // Economy
    coinBalance: { type: Number, default: 0, min: 0 },
    pointBalance: { type: Number, default: 0, min: 0 },
    totalCoinsEverSpent: { type: Number, default: 0, min: 0 },
    wealthLevel: { type: Number, default: 0, min: 0, max: 15 },
    freeCallsRemaining: { type: Number, default: 3, min: 0 },

    // VIP
    isVip: { type: Boolean, default: false },
    vipExpiresAt: { type: Date, default: null },
    vipFrameType: { type: String, default: 'none' },
    vipBadgeType: { type: String, default: 'none' },

    // Flags
    isBlocked: { type: Boolean, default: false },
    registrationMessagesSent: { type: Boolean, default: false },

    // Activity
    lastActiveAt: { type: Date, default: Date.now },

    // Auth
    refreshToken: { type: String, default: null },
    fcmToken: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

userSchema.index({ lastActiveAt: -1 });
userSchema.index({ wealthLevel: -1 });

const User = mongoose.model('User', userSchema);
export default User;

import mongoose from 'mongoose';

const vipSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'VipPlan', required: true },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    upfrontCoinsGranted: { type: Boolean, default: false },
    totalDays: { type: Number, required: true },
    dailyCheckinsClaimed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'expired', 'replaced'],
      default: 'active',
    },
    replacedAt: { type: Date, default: null },
    unclaimedCoinsForfeited: { type: Number, default: 0 },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

vipSubscriptionSchema.index({ userId: 1, status: 1 });
vipSubscriptionSchema.index({ expiresAt: 1 });

const VipSubscription = mongoose.model('VipSubscription', vipSubscriptionSchema);
export default VipSubscription;

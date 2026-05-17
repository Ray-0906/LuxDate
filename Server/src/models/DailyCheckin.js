import mongoose from 'mongoose';

const dailyCheckinSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    coinsAwarded: { type: Number, required: true },
    coinTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoinTransaction',
      default: null,
    },
    source: {
      type: String,
      enum: ['vip_plan', 'free_login'],
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VipSubscription',
      default: null,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VipPlan',
      default: null,
    },
    vipClaims: [
      {
        subscriptionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'VipSubscription',
          required: true,
        },
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'VipPlan',
          required: true,
        },
        coinsAwarded: { type: Number, required: true },
        coinTransactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CoinTransaction',
          default: null,
        },
        claimedAt: { type: Date, default: Date.now },
      },
    ],
    claimedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// One check-in per user per day
dailyCheckinSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyCheckin = mongoose.model('DailyCheckin', dailyCheckinSchema);
export default DailyCheckin;

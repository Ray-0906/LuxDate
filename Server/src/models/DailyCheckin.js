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
      enum: ['vip_plan', 'free_login', 'new_user'],
      required: true,
    },
    dayNumber: {
      type: Number,
      min: 1,
      max: 7,
      default: null,
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
        dayNumber: { type: Number, required: false },
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

// VIP rows keep one aggregate record per user/date, while new-user rows are per reward slot.
dailyCheckinSchema.index(
  { userId: 1, date: 1, source: 1 },
  { unique: true, partialFilterExpression: { source: 'vip_plan' } }
);
dailyCheckinSchema.index(
  { userId: 1, source: 1, dayNumber: 1 },
  { unique: true, partialFilterExpression: { source: 'new_user' } }
);

const DailyCheckin = mongoose.model('DailyCheckin', dailyCheckinSchema);
export default DailyCheckin;

import mongoose from 'mongoose';

const dailyCheckinSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    coinsAwarded: { type: Number, required: true },
    source: {
      type: String,
      enum: ['vip_plan', 'free_login'],
      required: true,
    },
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

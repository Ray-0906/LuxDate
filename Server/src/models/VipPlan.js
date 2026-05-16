import mongoose from 'mongoose';
import { VIP_TYPES } from '../utils/constants.js';

const vipPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(VIP_TYPES),
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    durationDays: { type: Number, required: true },
    upfrontCoins: { type: Number, default: 0 },
    dailyCheckinCoins: { type: Number, default: 0 },
    /** Optional UX total; must match upfrontCoins + dailyCheckinCoins * (durationDays - 1) */
    totalCoins: { type: Number, default: 0 },
    frameType: { type: String, default: 'none' },
    badgeType: { type: String, default: 'none' },
    bonusPerks: [{ type: String }],
    isActive: { type: Boolean, default: true },
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

const VipPlan = mongoose.model('VipPlan', vipPlanSchema);
export default VipPlan;

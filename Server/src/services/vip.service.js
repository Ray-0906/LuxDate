import VipPlan from '../models/VipPlan.js';
import VipSubscription from '../models/VipSubscription.js';
import User from '../models/User.js';
import MonetizationController from '../engines/MonetizationController.js';
import { COIN_TX_TYPES } from '../utils/constants.js';

const vipService = {
  async getPlans() {
    return VipPlan.find({ isActive: true }).sort({ price: 1 }).lean();
  },

  async purchase(userId, planId, paymentTransactionId = null) {
    const plan = await VipPlan.findById(planId);
    if (!plan || !plan.isActive) throw new Error('Plan not found');

    // Check for existing active subscription
    const existing = await VipSubscription.findOne({ userId, status: 'active' });
    if (existing) throw new Error('Already have an active VIP subscription');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    const sub = await VipSubscription.create({
      userId,
      planId,
      expiresAt,
      totalDays: plan.durationDays,
      paymentTransactionId,
      upfrontCoinsGranted: plan.upfrontCoins > 0,
    });

    // Grant upfront coins
    if (plan.upfrontCoins > 0) {
      await MonetizationController.grantCoins(
        userId, plan.upfrontCoins, COIN_TX_TYPES.PURCHASE,
        sub._id.toString(), `VIP upfront: ${plan.name}`
      );
    }

    // Update user VIP status
    await User.findByIdAndUpdate(userId, {
      isVip: true,
      vipExpiresAt: expiresAt,
    });

    return sub;
  },

  async checkExpiry() {
    // Cron job: expire old subscriptions
    const expired = await VipSubscription.find({
      status: 'active',
      expiresAt: { $lt: new Date() },
    });

    for (const sub of expired) {
      sub.status = 'expired';
      await sub.save();

      await User.findByIdAndUpdate(sub.userId, {
        isVip: false,
        vipExpiresAt: null,
      });
    }

    return { expiredCount: expired.length };
  },
};

export default vipService;

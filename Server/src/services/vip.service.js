import mongoose from 'mongoose';
import VipPlan from '../models/VipPlan.js';
import VipSubscription from '../models/VipSubscription.js';
import User from '../models/User.js';
import PaymentTransaction from '../models/PaymentOrder.js';
import { PAYMENT_STATUS } from '../utils/constants.js';
import MonetizationController from '../engines/MonetizationController.js';
import { COIN_TX_TYPES } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { getTodayIST, getStartOfTomorrowIST } from '../utils/timeIST.js';
import DailyCheckin from '../models/DailyCheckin.js';

const vipService = {
  async getPlans() {
    return VipPlan.find({ isActive: true }).sort({ price: 1 }).lean();
  },

  async getAllPlans() {
    return VipPlan.find().sort({ price: 1 }).lean();
  },

  async createPlan(body) {
    const plan = await VipPlan.create(body);
    return plan.toObject();
  },

  async updatePlan(planId, body) {
    if (!mongoose.isValidObjectId(planId)) throw new Error('Invalid plan id');
    const plan = await VipPlan.findByIdAndUpdate(planId, body, { new: true }).lean();
    if (!plan) throw new Error('Plan not found');
    return plan;
  },

  async deletePlan(planId) {
    if (!mongoose.isValidObjectId(planId)) throw new Error('Invalid plan id');
    const r = await VipPlan.findByIdAndDelete(planId);
    if (!r) throw new Error('Plan not found');
  },

  async listSubscriptions(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (query.status) filter.status = query.status;
    const [subscriptions, total] = await Promise.all([
      VipSubscription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('planId').populate('userId', 'phone name username').lean(),
      VipSubscription.countDocuments(filter),
    ]);
    return { subscriptions, total, page, limit };
  },

  /**
   * Dev / legacy — enforce payment in production via controller.
   */
  async purchase(userId, planId, paymentTransactionId = null) {
    if (!mongoose.isValidObjectId(planId)) throw new Error('Invalid plan id');
    if (paymentTransactionId) {
      const pt = await PaymentTransaction.findById(paymentTransactionId);
      if (!pt || String(pt.userId) !== String(userId)) throw new Error('Invalid payment reference');
      if (pt.status !== PAYMENT_STATUS.SUCCESS) throw new Error('Payment not completed');
    }
    return this.activateFromPayment(userId, planId, paymentTransactionId);
  },

  async activateFromPayment(userId, planId, paymentTransactionId = null) {
    const plan = await VipPlan.findById(planId);
    if (!plan || !plan.isActive) throw new Error('Plan not found');

    const now = new Date();
    const existing = await VipSubscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).populate('planId');

    if (existing) {
      const oldPlan = existing.planId;
      const dailyRate = oldPlan?.dailyCheckinCoins ?? 0;
      const unclaimedDays = Math.max(
        0,
        (existing.totalDays - 1) - (existing.dailyCheckinsClaimed || 0)
      );
      const unclaimedValue = unclaimedDays * dailyRate;
      await VipSubscription.findByIdAndUpdate(existing._id, {
        status: 'replaced',
        replacedAt: now,
        unclaimedCoinsForfeited: unclaimedValue,
      });
      logger.info({
        userId,
        forfeited: unclaimedValue,
        oldSubId: existing._id,
      }, 'VIP subscription replaced');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    const sub = await VipSubscription.create({
      userId,
      planId,
      expiresAt,
      totalDays: plan.durationDays,
      paymentTransactionId: paymentTransactionId || null,
      upfrontCoinsGranted: plan.upfrontCoins > 0,
      dailyCheckinsClaimed: 0,
      status: 'active',
    });

    if (plan.upfrontCoins > 0) {
      await MonetizationController.grantCoins(
        userId,
        plan.upfrontCoins,
        COIN_TX_TYPES.PURCHASE,
        sub._id.toString(),
        `VIP upfront: ${plan.name}`
      );
    }

    await User.findByIdAndUpdate(userId, {
      isVip: true,
      vipExpiresAt: expiresAt,
      vipFrameType: plan.frameType || 'none',
      vipBadgeType: plan.badgeType || 'none',
    });

    return sub;
  },

  async checkExpiry() {
    const now = new Date();
    const expired = await VipSubscription.find({
      status: 'active',
      expiresAt: { $lt: now },
    });

    for (const sub of expired) {
      sub.status = 'expired';
      await sub.save();

      await User.findByIdAndUpdate(sub.userId, {
        isVip: false,
        vipExpiresAt: null,
        vipFrameType: 'none',
        vipBadgeType: 'none',
      });
    }

    return { expiredCount: expired.length };
  },

  /**
   * Rich status for app + check-in UI. Calls checkExpiry first.
   */
  async getStatus(userId) {
    await this.checkExpiry();

    const today = getTodayIST();
    const now = new Date();
    const user = await User.findById(userId)
      .select('isVip vipExpiresAt vipFrameType vipBadgeType coinBalance')
      .lean();

    const sub = await VipSubscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).populate('planId').lean();

    const claimedToday = await DailyCheckin.findOne({ userId, date: today }).lean();

    if (!sub || !sub.planId) {
      return {
        isVip: false,
        coinBalance: user?.coinBalance ?? 0,
        justExpired: false,
        frameType: user?.vipFrameType || 'none',
        badgeType: user?.vipBadgeType || 'none',
        checkinAvailableToday: !claimedToday,
        checkinCoins: null,
        nextCheckinAt: claimedToday ? getStartOfTomorrowIST() : null,
        progress: null,
      };
    }

    const plan = sub.planId;
    const remainingCheckins = (sub.totalDays - 1) - (sub.dailyCheckinsClaimed || 0);
    const checkinCoins = plan.dailyCheckinCoins || 0;
    const canVipCheckin = remainingCheckins > 0;
    const checkinAvailableToday = !claimedToday && canVipCheckin;

    const daysRemaining = Math.max(
      0,
      Math.ceil((new Date(sub.expiresAt) - now) / 86400000)
    );

    return {
      isVip: true,
      coinBalance: user?.coinBalance ?? 0,
      justExpired: false,
      planSlug: plan.type,
      planName: plan.name,
      frameType: user?.vipFrameType || plan.frameType || 'none',
      badgeType: user?.vipBadgeType || plan.badgeType || 'none',
      expiresAt: sub.expiresAt,
      daysRemaining,
      checkinAvailableToday,
      checkinCoins: canVipCheckin ? checkinCoins : 0,
      nextCheckinAt: claimedToday ? getStartOfTomorrowIST() : null,
      progress: {
        daysClaimed: (sub.dailyCheckinsClaimed || 0) + 1,
        totalDays: sub.totalDays,
        remainingCheckins,
        remainingCoinsToCollect: Math.max(0, remainingCheckins * checkinCoins),
      },
    };
  },
};

export default vipService;

import mongoose from 'mongoose';
import VipPlan from '../models/VipPlan.js';
import VipSubscription from '../models/VipSubscription.js';
import User from '../models/User.js';
import PaymentTransaction from '../models/PaymentOrder.js';
import { PAYMENT_STATUS } from '../utils/constants.js';
import MonetizationController from '../engines/MonetizationController.js';
import { COIN_TX_TYPES } from '../utils/constants.js';
import { getTodayIST, getStartOfTomorrowIST } from '../utils/timeIST.js';
import { DateTime } from 'luxon';
import DailyCheckin from '../models/DailyCheckin.js';

const getSubId = (sub) => sub?._id?.toString?.() || String(sub?._id || '');
const getPlanId = (plan) => plan?._id?.toString?.() || String(plan?._id || '');

async function syncUserVipState(userId) {
  const now = new Date();
  const activeSubs = await VipSubscription.find({
    userId,
    status: 'active',
    expiresAt: { $gt: now },
  })
    .populate('planId')
    .sort({ expiresAt: -1, createdAt: -1 });

  if (!activeSubs.length) {
    await User.findByIdAndUpdate(userId, {
      isVip: false,
      vipExpiresAt: null,
      vipFrameType: 'none',
      vipBadgeType: 'none',
    });
    return null;
  }

  const primary = activeSubs[0];
  const primaryPlan = primary.planId;
  await User.findByIdAndUpdate(userId, {
    isVip: true,
    vipExpiresAt: primary.expiresAt,
    vipFrameType: primaryPlan?.frameType || 'none',
    vipBadgeType: primaryPlan?.badgeType || 'none',
  });
  return primary;
}

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

    await syncUserVipState(userId);

    return sub;
  },

  async checkExpiry() {
    const now = new Date();
    const expired = await VipSubscription.find({
      status: 'active',
      expiresAt: { $lt: now },
    });

    const affectedUserIds = new Set();
    for (const sub of expired) {
      sub.status = 'expired';
      await sub.save();
      affectedUserIds.add(String(sub.userId));
    }
    for (const uid of affectedUserIds) {
      await syncUserVipState(uid);
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

    const activeSubs = await VipSubscription.find({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    })
      .populate('planId')
      .sort({ expiresAt: -1, createdAt: -1 })
      .lean();

    const claimedToday = await DailyCheckin.findOne({ userId, date: today }).lean();

    if (!activeSubs.length) {
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
        subscriptions: [],
        plansProgress: [],
      };
    }

    const claimedVipIds = new Set(
      Array.isArray(claimedToday?.vipClaims)
        ? claimedToday.vipClaims.map((entry) => String(entry?.subscriptionId))
        : []
    );
    const legacyClaimedVipSubId =
      claimedToday?.source === 'vip_plan' && claimedToday?.subscriptionId
        ? String(claimedToday.subscriptionId)
        : null;
    if (legacyClaimedVipSubId) claimedVipIds.add(legacyClaimedVipSubId);

    const plansProgress = activeSubs
      .filter((sub) => sub?.planId)
      .map((sub) => {
        const plan = sub.planId;
        const claimedDays = sub.dailyCheckinsClaimed || 0;
        const remainingCheckins = Math.max(0, sub.totalDays - claimedDays);
        const checkinCoins = plan.dailyCheckinCoins || 0;
        const daysRemaining = Math.max(
          0,
          Math.ceil((new Date(sub.expiresAt) - now) / 86400000)
        );
        const startedAtIST = DateTime.fromJSDate(new Date(sub.createdAt || now), { zone: 'utc' }).setZone('Asia/Kolkata');
        const todayIST = DateTime.now().setZone('Asia/Kolkata').startOf('day');
        const elapsedDays = Math.max(1, Math.floor(todayIST.diff(startedAtIST.startOf('day'), 'days').days) + 1);
        const unlockedDays = Math.min(sub.totalDays, elapsedDays);
        const canClaimToday = remainingCheckins > 0 && claimedDays < unlockedDays && !claimedVipIds.has(getSubId(sub));

        return {
          subscriptionId: getSubId(sub),
          planId: getPlanId(plan),
          plan: {
            _id: getPlanId(plan),
            name: plan.name,
            type: plan.type,
          },
          planName: plan.name,
          planSlug: plan.type,
          status: sub.status,
          expiresAt: sub.expiresAt,
          daysRemaining,
          checkinCoins,
          canClaimToday,
          nextCheckinAt: canClaimToday ? null : getStartOfTomorrowIST(),
          progress: {
            daysClaimed: claimedDays,
            unlockedDays,
            totalDays: sub.totalDays,
            remainingCheckins,
            remainingCoinsToCollect: Math.max(0, remainingCheckins * checkinCoins),
          },
        };
      });

    const primary = plansProgress[0];
    const hasAnyClaimableToday = plansProgress.some((entry) => entry.canClaimToday);

    return {
      isVip: true,
      coinBalance: user?.coinBalance ?? 0,
      justExpired: false,
      planId: primary?.planId || null,
      subscriptionId: primary?.subscriptionId || null,
      plan: primary?.plan || null,
      planSlug: primary?.planSlug || null,
      planName: primary?.planName || null,
      frameType: user?.vipFrameType || 'none',
      badgeType: user?.vipBadgeType || 'none',
      expiresAt: primary?.expiresAt || null,
      daysRemaining: primary?.daysRemaining || 0,
      checkinAvailableToday: hasAnyClaimableToday,
      checkinCoins: primary?.checkinCoins || 0,
      nextCheckinAt: hasAnyClaimableToday ? null : getStartOfTomorrowIST(),
      progress: primary?.progress || null,
      plansProgress,
      subscriptions: plansProgress,
    };
  },
};

export default vipService;

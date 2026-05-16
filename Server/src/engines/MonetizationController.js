import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import DailyCheckin from '../models/DailyCheckin.js';
import VipSubscription from '../models/VipSubscription.js';
import VipPlan from '../models/VipPlan.js';
import { COIN_TX_TYPES } from '../utils/constants.js';
import { getTodayIST, getStartOfTomorrowIST } from '../utils/timeIST.js';
import appSettingService from '../services/appSetting.service.js';
import logger from '../utils/logger.js';

/**
 * MonetizationController — all coin/VIP/wealth logic.
 */
const MonetizationController = {
  WEALTH_THRESHOLDS: [
    0, 100, 500, 1500, 3000, 5000, 8000, 12000,
    18000, 25000, 35000, 50000, 70000, 100000, 150000, 200000,
  ],

  calculateWealthLevel(totalSpent) {
    let level = 0;
    for (let i = this.WEALTH_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalSpent >= this.WEALTH_THRESHOLDS[i]) {
        level = i;
        break;
      }
    }
    return level;
  },

  async deductCoins(userId, amount, txType, referenceId = '', note = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.coinBalance < amount) {
      return { error: true, paywallType: 'insufficient_coins', coinBalance: user.coinBalance };
    }

    user.coinBalance -= amount;
    user.totalCoinsEverSpent += amount;
    user.wealthLevel = this.calculateWealthLevel(user.totalCoinsEverSpent);
    await user.save();

    await CoinTransaction.create({
      userId, type: txType, amount: -amount,
      balanceAfter: user.coinBalance, referenceId, note,
    });

    return { coinBalance: user.coinBalance, wealthLevel: user.wealthLevel };
  },

  async grantCoins(userId, amount, txType, referenceId = '', note = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.coinBalance += amount;
    await user.save();

    const tx = await CoinTransaction.create({
      userId, type: txType, amount,
      balanceAfter: user.coinBalance, referenceId, note,
    });

    return { coinBalance: user.coinBalance, coinTransactionId: tx._id };
  },

  async getFreeCheckinCoins() {
    const v = await appSettingService.get('free_login_checkin_coins');
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0) return n;
    return 5;
  },

  async getCheckinStatus(userId) {
    const today = getTodayIST();
    const now = new Date();
    const claimedToday = await DailyCheckin.findOne({ userId, date: today }).lean();
    const freeCoins = await this.getFreeCheckinCoins();

    const sub = await VipSubscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).populate('planId').lean();

    if (!sub?.planId) {
      return {
        canClaim: !claimedToday,
        alreadyClaimed: !!claimedToday,
        isVipCheckin: false,
        coinsIfClaim: claimedToday ? 0 : freeCoins,
        nextCheckinAt: claimedToday ? getStartOfTomorrowIST() : null,
        errorCode: null,
      };
    }

    const plan = sub.planId;
    const remainingCheckins = (sub.totalDays - 1) - (sub.dailyCheckinsClaimed || 0);
    if (remainingCheckins <= 0) {
      return {
        canClaim: false,
        alreadyClaimed: false,
        isVipCheckin: true,
        coinsIfClaim: 0,
        nextCheckinAt: null,
        errorCode: 'all_vip_checkins_exhausted',
      };
    }

    const coinsIfClaim = plan.dailyCheckinCoins || 0;
    return {
      canClaim: !claimedToday,
      alreadyClaimed: !!claimedToday,
      isVipCheckin: true,
      coinsIfClaim: claimedToday ? 0 : coinsIfClaim,
      nextCheckinAt: claimedToday ? getStartOfTomorrowIST() : null,
      remainingCheckins,
      errorCode: null,
    };
  },

  async claimDailyCheckin(userId) {
    const today = getTodayIST();
    const now = new Date();

    const status = await this.getCheckinStatus(userId);
    if (status.errorCode === 'all_vip_checkins_exhausted') {
      return {
        success: false,
        error: 'all_vip_checkins_exhausted',
        message: 'You have claimed all daily rewards for this plan',
      };
    }
    if (status.alreadyClaimed || !status.canClaim) {
      return {
        success: false,
        error: 'already_claimed_today',
        message: 'Already claimed today',
        nextCheckinAt: getStartOfTomorrowIST(),
      };
    }

    const sub = await VipSubscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).populate('planId');

    let coinsToAward = await this.getFreeCheckinCoins();
    let source = 'free_login';

    if (sub?.planId) {
      const remainingCheckins = (sub.totalDays - 1) - (sub.dailyCheckinsClaimed || 0);
      if (remainingCheckins <= 0) {
        return {
          success: false,
          error: 'all_vip_checkins_exhausted',
          message: 'You have claimed all daily rewards for this plan',
        };
      }
      coinsToAward = sub.planId.dailyCheckinCoins || 0;
      source = 'vip_plan';
    }

    let checkinDoc;
    try {
      checkinDoc = await DailyCheckin.create({
        userId,
        date: today,
        coinsAwarded: coinsToAward,
        source,
      });
    } catch (err) {
      if (err.code === 11000) {
        return {
          success: false,
          error: 'already_claimed_today',
          message: 'Already claimed today',
          nextCheckinAt: getStartOfTomorrowIST(),
        };
      }
      throw err;
    }

    try {
      const grant = await this.grantCoins(
        userId,
        coinsToAward,
        COIN_TX_TYPES.CHECKIN,
        checkinDoc._id.toString(),
        `Daily check-in (${source})`
      );
      await DailyCheckin.findByIdAndUpdate(checkinDoc._id, {
        coinTransactionId: grant.coinTransactionId,
      });

      if (sub) {
        await VipSubscription.findByIdAndUpdate(sub._id, {
          $inc: { dailyCheckinsClaimed: 1 },
        });
      }

      return {
        success: true,
        coins: coinsToAward,
        source,
        newBalance: grant.coinBalance,
        alreadyClaimed: false,
      };
    } catch (grantErr) {
      logger.error({ err: grantErr, userId, checkinId: checkinDoc._id }, 'Check-in grant failed; needs reconcile');
      throw grantErr;
    }
  },

  /** Find DailyCheckin rows missing CoinTransaction link — auto-credit */
  async reconcileOrphanCheckins() {
    const orphans = await DailyCheckin.find({
      $or: [{ coinTransactionId: null }, { coinTransactionId: { $exists: false } }],
    }).limit(500);

    let fixed = 0;
    for (const row of orphans) {
      const existing = await CoinTransaction.findOne({
        userId: row.userId,
        type: COIN_TX_TYPES.CHECKIN,
        referenceId: row._id.toString(),
      });
      if (existing) {
        await DailyCheckin.findByIdAndUpdate(row._id, { coinTransactionId: existing._id });
        continue;
      }
      try {
        await this.grantCoins(
          row.userId,
          row.coinsAwarded,
          COIN_TX_TYPES.CHECKIN,
          row._id.toString(),
          `Daily check-in reconcile (${row.source})`
        );
        const tx = await CoinTransaction.findOne({
          userId: row.userId,
          type: COIN_TX_TYPES.CHECKIN,
          referenceId: row._id.toString(),
        }).sort({ createdAt: -1 });
        if (tx) {
          await DailyCheckin.findByIdAndUpdate(row._id, { coinTransactionId: tx._id });
          fixed += 1;
        }
      } catch (e) {
        logger.error({ err: e, checkinId: row._id }, 'Reconcile check-in failed');
      }
    }
    return { scanned: orphans.length, fixed };
  },

  async getBalance(userId) {
    const user = await User.findById(userId)
      .select('coinBalance pointBalance wealthLevel totalCoinsEverSpent freeCallsRemaining isVip vipExpiresAt vipFrameType vipBadgeType')
      .lean();
    return user;
  },

  async getTransactions(userId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [txns, total] = await Promise.all([
      CoinTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoinTransaction.countDocuments({ userId }),
    ]);

    return { transactions: txns, total, page, limit };
  },
};

export default MonetizationController;

import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import DailyCheckin from '../models/DailyCheckin.js';
import VipSubscription from '../models/VipSubscription.js';
import mongoose from 'mongoose';
import { COIN_TX_TYPES } from '../utils/constants.js';
import {
  getTodayIST,
  getStartOfTomorrowIST,
  getStartOfTodayIST,
  getEndOfTodayIST,
  toISTStartOfDay,
} from '../utils/timeIST.js';
import appSettingService from '../services/appSetting.service.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const toIdString = (value) => (value?._id ? String(value._id) : String(value || ''));
const maybeSession = (query, session) => (session ? query.session(session) : query);
const saveWithOptionalSession = (doc, session) => (session ? doc.save({ session }) : doc.save());

const isTransactionSupportError = (error) => {
  const msg = typeof error?.message === 'string' ? error.message : '';
  return (
    msg.includes('Transaction numbers are only allowed on a replica set member or mongos')
    || msg.includes('Transaction support is not available')
    || msg.includes('transactions are not supported')
    || msg.includes('Transaction API error')
  );
};

function extractVipClaimsFromRow(row) {
  const claims = Array.isArray(row?.vipClaims) ? [...row.vipClaims] : [];
  if (
    row?.source === 'vip_plan' &&
    row?.subscriptionId &&
    !claims.some((entry) => String(entry.subscriptionId) === String(row.subscriptionId))
  ) {
    claims.push({
      subscriptionId: row.subscriptionId,
      planId: row.planId || null,
      dayNumber: row.dayNumber || null,
      coinsAwarded: row.coinsAwarded || 0,
      coinTransactionId: row.coinTransactionId || null,
      claimedAt: row.claimedAt || row.createdAt || new Date(),
    });
  }
  return claims;
}

function normalizeClaimedDayNumbers(sub) {
  const claimed = Array.isArray(sub?.claimedDayNumbers)
    ? sub.claimedDayNumbers.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (claimed.length) return [...new Set(claimed)].sort((a, b) => a - b);
  const legacyCount = Math.max(0, Number(sub?.dailyCheckinsClaimed) || 0);
  return Array.from({ length: legacyCount }, (_, idx) => idx + 1);
}

const NEW_USER_CHECKIN_WINDOW_DAYS = 7;

function serializeDateOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

function getNewUserWindowMeta(user) {
  const start = toISTStartOfDay(user?.createdAt || new Date());
  const today = toISTStartOfDay(new Date());
  const elapsedDays = Math.floor(today.diff(start, 'days').days) + 1;
  const currentDayNumber = Math.max(1, elapsedDays);
  const lastDayNumber = Math.min(NEW_USER_CHECKIN_WINDOW_DAYS, Math.max(0, currentDayNumber));
  const isExpired = currentDayNumber > NEW_USER_CHECKIN_WINDOW_DAYS;
  const windowExpiresAt = start.plus({ days: NEW_USER_CHECKIN_WINDOW_DAYS }).toJSDate();
  return {
    start,
    currentDayNumber,
    lastUnlockedDay: lastDayNumber,
    isExpired,
    windowStartedAt: start.toJSDate(),
    windowExpiresAt,
  };
}

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

  async grantCoins(userId, amount, txType, referenceId = '', note = '', opts = {}) {
    const { session = null, idempotent = false } = opts;

    if (idempotent && referenceId) {
      const existing = await CoinTransaction.findOne({
        userId,
        type: txType,
        referenceId,
      }).session(session);
      if (existing) {
        const existingUser = await User.findById(userId).session(session);
        if (!existingUser) throw new Error('User not found');
        return {
          coinBalance: existingUser.coinBalance,
          coinTransactionId: existing._id,
          alreadyGranted: true,
        };
      }
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    user.coinBalance += amount;
    await user.save({ session });

    const [tx] = await CoinTransaction.create([{
      userId,
      type: txType,
      amount,
      balanceAfter: user.coinBalance,
      referenceId,
      note,
    }], { session });

    return { coinBalance: user.coinBalance, coinTransactionId: tx._id };
  },

  async getFreeCheckinCoins() {
    const v = await appSettingService.get('free_login_checkin_coins');
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0) return n;
    return 5;
  },

  async getCheckinStatus(userId) {
    const [user, rewards, claimedRows, claimedToday] = await Promise.all([
      User.findById(userId).select('createdAt').lean(),
      appSettingService.getNewUserCheckinRewards(),
      DailyCheckin.find({ userId, source: 'new_user' }).select('dayNumber claimedAt').lean(),
      DailyCheckin.findOne({
        userId,
        source: 'new_user',
        claimedAt: {
          $gte: getStartOfTodayIST(),
          $lte: getEndOfTodayIST(),
        },
      }).lean(),
    ]);

    if (!user) throw new Error('User not found');

    const windowMeta = getNewUserWindowMeta(user);
    const claimedByDay = new Map(
      claimedRows
        .filter((row) => Number.isInteger(row?.dayNumber))
        .map((row) => [row.dayNumber, row])
    );

    const days = Array.from({ length: NEW_USER_CHECKIN_WINDOW_DAYS }).map((_, index) => {
      const day = index + 1;
      const claimed = claimedByDay.get(day);
      let status = 'locked';
      if (claimed) {
        status = 'claimed';
      } else if (windowMeta.isExpired) {
        status = 'expired';
      } else if (day <= windowMeta.lastUnlockedDay) {
        status = 'claimable';
      }

      return {
        day,
        coins: rewards[index] || 0,
        status,
        claimedAt: serializeDateOrNull(claimed?.claimedAt),
      };
    });

    const claimableDays = days
      .filter((day) => day.status === 'claimable')
      .map((day) => day.day);
    const canClaimToday = !windowMeta.isExpired && !claimedToday && claimableDays.length > 0;
    const selectedDefaultDay = claimableDays[0] || null;

    return {
      isEligible: !windowMeta.isExpired,
      todayKey: getTodayIST(),
      windowStartedAt: serializeDateOrNull(windowMeta.windowStartedAt),
      windowExpiresAt: serializeDateOrNull(windowMeta.windowExpiresAt),
      currentDayNumber: Math.min(windowMeta.currentDayNumber, NEW_USER_CHECKIN_WINDOW_DAYS),
      claimedToday: !!claimedToday,
      canClaimToday,
      selectedDefaultDay,
      claimableDayNumbers: claimableDays,
      days,
      nextCheckinAt: canClaimToday || windowMeta.isExpired ? null : getStartOfTomorrowIST(),
      canClaim: canClaimToday,
      alreadyClaimed: !!claimedToday,
      coinsIfClaim: selectedDefaultDay ? days[selectedDefaultDay - 1]?.coins || 0 : 0,
      isVipCheckin: false,
      errorCode: windowMeta.isExpired ? 'new_user_checkin_expired' : null,
      subscriptions: [],
    };
  },

  async claimDailyCheckin(userId, context = {}) {
    const runClaimFlow = async ({ session = null } = {}) => {
      const today = getTodayIST();
      const now = new Date();
      const requestedSubscriptionId = context?.subscriptionId || null;
      const requestedPlanId = context?.planId || null;

      const activeSubs = await maybeSession(
        VipSubscription.find({
          userId,
          status: 'active',
          expiresAt: { $gt: now },
        }).populate('planId'),
        session
      );

      let targetSub = null;
      if (requestedSubscriptionId) {
        targetSub = activeSubs.find((sub) => String(sub._id) === String(requestedSubscriptionId));
        if (!targetSub) {
          return {
            success: false,
            error: 'invalid_subscription',
            message: 'Selected VIP subscription is not active',
          };
        }
      } else if (requestedPlanId) {
        targetSub = activeSubs.find((sub) => String(sub.planId?._id) === String(requestedPlanId));
        if (!targetSub) {
          return {
            success: false,
            error: 'invalid_plan_subscription',
            message: 'No active VIP subscription found for selected plan',
          };
        }
      } else if (activeSubs.length === 1) {
        // backward compatibility for old clients
        targetSub = activeSubs[0];
      } else if (activeSubs.length > 1) {
        return {
          success: false,
          error: 'subscription_required',
          message: 'Please select a VIP plan to claim daily reward',
        };
      }

      const todayRecord = await maybeSession(
        DailyCheckin.findOne({ userId, date: today, source: 'vip_plan' }),
        session
      );
      if (targetSub) {
        const plan = targetSub.planId;
        const claimedDayNumbers = normalizeClaimedDayNumbers(targetSub).filter((day) => day <= targetSub.totalDays);
        const claimedDaySet = new Set(claimedDayNumbers);
        const elapsedDays = Math.max(
          1,
          Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(targetSub.createdAt || now).setHours(0, 0, 0, 0)) / 86400000) + 1
        );
        const unlockedDays = Math.min(targetSub.totalDays, elapsedDays);
        const requestedDayRaw = context?.dayNumber ?? context?.day ?? null;
        const requestedDay = requestedDayRaw == null ? null : Number(requestedDayRaw);
        if (requestedDay != null && (!Number.isInteger(requestedDay) || requestedDay < 1 || requestedDay > targetSub.totalDays)) {
          return {
            success: false,
            error: 'invalid_day',
            message: 'Invalid check-in day selected',
          };
        }

        let dayToClaim = requestedDay;
        if (dayToClaim == null) {
          for (let day = 1; day <= unlockedDays; day += 1) {
            if (!claimedDaySet.has(day)) {
              dayToClaim = day;
              break;
            }
          }
        }

        if (dayToClaim == null || dayToClaim > unlockedDays) {
          return {
            success: false,
            error: 'checkin_not_unlocked',
            message: 'This VIP day reward is not unlocked yet',
          };
        }

        if (claimedDaySet.has(dayToClaim)) {
          return {
            success: false,
            error: 'already_claimed_today',
            message: `Day ${dayToClaim} is already claimed for this plan`,
          };
        }

        const referenceId = `vip:${String(targetSub._id)}:day:${dayToClaim}`;
        const coinsToAward = plan?.dailyCheckinCoins || 0;
        const grant = await this.grantCoins(
          userId,
          coinsToAward,
          COIN_TX_TYPES.CHECKIN,
          referenceId,
          `VIP daily check-in (${plan?.name || 'plan'})`,
          { session, idempotent: true }
        );

        let dayDoc = todayRecord;
        if (!dayDoc) {
          const query = DailyCheckin.findOneAndUpdate(
            { userId, date: today, source: 'vip_plan' },
            {
              $setOnInsert: {
                userId,
                date: today,
                source: 'vip_plan',
                coinsAwarded: coinsToAward,
              },
            },
            session ? { new: true, upsert: true, session } : { new: true, upsert: true }
          );
          dayDoc = await query;
        }

        dayDoc.source = dayDoc.source || 'vip_plan';
        dayDoc.vipClaims = extractVipClaimsFromRow(dayDoc);
        const vipClaimExists = dayDoc.vipClaims.some(
          (entry) => String(entry.subscriptionId) === String(targetSub._id)
            && Number(entry.dayNumber) === Number(dayToClaim)
        );
        if (!vipClaimExists) {
          dayDoc.vipClaims.push({
            subscriptionId: targetSub._id,
            planId: plan?._id,
            dayNumber: dayToClaim,
            coinsAwarded: coinsToAward,
            coinTransactionId: grant.coinTransactionId,
            claimedAt: new Date(),
          });
        }
        // Keep legacy fields present for backward compatibility with existing analytics.
        if (!dayDoc.subscriptionId) dayDoc.subscriptionId = targetSub._id;
        if (!dayDoc.planId) dayDoc.planId = plan?._id || null;
        if (dayDoc.coinsAwarded == null) dayDoc.coinsAwarded = coinsToAward;
        await saveWithOptionalSession(dayDoc, session);

        const updatedClaimedDayNumbers = [...claimedDaySet, dayToClaim].sort((a, b) => a - b);
        targetSub.claimedDayNumbers = updatedClaimedDayNumbers;
        targetSub.dailyCheckinsClaimed = updatedClaimedDayNumbers.length;
        await saveWithOptionalSession(targetSub, session);

        return {
          success: true,
          coins: coinsToAward,
          source: 'vip_plan',
          dayNumber: dayToClaim,
          subscriptionId: String(targetSub._id),
          planId: String(plan?._id || ''),
          newBalance: grant.coinBalance,
          alreadyClaimed: false,
        };
      }

      const user = await maybeSession(
        User.findById(userId).select('createdAt coinBalance'),
        session
      );
      if (!user) throw new Error('User not found');

      const rewards = await appSettingService.getNewUserCheckinRewards();
      const claimedTodayNewUser = await maybeSession(
        DailyCheckin.findOne({
          userId,
          source: 'new_user',
          claimedAt: {
            $gte: getStartOfTodayIST(),
            $lte: getEndOfTodayIST(),
          },
        }),
        session
      );
      if (claimedTodayNewUser) {
        return {
          success: false,
          error: 'already_claimed_today',
          message: 'Already claimed today',
          nextCheckinAt: getStartOfTomorrowIST(),
        };
      }

      const windowMeta = getNewUserWindowMeta(user);
      if (windowMeta.isExpired) {
        return {
          success: false,
          error: 'new_user_checkin_expired',
          message: 'Your 7-day check-in window has expired',
          nextCheckinAt: null,
        };
      }

      const requestedDayRaw = context?.dayNumber ?? context?.day ?? null;
      const dayNumber = Number(requestedDayRaw);
      if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > NEW_USER_CHECKIN_WINDOW_DAYS) {
        return {
          success: false,
          error: 'invalid_day',
          message: 'Invalid check-in day selected',
        };
      }

      if (dayNumber > windowMeta.lastUnlockedDay) {
        return {
          success: false,
          error: 'checkin_not_unlocked',
          message: 'This check-in day is not unlocked yet',
        };
      }

      const existingDayClaim = await maybeSession(
        DailyCheckin.findOne({ userId, source: 'new_user', dayNumber }),
        session
      );
      if (existingDayClaim) {
        return {
          success: false,
          error: 'day_already_claimed',
          message: `Day ${dayNumber} is already claimed`,
        };
      }

      const coinsToAward = rewards[dayNumber - 1] || 0;
      const dayDoc = await DailyCheckin.create([{
        userId,
        date: today,
        source: 'new_user',
        dayNumber,
        coinsAwarded: coinsToAward,
        claimedAt: new Date(),
      }], session ? { session } : undefined);

      const referenceId = `new_user:${userId}:day:${dayNumber}`;
      const grant = await this.grantCoins(
        userId,
        coinsToAward,
        COIN_TX_TYPES.CHECKIN,
        referenceId,
        `New-user daily check-in (Day ${dayNumber})`,
        { session, idempotent: true }
      );
      dayDoc[0].coinTransactionId = grant.coinTransactionId;
      await saveWithOptionalSession(dayDoc[0], session);

      return {
        success: true,
        coins: coinsToAward,
        source: 'new_user',
        dayNumber,
        newBalance: grant.coinBalance,
        alreadyClaimed: false,
        todayKey: today,
        selectedDefaultDay: null,
      };
    };

    if (!env.mongoTransactionsEnabled) {
      return runClaimFlow({ session: null });
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      let payload = null;
      await session.withTransaction(async () => {
        payload = await runClaimFlow({ session });
      });
      return payload;
    } catch (error) {
      if (isTransactionSupportError(error)) {
        logger.warn({ err: error, userId }, 'Check-in falling back to non-transaction mode');
        try {
          return await runClaimFlow({ session: null });
        } catch (fallbackError) {
          logger.error({ err: fallbackError, userId }, 'Check-in fallback flow failed');
          return {
            success: false,
            error: 'checkin_temporarily_unavailable',
            message: 'Check-in is temporarily unavailable. Please try again.',
            nextCheckinAt: getStartOfTomorrowIST(),
          };
        }
      }
      logger.error({ err: error, userId }, 'Daily check-in claim failed');
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
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

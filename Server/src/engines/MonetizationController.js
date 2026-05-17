import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import DailyCheckin from '../models/DailyCheckin.js';
import VipSubscription from '../models/VipSubscription.js';
import mongoose from 'mongoose';
import { COIN_TX_TYPES } from '../utils/constants.js';
import { getTodayIST, getStartOfTomorrowIST } from '../utils/timeIST.js';
import appSettingService from '../services/appSetting.service.js';
import logger from '../utils/logger.js';

const toIdString = (value) => (value?._id ? String(value._id) : String(value || ''));

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
      coinsAwarded: row.coinsAwarded || 0,
      coinTransactionId: row.coinTransactionId || null,
      claimedAt: row.claimedAt || row.createdAt || new Date(),
    });
  }
  return claims;
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
    const today = getTodayIST();
    const now = new Date();
    const claimedToday = await DailyCheckin.findOne({ userId, date: today }).lean();
    const freeCoins = await this.getFreeCheckinCoins();

    const subs = await VipSubscription.find({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).populate('planId').lean();

    const vipClaims = extractVipClaimsFromRow(claimedToday);
    const claimedVipSubIds = new Set(vipClaims.map((entry) => String(entry.subscriptionId)));

    if (!subs.length) {
      return {
        canClaim: !claimedToday || claimedToday?.source !== 'free_login',
        alreadyClaimed: claimedToday?.source === 'free_login',
        isVipCheckin: false,
        coinsIfClaim: claimedToday?.source === 'free_login' ? 0 : freeCoins,
        nextCheckinAt: claimedToday?.source === 'free_login' ? getStartOfTomorrowIST() : null,
        errorCode: null,
        subscriptions: [],
      };
    }

    const todayStartMs = new Date(now).setHours(0, 0, 0, 0);
    const subscriptions = subs
      .filter((sub) => sub?.planId)
      .map((sub) => {
        const startedAtMs = new Date(sub.createdAt || now).setHours(0, 0, 0, 0);
        const elapsedDays = Math.max(
          1,
          Math.floor((todayStartMs - startedAtMs) / 86400000) + 1
        );
        const unlockedDays = Math.min(sub.totalDays, elapsedDays);
        const claimedDays = sub.dailyCheckinsClaimed || 0;
        const remainingCheckins = Math.max(0, sub.totalDays - claimedDays);
        const canClaimToday = remainingCheckins > 0 && claimedDays < unlockedDays && !claimedVipSubIds.has(toIdString(sub._id));

        return {
          subscriptionId: toIdString(sub._id),
          planId: toIdString(sub.planId?._id),
          planName: sub.planId?.name,
          checkinCoins: sub.planId?.dailyCheckinCoins || 0,
          remainingCheckins,
          canClaimToday,
          alreadyClaimedToday: claimedVipSubIds.has(toIdString(sub._id)),
        };
      });

    const claimable = subscriptions.find((entry) => entry.canClaimToday);
    const fullyExhausted = subscriptions.every((entry) => entry.remainingCheckins <= 0);

    return {
      canClaim: !!claimable,
      alreadyClaimed: !claimable && subscriptions.some((entry) => entry.alreadyClaimedToday),
      isVipCheckin: true,
      coinsIfClaim: claimable?.checkinCoins || 0,
      nextCheckinAt: claimable ? null : getStartOfTomorrowIST(),
      remainingCheckins: subscriptions.reduce((sum, entry) => sum + entry.remainingCheckins, 0),
      canUpgradeFromFree: false,
      errorCode: fullyExhausted ? 'all_vip_checkins_exhausted' : null,
      subscriptions,
      requiresSubscriptionSelection: subscriptions.length > 1,
    };
  },

  async claimDailyCheckin(userId, context = {}) {
    const today = getTodayIST();
    const now = new Date();
    const requestedSubscriptionId = context?.subscriptionId || null;
    const requestedPlanId = context?.planId || null;

    const session = await mongoose.startSession();
    try {
      let payload = null;
      await session.withTransaction(async () => {
        const activeSubs = await VipSubscription.find({
          userId,
          status: 'active',
          expiresAt: { $gt: now },
        })
          .populate('planId')
          .session(session);

        let targetSub = null;
        if (requestedSubscriptionId) {
          targetSub = activeSubs.find((sub) => String(sub._id) === String(requestedSubscriptionId));
          if (!targetSub) {
            payload = {
              success: false,
              error: 'invalid_subscription',
              message: 'Selected VIP subscription is not active',
            };
            return;
          }
        } else if (requestedPlanId) {
          targetSub = activeSubs.find((sub) => String(sub.planId?._id) === String(requestedPlanId));
          if (!targetSub) {
            payload = {
              success: false,
              error: 'invalid_plan_subscription',
              message: 'No active VIP subscription found for selected plan',
            };
            return;
          }
        } else if (activeSubs.length === 1) {
          // backward compatibility for old clients
          targetSub = activeSubs[0];
        } else if (activeSubs.length > 1) {
          payload = {
            success: false,
            error: 'subscription_required',
            message: 'Please select a VIP plan to claim daily reward',
          };
          return;
        }

        const todayRecord = await DailyCheckin.findOne({ userId, date: today }).session(session);
        if (targetSub) {
          const plan = targetSub.planId;
          const claimedDays = targetSub.dailyCheckinsClaimed || 0;
          const elapsedDays = Math.max(
            1,
            Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(targetSub.createdAt || now).setHours(0, 0, 0, 0)) / 86400000) + 1
          );
          const unlockedDays = Math.min(targetSub.totalDays, elapsedDays);
          const remainingCheckins = Math.max(0, targetSub.totalDays - claimedDays);
          if (remainingCheckins <= 0 || claimedDays >= unlockedDays) {
            payload = {
              success: false,
              error: 'checkin_not_unlocked',
              message: 'This VIP day reward is not unlocked yet',
            };
            return;
          }

          const claimedVip = extractVipClaimsFromRow(todayRecord).some(
            (entry) => String(entry.subscriptionId) === String(targetSub._id)
          );
          if (claimedVip) {
            payload = {
              success: false,
              error: 'already_claimed_today',
              message: 'Already claimed today for this plan',
              nextCheckinAt: getStartOfTomorrowIST(),
            };
            return;
          }

          const referenceId = `vip:${String(targetSub._id)}:${today}`;
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
            dayDoc = await DailyCheckin.findOneAndUpdate(
              { userId, date: today },
              {
                $setOnInsert: {
                  userId,
                  date: today,
                  source: 'vip_plan',
                  coinsAwarded: coinsToAward,
                },
              },
              { new: true, upsert: true, session }
            );
          }

          dayDoc.source = dayDoc.source || 'vip_plan';
          dayDoc.vipClaims = extractVipClaimsFromRow(dayDoc);
          dayDoc.vipClaims.push({
            subscriptionId: targetSub._id,
            planId: plan?._id,
            coinsAwarded: coinsToAward,
            coinTransactionId: grant.coinTransactionId,
            claimedAt: new Date(),
          });
          // Keep legacy fields present for backward compatibility with existing analytics.
          if (!dayDoc.subscriptionId) dayDoc.subscriptionId = targetSub._id;
          if (!dayDoc.planId) dayDoc.planId = plan?._id || null;
          if (dayDoc.coinsAwarded == null) dayDoc.coinsAwarded = coinsToAward;
          await dayDoc.save({ session });

          targetSub.dailyCheckinsClaimed = claimedDays + 1;
          await targetSub.save({ session });

          payload = {
            success: true,
            coins: coinsToAward,
            source: 'vip_plan',
            subscriptionId: String(targetSub._id),
            planId: String(plan?._id || ''),
            newBalance: grant.coinBalance,
            alreadyClaimed: false,
          };
          return;
        }

        // Free login check-in (no VIP sub selected/active)
        if (todayRecord?.source === 'free_login') {
          payload = {
            success: false,
            error: 'already_claimed_today',
            message: 'Already claimed today',
            nextCheckinAt: getStartOfTomorrowIST(),
          };
          return;
        }

        const coinsToAward = await this.getFreeCheckinCoins();
        const dayDoc = await DailyCheckin.findOneAndUpdate(
          { userId, date: today },
          {
            $setOnInsert: {
              userId,
              date: today,
              source: 'free_login',
              coinsAwarded: coinsToAward,
            },
          },
          { new: true, upsert: true, session }
        );
        dayDoc.source = 'free_login';
        dayDoc.coinsAwarded = coinsToAward;
        dayDoc.subscriptionId = null;
        dayDoc.planId = null;

        const referenceId = `free:${userId}:${today}`;
        const grant = await this.grantCoins(
          userId,
          coinsToAward,
          COIN_TX_TYPES.CHECKIN,
          referenceId,
          'Daily check-in (free login)',
          { session, idempotent: true }
        );
        dayDoc.coinTransactionId = grant.coinTransactionId;
        await dayDoc.save({ session });

        payload = {
          success: true,
          coins: coinsToAward,
          source: 'free_login',
          newBalance: grant.coinBalance,
          alreadyClaimed: false,
        };
      });

      return payload;
    } catch (error) {
      logger.error({ err: error, userId }, 'Daily check-in claim failed');
      throw error;
    } finally {
      await session.endSession();
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

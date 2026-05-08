import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import DailyCheckin from '../models/DailyCheckin.js';
import VipSubscription from '../models/VipSubscription.js';
import VipPlan from '../models/VipPlan.js';
import { COIN_TX_TYPES } from '../utils/constants.js';

/**
 * MonetizationController — all coin/VIP/wealth logic.
 */
const MonetizationController = {
  /**
   * Wealth level thresholds (cumulative spend)
   */
  WEALTH_THRESHOLDS: [
    0, 100, 500, 1500, 3000, 5000, 8000, 12000,
    18000, 25000, 35000, 50000, 70000, 100000, 150000, 200000,
  ],

  /**
   * Recalculate wealth level from totalCoinsEverSpent
   */
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

  /**
   * Deduct coins from a user (server-side only)
   */
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

  /**
   * Grant coins to a user
   */
  async grantCoins(userId, amount, txType, referenceId = '', note = '') {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.coinBalance += amount;
    await user.save();

    await CoinTransaction.create({
      userId, type: txType, amount,
      balanceAfter: user.coinBalance, referenceId, note,
    });

    return { coinBalance: user.coinBalance };
  },

  /**
   * Daily check-in
   */
  async claimDailyCheckin(userId) {
    const today = new Date().toISOString().split('T')[0];

    // Check if already claimed
    const existing = await DailyCheckin.findOne({ userId, date: today });
    if (existing) return { alreadyClaimed: true, coins: 0 };

    // Check if VIP
    const vipSub = await VipSubscription.findOne({ userId, status: 'active' })
      .populate('planId')
      .lean();

    let coinsToAward = 5; // free login bonus
    let source = 'free_login';

    if (vipSub?.planId) {
      coinsToAward = vipSub.planId.dailyCheckinCoins || 10;
      source = 'vip_plan';

      // Increment dailyCheckinsClaimed
      await VipSubscription.findByIdAndUpdate(vipSub._id, {
        $inc: { dailyCheckinsClaimed: 1 },
      });
    }

    await DailyCheckin.create({ userId, date: today, coinsAwarded: coinsToAward, source });
    await this.grantCoins(userId, coinsToAward, COIN_TX_TYPES.CHECKIN, '', `Daily check-in (${source})`);

    return { alreadyClaimed: false, coins: coinsToAward, source };
  },

  /**
   * Get user balance
   */
  async getBalance(userId) {
    const user = await User.findById(userId)
      .select('coinBalance pointBalance wealthLevel totalCoinsEverSpent freeCallsRemaining isVip')
      .lean();
    return user;
  },

  /**
   * Get transaction history
   */
  async getTransactions(userId, query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
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

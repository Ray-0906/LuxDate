import Gift from '../models/Gift.js';
import GiftTransaction from '../models/GiftLog.js';
import GirlProfile from '../models/Girl.js';
import MonetizationController from '../engines/MonetizationController.js';
import { COIN_TX_TYPES } from '../utils/constants.js';

const giftService = {
  async getCatalog() {
    return Gift.find({ isActive: true }).sort({ level: 1, coinCost: 1 }).lean();
  },

  async sendGift(userId, { giftId, girlProfileId, quantity = 1 }) {
    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) throw new Error('Gift not found');

    const girl = await GirlProfile.findById(girlProfileId);
    if (!girl) throw new Error('Profile not found');

    const totalCost = gift.coinCost * quantity;

    // Deduct coins
    const result = await MonetizationController.deductCoins(
      userId, totalCost, COIN_TX_TYPES.GIFT_DEDUCT,
      giftId.toString(), `Gift: ${gift.name} x${quantity} to ${girl.name}`
    );

    if (result.error) return result;

    // Record transaction
    await GiftTransaction.create({
      fromUserId: userId,
      toGirlProfileId: girlProfileId,
      giftId,
      quantity,
      totalCoinsSpent: totalCost,
    });

    // Update girl's gift aggregation
    const existingGift = girl.gifts.find(g => g.giftId?.toString() === giftId.toString());
    if (existingGift) {
      existingGift.count += quantity;
    } else {
      girl.gifts.push({ giftId, count: quantity });
    }
    await girl.save();

    return { success: true, coinBalance: result.coinBalance, wealthLevel: result.wealthLevel };
  },
};

export default giftService;

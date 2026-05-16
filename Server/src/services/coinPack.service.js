import CoinPack from '../models/CoinPack.js';
import appSettingService from './appSetting.service.js';
import logger from '../utils/logger.js';

const coinPackService = {
  /**
   * Active packs for a context (call | gift | wallet).
   */
  async listForContext(context) {
    const filter = { isActive: true };
    if (context && ['call', 'gift', 'wallet'].includes(context)) {
      filter.contexts = context;
    }
    const packs = await CoinPack.find(filter).sort({ sortOrder: 1, priceInr: 1 }).lean();
    if (packs.length > 0) return packs;

    return this._legacyFromSettings(context);
  },

  /** Fallback until CoinPack docs exist — reads AppSetting coin_packages */
  async _legacyFromSettings(context) {
    const raw = await appSettingService.get('coin_packages');
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((p, i) => ({
      _id: `legacy-${i}`,
      label: p.label || `Pack ${i + 1}`,
      priceInr: p.price,
      coins: p.coins,
      bonusCoins: p.bonusCoins || 0,
      sortOrder: i,
      isActive: true,
      contexts: ['call', 'gift', 'wallet'],
      isLegacy: true,
    })).filter((p) => !context || p.contexts.includes(context));
  },

  async getById(packId) {
    const pack = await CoinPack.findById(packId).lean();
    if (pack) return pack;
    const legacy = await this._legacyFromSettings(null);
    return legacy.find((p) => p._id === packId) || null;
  },

  /** Resolve coins + price for order creation (CoinPack documents only). */
  async resolvePackForPurchase(packId) {
    const doc = await CoinPack.findOne({ _id: packId, isActive: true }).lean();
    if (!doc) return null;
    return {
      priceInr: doc.priceInr,
      coinsToCredit: doc.coins + (doc.bonusCoins || 0),
      packId: doc._id,
    };
  },

  async seedDefaultPacksIfEmpty() {
    const count = await CoinPack.countDocuments();
    if (count > 0) return { seeded: false };
    await CoinPack.insertMany([
      {
        label: '₹100 Pack',
        priceInr: 100,
        coins: 500,
        bonusCoins: 0,
        sortOrder: 1,
        isActive: true,
        contexts: ['call', 'gift', 'wallet'],
      },
      {
        label: '₹150 Pack',
        priceInr: 150,
        coins: 800,
        bonusCoins: 0,
        sortOrder: 2,
        isActive: true,
        contexts: ['call', 'gift', 'wallet'],
      },
    ]);
    logger.info('Seeded default CoinPack documents');
    return { seeded: true };
  },
};

export default coinPackService;

import MonetizationController from '../engines/MonetizationController.js';
import coinPackService from '../services/coinPack.service.js';
import appSettingService from '../services/appSetting.service.js';
import ApiResponse from '../utils/response.js';

const coinController = {
  async getPacks(req, res, next) {
    try {
      const { context } = req.query;
      const packs = await coinPackService.listForContext(context);
      return ApiResponse.success(res, { data: packs });
    } catch (e) { next(e); }
  },

  async getEconomy(req, res, next) {
    try {
      const [pricing, freeCheckin] = await Promise.all([
        appSettingService.getCallPricingSettings(),
        appSettingService.get('free_login_checkin_coins'),
      ]);
      return ApiResponse.success(res, {
        data: {
          callCostPerMinute: req.user?.isVip ? pricing.vipRate : pricing.nonVipRate,
          callCostPerMinuteNonVip: pricing.nonVipRate,
          callCostPerMinuteVip: pricing.vipRate,
          minCoinsForCall: pricing.minCoinsForCall,
          freeLoginCheckinCoins: freeCheckin ?? 5,
        },
      });
    } catch (e) { next(e); }
  },

  async getBalance(req, res, next) {
    try {
      const data = await MonetizationController.getBalance(req.user._id);
      return ApiResponse.success(res, { data });
    } catch (e) { next(e); }
  },

  async getTransactions(req, res, next) {
    try {
      const result = await MonetizationController.getTransactions(req.user._id, req.query);
      return ApiResponse.paginated(res, {
        data: result.transactions,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (e) { next(e); }
  },

  async getCheckinStatus(req, res, next) {
    try {
      const data = await MonetizationController.getCheckinStatus(req.user._id);
      return ApiResponse.success(res, { data });
    } catch (e) { next(e); }
  },

  async claimCheckin(req, res, next) {
    try {
      const result = await MonetizationController.claimDailyCheckin(req.user._id, req.body || {});
      if (!result.success) {
        return ApiResponse.success(res, { data: result, message: result.message || 'Check-in not available' });
      }
      return ApiResponse.success(res, { data: result, message: `Claimed ${result.coins} coins!` });
    } catch (e) { next(e); }
  },

  /** Admin-only or internal cron hook — optional auth in route */
  async reconcileCheckins(req, res, next) {
    try {
      const result = await MonetizationController.reconcileOrphanCheckins();
      return ApiResponse.success(res, { data: result });
    } catch (e) { next(e); }
  },
};

export default coinController;

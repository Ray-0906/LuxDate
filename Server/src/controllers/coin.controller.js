import MonetizationController from '../engines/MonetizationController.js';
import ApiResponse from '../utils/response.js';

const coinController = {
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

  async claimCheckin(req, res, next) {
    try {
      const result = await MonetizationController.claimDailyCheckin(req.user._id);
      if (result.alreadyClaimed) {
        return ApiResponse.success(res, { data: result, message: 'Already claimed today' });
      }
      return ApiResponse.success(res, { data: result, message: `Claimed ${result.coins} coins!` });
    } catch (e) { next(e); }
  },
};

export default coinController;

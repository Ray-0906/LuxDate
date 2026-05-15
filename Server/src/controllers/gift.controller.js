import giftService from '../services/gift.service.js';
import ApiResponse from '../utils/response.js';

const giftController = {
  async getCatalog(req, res, next) {
    try {
      const gifts = await giftService.getCatalog();
      return ApiResponse.success(res, { data: gifts });
    } catch (e) { next(e); }
  },

  async sendGift(req, res, next) {
    try {
      const result = await giftService.sendGift(req.user._id, req.body);
      if (result?.error && result.code === 'invalid_quantity') {
        return res.status(result.statusCode).json({
          success: false,
          message: result.message,
          data: { code: result.code },
        });
      }
      if (result?.error) {
        return res.status(402).json({
          success: false,
          message: 'Insufficient coins',
          data: {
            paywallType: result.paywallType,
            coinBalance: result.coinBalance,
            code: result.code,
          },
        });
      }
      return ApiResponse.success(res, { data: result, message: 'Gift sent!' });
    } catch (e) { next(e); }
  },
};

export default giftController;

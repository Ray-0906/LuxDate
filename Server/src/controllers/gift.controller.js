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
      if (result.error) {
        return ApiResponse.error(res, {
          message: 'Insufficient coins',
          statusCode: 402,
          data: { paywallType: result.paywallType, coinBalance: result.coinBalance },
        });
      }
      return ApiResponse.success(res, { data: result, message: 'Gift sent!' });
    } catch (e) { next(e); }
  },
};

export default giftController;

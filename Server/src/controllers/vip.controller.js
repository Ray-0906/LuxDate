import vipService from '../services/vip.service.js';
import ApiResponse from '../utils/response.js';

const vipController = {
  async getPlans(req, res, next) {
    try {
      const plans = await vipService.getPlans();
      return ApiResponse.success(res, { data: plans });
    } catch (e) { next(e); }
  },

  async purchase(req, res, next) {
    try {
      const sub = await vipService.purchase(req.user._id, req.body.planId, req.body.paymentTransactionId);
      return ApiResponse.success(res, { data: sub, message: 'VIP activated!', statusCode: 201 });
    } catch (e) { next(e); }
  },
};

export default vipController;

import vipService from '../services/vip.service.js';
import ApiResponse from '../utils/response.js';
import env from '../config/env.js';
import PaymentTransaction from '../models/PaymentOrder.js';
import { PAYMENT_STATUS } from '../utils/constants.js';

const vipController = {
  async getPlans(req, res, next) {
    try {
      const plans = await vipService.getPlans();
      return ApiResponse.success(res, { data: plans });
    } catch (e) { next(e); }
  },

  async getStatus(req, res, next) {
    try {
      const data = await vipService.getStatus(req.user._id);
      return ApiResponse.success(res, { data });
    } catch (e) { next(e); }
  },

  async purchase(req, res, next) {
    try {
      if (env.isProd) {
        const { planId, paymentTransactionId } = req.body;
        if (!paymentTransactionId) {
          return res.status(403).json({
            success: false,
            message: 'VIP purchase requires completed payment in production',
          });
        }
        const pt = await PaymentTransaction.findById(paymentTransactionId);
        if (!pt || String(pt.userId) !== String(req.user._id) || pt.status !== PAYMENT_STATUS.SUCCESS) {
          return res.status(403).json({
            success: false,
            message: 'Invalid payment transaction',
          });
        }
      }
      const sub = await vipService.purchase(req.user._id, req.body.planId, req.body.paymentTransactionId);
      return ApiResponse.success(res, { data: sub, message: 'VIP activated!', statusCode: 201 });
    } catch (e) { next(e); }
  },
};

export default vipController;

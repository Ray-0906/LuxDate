import paymentService from '../services/payment/payment.service.js';
import ApiResponse from '../utils/response.js';

const paymentController = {
  async createCoinOrder(req, res, next) {
    try {
      const result = await paymentService.createCoinPurchaseOrder(req.user._id, req.body);
      return ApiResponse.created(res, { data: result, message: 'Order created' });
    } catch (e) { next(e); }
  },
  async createVipOrder(req, res, next) {
    try {
      const result = await paymentService.createVipPurchaseOrder(req.user._id, req.body);
      return ApiResponse.created(res, { data: result, message: 'Order created' });
    } catch (e) { next(e); }
  },
  async verifyPayment(req, res, next) {
    try {
      const result = await paymentService.verifyPayment(
        req.user._id,
        req.params.orderId,
        req.body
      );
      return ApiResponse.success(res, {
        data: result,
        message: result.verified ? 'Payment verified' : 'Verification failed',
      });
    } catch (e) { next(e); }
  },
  async reconcilePayment(req, res, next) {
    try {
      const result = await paymentService.reconcileOrder(req.user._id, req.params.orderId);
      return ApiResponse.success(res, { data: result, message: 'Reconcile attempt complete' });
    } catch (e) { next(e); }
  },
  async getOrder(req, res, next) {
    try {
      const order = await paymentService.getOrder(req.user._id, req.params.orderId);
      return ApiResponse.success(res, { data: order });
    } catch (e) { next(e); }
  },
  async getMyOrders(req, res, next) {
    try {
      const result = await paymentService.getUserOrders(req.user._id, req.query);
      return ApiResponse.paginated(res, {
        data: result.orders,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (e) { next(e); }
  },
  async getGateways(req, res, next) {
    try {
      const gateways = await paymentService.getAvailableGateways();
      return ApiResponse.success(res, { data: { gateways } });
    } catch (e) { next(e); }
  },
};
export default paymentController;

import vipService from '../../services/vip.service.js';
import ApiResponse from '../../utils/response.js';

const adminVipController = {
  async listPlans(req, res, next) {
    try {
      const plans = await vipService.getAllPlans();
      return ApiResponse.success(res, { data: { plans } });
    } catch (e) { next(e); }
  },
  async createPlan(req, res, next) {
    try {
      const plan = await vipService.createPlan(req.body);
      return ApiResponse.created(res, { data: { plan }, message: 'Plan created' });
    } catch (e) { next(e); }
  },
  async updatePlan(req, res, next) {
    try {
      const plan = await vipService.updatePlan(req.params.planId, req.body);
      return ApiResponse.success(res, { data: { plan }, message: 'Plan updated' });
    } catch (e) { next(e); }
  },
  async deletePlan(req, res, next) {
    try {
      await vipService.deletePlan(req.params.planId);
      return ApiResponse.success(res, { message: 'Plan deleted' });
    } catch (e) { next(e); }
  },
  async listSubscriptions(req, res, next) {
    try {
      const result = await vipService.listSubscriptions(req.query);
      return ApiResponse.paginated(res, { data: result.subscriptions, total: result.total, page: result.page, limit: result.limit });
    } catch (e) { next(e); }
  },
};
export default adminVipController;

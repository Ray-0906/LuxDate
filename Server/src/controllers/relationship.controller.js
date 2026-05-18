import relationshipService from '../services/relationship.service.js';
import ApiResponse from '../utils/response.js';

const relationshipController = {
  async getOptions(req, res, next) {
    try {
      const data = await relationshipService.getOptions(req.user._id, req.params.girlId);
      return ApiResponse.success(res, { data });
    } catch (error) {
      next(error);
    }
  },

  async getMyConnections(req, res, next) {
    try {
      const data = await relationshipService.getMyConnections(req.user._id);
      return ApiResponse.success(res, { data });
    } catch (error) {
      next(error);
    }
  },

  async invite(req, res, next) {
    try {
      const result = await relationshipService.invite(req.user._id, req.body || {});
      if (result?.error && result.code === 'insufficient_coins') {
        return res.status(402).json({
          success: false,
          message: result.message || 'Insufficient coins',
          data: {
            paywallType: result.paywallType,
            coinBalance: result.coinBalance,
            requiredCoins: result.requiredCoins,
            code: result.code,
          },
        });
      }
      return ApiResponse.success(res, { data: result, message: 'Relationship request sent' });
    } catch (error) {
      next(error);
    }
  },

  async accept(req, res, next) {
    try {
      const data = await relationshipService.accept(req.user._id, req.params.relationshipId);
      return ApiResponse.success(res, { data });
    } catch (error) {
      next(error);
    }
  },

  async break(req, res, next) {
    try {
      const data = await relationshipService.break(req.user._id, req.params.relationshipId, req.body || {});
      return ApiResponse.success(res, { data, message: 'Relationship ended' });
    } catch (error) {
      next(error);
    }
  },
};

export default relationshipController;

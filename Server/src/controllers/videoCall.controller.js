import videoCallService from '../services/videoCall.service.js';
import ApiResponse from '../utils/response.js';

const videoCallController = {
  async trigger(req, res, next) {
    try {
      const result = await videoCallService.triggerCall(req.user._id, req.query.girlId);
      if (!result) {
        return ApiResponse.error(res, { message: 'No profiles available', statusCode: 404 });
      }

      // Create a call session record
      const session = await videoCallService.createCallSession(
        req.user._id,
        result.girl._id,
        req.query.triggerType || 'profile_visit',
        result.callType
      );

      return ApiResponse.success(res, {
        data: { ...result, callId: session._id },
        message: 'Call triggered',
      });
    } catch (e) { next(e); }
  },

  async endCall(req, res, next) {
    try {
      const result = await videoCallService.endCall(req.user._id, req.params.callId, req.body);
      return ApiResponse.success(res, { data: result, message: 'Call ended' });
    } catch (e) { next(e); }
  },

  async acceptCall(req, res, next) {
    try {
      const isDirectGirlId = req.query.isDirect === 'true';
      const result = await videoCallService.acceptCall(req.user._id, req.params.callId, isDirectGirlId);
      if (result.error) {
        return ApiResponse.error(res, {
          message: 'Insufficient balance',
          statusCode: 402,
          data: { paywallType: result.paywallType, coinBalance: result.coinBalance },
        });
      }
      return ApiResponse.success(res, { data: result, message: 'Call accepted' });
    } catch (e) { next(e); }
  },

    async clearHistory(req, res, next) {
    try {
      await videoCallService.clearAllHistory(req.user._id);
      return ApiResponse.success(res, { message: 'Call history cleared' });
    } catch (e) { next(e); }
  },

  async history(req, res, next) {
    try {
      const result = await videoCallService.getCallHistory(req.user._id, req.query);
      return ApiResponse.paginated(res, { data: result.calls, total: result.total, page: result.page, limit: result.limit });
    } catch (e) { next(e); }
  },
};

export default videoCallController;


import appSettingService from '../../services/appSetting.service.js';
import videoCallService from '../../services/videoCall.service.js';
import ApiResponse from '../../utils/response.js';

const adminSettingsController = {
  async getAll(req, res, next) {
    try {
      const settings = await appSettingService.getAll(req.query.group);
      return ApiResponse.success(res, { data: { settings } });
    } catch (e) { next(e); }
  },
  async set(req, res, next) {
    try {
      const setting = await appSettingService.set(req.body.key, req.body.value, {
        description: req.body.description,
        group: req.body.group,
      });
      return ApiResponse.success(res, { data: { setting }, message: 'Setting saved' });
    } catch (e) { next(e); }
  },
  async delete(req, res, next) {
    try {
      await appSettingService.delete(req.params.key);
      return ApiResponse.success(res, { message: 'Setting deleted' });
    } catch (e) { next(e); }
  },
  async seedDefaults(req, res, next) {
    try {
      await appSettingService.seedDefaults();
      return ApiResponse.success(res, { message: 'Defaults seeded' });
    } catch (e) { next(e); }
  },
  async getCallLogs(req, res, next) {
    try {
      const result = await videoCallService.getAllCallLogs(req.query);
      return ApiResponse.paginated(res, { data: result.calls, total: result.total, page: result.page, limit: result.limit });
    } catch (e) { next(e); }
  },
};
export default adminSettingsController;

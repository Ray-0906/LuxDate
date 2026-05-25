import appSettingService from '../services/appSetting.service.js';
import ApiResponse from '../utils/response.js';

const appController = {
  async getSettings(req, res, next) {
    try {
      const settings = await appSettingService.getPublicAppSettingsPayload();
      return ApiResponse.success(res, { data: settings });
    } catch (e) {
      next(e);
    }
  },
};

export default appController;

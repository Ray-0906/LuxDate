import appSettingService from '../../services/appSetting.service.js';
import videoCallService from '../../services/videoCall.service.js';
import uploadService from '../../services/upload.service.js';
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
  async saveAppSettings(req, res, next) {
    try {
      const { appName, nonVipRate, vipRate, checkinRewards = [] } = req.body;
      const settings = await appSettingService.setMany([
        {
          key: 'app_name',
          value: appName,
          group: 'branding',
          description: 'Application name',
        },
        {
          key: 'call_cost_per_minute_non_vip',
          value: Number(nonVipRate),
          group: 'calls',
          description: 'Coins per minute of video call for non-VIP users',
        },
        {
          key: 'call_cost_per_minute_vip',
          value: Number(vipRate),
          group: 'calls',
          description: 'Coins per minute of video call for VIP users',
        },
        ...Array.from({ length: 7 }).map((_, index) => ({
          key: `checkin_day_${index + 1}_coins`,
          value: Number(checkinRewards[index]),
          group: 'coins',
          description: `New-user check-in reward for Day ${index + 1}`,
        })),
      ]);
      return ApiResponse.success(res, { data: { settings }, message: 'App settings saved' });
    } catch (e) { next(e); }
  },
  async saveBranding(req, res, next) {
    try {
      const setting = await appSettingService.set('app_logo_url', req.body.logoUrl, {
        group: 'branding',
        description: 'Remote application logo URL',
      });
      return ApiResponse.success(res, { data: { setting }, message: 'Branding updated' });
    } catch (e) { next(e); }
  },
  async uploadBrandingLogo(req, res, next) {
    try {
      if (!req.file?.buffer) {
        return ApiResponse.error(res, { message: 'No logo file provided', statusCode: 400 });
      }
      const upload = await uploadService.uploadImage(req.file.buffer, {
        folder: 'luxdate/branding',
        publicId: `app_logo_${Date.now()}`,
        transformation: [
          { width: 512, height: 512, crop: 'limit', quality: 'auto', format: 'png' },
        ],
      });
      const setting = await appSettingService.set('app_logo_url', upload.url, {
        group: 'branding',
        description: 'Remote application logo URL',
      });
      return ApiResponse.success(res, {
        data: { setting, url: upload.url },
        message: 'Logo uploaded',
      });
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

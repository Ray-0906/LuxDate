import girlService from '../../services/girl.service.js';
import uploadService from '../../services/upload.service.js';
import ApiResponse from '../../utils/response.js';

const adminGiftController = {
  async list(req, res, next) {
    try {
      const gifts = await girlService.listAllGifts();
      return ApiResponse.success(res, { data: { gifts } });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      let iconUrl = req.body.iconUrl || req.body.image || '';
      if (req.file?.buffer) {
        const r = await uploadService.uploadGiftImage(req.file.buffer);
        iconUrl = r.url;
      }
      const gift = await girlService.createGift({
        ...req.body,
        iconUrl,
      });
      return ApiResponse.created(res, { data: { gift }, message: 'Gift created' });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const gift = await girlService.updateGift(req.params.giftId, req.body);
      return ApiResponse.success(res, { data: { gift }, message: 'Gift updated' });
    } catch (e) { next(e); }
  },
  async delete(req, res, next) {
    try {
      await girlService.deleteGift(req.params.giftId);
      return ApiResponse.success(res, { message: 'Gift deleted' });
    } catch (e) { next(e); }
  },
  async getStats(req, res, next) {
    try {
      const result = await girlService.getGiftStats(req.query);
      return ApiResponse.paginated(res, { data: result.logs, total: result.total, page: result.page, limit: result.limit });
    } catch (e) { next(e); }
  },
};
export default adminGiftController;

import CoinPack from '../../models/CoinPack.js';
import ApiResponse from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

const adminCoinPackController = {
  async list(req, res, next) {
    try {
      const packs = await CoinPack.find().sort({ sortOrder: 1, priceInr: 1 }).lean();
      return ApiResponse.success(res, { data: { packs } });
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const pack = await CoinPack.create(req.body);
      return ApiResponse.created(res, { data: { pack } });
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const pack = await CoinPack.findByIdAndUpdate(req.params.packId, req.body, { new: true }).lean();
      if (!pack) throw new NotFoundError('Pack not found');
      return ApiResponse.success(res, { data: { pack } });
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const r = await CoinPack.findByIdAndDelete(req.params.packId);
      if (!r) throw new NotFoundError('Pack not found');
      return ApiResponse.success(res, { message: 'Deleted' });
    } catch (e) { next(e); }
  },
};

export default adminCoinPackController;

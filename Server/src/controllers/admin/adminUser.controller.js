import User from '../../models/User.js';
import coinService from '../../services/coin.service.js';
import ApiResponse from '../../utils/response.js';
import { COIN_TX_TYPES } from '../../utils/constants.js';
import { parsePagination } from '../../utils/helpers.js';
import { NotFoundError } from '../../utils/errors.js';

const adminUserController = {
  async list(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const filter = {};
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search, $options: 'i' } },
        ];
      }
      const [users, total] = await Promise.all([
        User.find(filter).select('-refreshToken -__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
      ]);
      return ApiResponse.paginated(res, { data: users, total, page, limit });
    } catch (e) { next(e); }
  },

  async getById(req, res, next) {
    try {
      const user = await User.findById(req.params.userId).select('-refreshToken -__v').lean();
      if (!user) throw new NotFoundError('User not found');
      return ApiResponse.success(res, { data: { user } });
    } catch (e) { next(e); }
  },

  async toggleBlock(req, res, next) {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) throw new NotFoundError('User not found');
      user.isBlocked = !user.isBlocked;
      await user.save();
      return ApiResponse.success(res, {
        data: { isBlocked: user.isBlocked },
        message: user.isBlocked ? 'User blocked' : 'User unblocked',
      });
    } catch (e) { next(e); }
  },

  async addCoins(req, res, next) {
    try {
      const { amount, note, description } = req.body;
      const result = await coinService.credit(
        req.params.userId,
        amount,
        COIN_TX_TYPES.ADMIN_ADJUST,
        { note: note || description || 'Admin credit' }
      );
      return ApiResponse.success(res, { data: result, message: 'Coins added' });
    } catch (e) { next(e); }
  },

  async deductCoins(req, res, next) {
    try {
      const { amount, note, description } = req.body;
      const result = await coinService.debit(
        req.params.userId,
        amount,
        COIN_TX_TYPES.ADMIN_ADJUST,
        { note: note || description || 'Admin deduction' }
      );
      return ApiResponse.success(res, { data: result, message: 'Coins deducted' });
    } catch (e) { next(e); }
  },

  async getTransactions(req, res, next) {
    try {
      const result = await coinService.getTransactions(req.params.userId, req.query);
      return ApiResponse.paginated(res, {
        data: result.transactions, total: result.total,
        page: result.page, limit: result.limit,
      });
    } catch (e) { next(e); }
  },
};

export default adminUserController;

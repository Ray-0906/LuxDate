import PaymentTransaction from '../../models/PaymentOrder.js';
import ApiResponse from '../../utils/response.js';
import { parsePagination } from '../../utils/helpers.js';

const adminPaymentController = {
  async list(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.purpose) filter.purpose = req.query.purpose;
      if (req.query.userId) filter.userId = req.query.userId;

      const [orders, total] = await Promise.all([
        PaymentTransaction.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'phone name username')
          .lean(),
        PaymentTransaction.countDocuments(filter),
      ]);
      return ApiResponse.paginated(res, {
        data: orders, total, page, limit,
      });
    } catch (e) { next(e); }
  },
};

export default adminPaymentController;

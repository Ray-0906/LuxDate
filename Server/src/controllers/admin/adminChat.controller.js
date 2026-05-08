import ChatSession from '../../models/Conversation.js';
import ChatMessage from '../../models/Message.js';
import GirlProfile from '../../models/Girl.js';
import User from '../../models/User.js';
import AutoReplyPool from '../../models/AutoReplyPool.js';
import ApiResponse from '../../utils/response.js';
import { parsePagination } from '../../utils/helpers.js';
import { SENDER_TYPES, MESSAGE_TYPES } from '../../utils/constants.js';

const adminChatController = {
  async getInbox(req, res, next) {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const [sessions, total] = await Promise.all([
        ChatSession.find({}).sort({ updatedAt: -1 }).skip(skip).limit(limit)
          .populate('userId', 'name phone profilePhotoUrl')
          .populate('girlProfileId', 'name photos')
          .lean(),
        ChatSession.countDocuments({}),
      ]);
      return ApiResponse.paginated(res, { data: sessions, total, page, limit });
    } catch (e) { next(e); }
  },

  async getMessages(req, res, next) {
    try {
      const { userId, girlId } = req.params;
      const { page, limit, skip } = parsePagination(req.query);
      const filter = {};
      if (userId) filter.userId = userId;
      if (girlId) filter.girlProfileId = girlId;

      const [messages, total] = await Promise.all([
        ChatMessage.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
        ChatMessage.countDocuments(filter),
      ]);
      return ApiResponse.paginated(res, { data: messages.reverse(), total, page, limit });
    } catch (e) { next(e); }
  },

  async sendAsGirl(req, res, next) {
    try {
      const { userId, girlId } = req.params;
      const { text } = req.body;

      const msg = await ChatMessage.create({
        userId,
        girlProfileId: girlId,
        senderType: SENDER_TYPES.ADMIN,
        content: { type: MESSAGE_TYPES.TEXT, text },
        sentAt: new Date(),
      });

      // Update session
      await ChatSession.findOneAndUpdate(
        { userId, girlProfileId: girlId },
        { isWaitingForUser: true, lastGirlMessageAt: new Date() },
        { upsert: true }
      );

      return ApiResponse.created(res, { data: msg, message: 'Message sent as girl' });
    } catch (e) { next(e); }
  },

  async manageAutoReplyPool(req, res, next) {
    try {
      if (req.method === 'GET') {
        const pools = await AutoReplyPool.find({}).lean();
        return ApiResponse.success(res, { data: pools });
      }
      // POST — add/update
      const { language, category, messages } = req.body;
      const pool = await AutoReplyPool.findOneAndUpdate(
        { language, category },
        { messages },
        { upsert: true, new: true }
      );
      return ApiResponse.success(res, { data: pool, message: 'Auto-reply pool updated' });
    } catch (e) { next(e); }
  },
};

export default adminChatController;

import chatService from '../services/chat.service.js';
import ApiResponse from '../utils/response.js';

const chatController = {
  async getInbox(req, res, next) {
    try {
      const data = await chatService.getInbox(req.user._id, req.query);
      return ApiResponse.success(res, { data, message: 'Inbox retrieved' });
    } catch (e) { next(e); }
  },

  async getMessages(req, res, next) {
    try {
      const data = await chatService.getMessages(req.user._id, req.params.girlId, req.query);
      return ApiResponse.success(res, { data, message: 'Messages retrieved' });
    } catch (e) { next(e); }
  },

  async sendMessage(req, res, next) {
    try {
      const msg = await chatService.sendMessage(req.user._id, req.params.girlId, req.body);
      return ApiResponse.success(res, { data: msg, message: 'Message sent', statusCode: 201 });
    } catch (e) { next(e); }
  },

  async deliverPrefetchMessage(req, res, next) {
    try {
      const msg = await chatService.deliverPrefetchedMessage(req.user._id, req.body);
      return ApiResponse.success(res, { data: msg, message: 'Prefetched message delivered', statusCode: 201 });
    } catch (e) { next(e); }
  },

    async deleteConversation(req, res, next) {
    try {
      await chatService.deleteConversation(req.user._id, req.params.conversationId);
      return ApiResponse.success(res, { message: 'Conversation deleted' });
    } catch (e) { next(e); }
  },

  async clearAll(req, res, next) {
    try {
      await chatService.clearAll(req.user._id);
      return ApiResponse.success(res, { message: 'All chats cleared' });
    } catch (e) { next(e); }
  },

  async triggerAutoMessage(req, res, next) {
    try {
      const msg = await chatService.triggerAutoMessage(req.user._id);
      return ApiResponse.success(res, { data: msg, message: 'Triggered' });
    } catch (e) { next(e); }
  },

  async prefetchAutoMessages(req, res, next) {
    try {
      const count = parseInt(req.query.count) || 3;
      const msgs = await chatService.prefetchAutoMessages(req.user._id, count);
      return ApiResponse.success(res, { data: msgs, message: 'Prefetched' });
    } catch (e) { next(e); }
  },
};

export default chatController;


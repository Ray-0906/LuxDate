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

  async clearAll(req, res, next) {
    try {
      await chatService.clearAll(req.user._id);
      return ApiResponse.success(res, { message: 'All chats cleared' });
    } catch (e) { next(e); }
  },
};

export default chatController;

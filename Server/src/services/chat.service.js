import ChatSession from '../models/Conversation.js';
import ChatMessage from '../models/Message.js';
import GirlProfile from '../models/Girl.js';
import AutoReplyEngine from '../engines/AutoReplyEngine.js';
import { SENDER_TYPES, MESSAGE_TYPES, CHAT_SESSION_STATUS, CALL_STATUS } from '../utils/constants.js';

const chatService = {
  /**
   * GET /chat/inbox — list all conversations with last message
   */
  async getInbox(userId, query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 30;
    const skip = (page - 1) * limit;

    const sessions = await ChatSession.find({
      userId,
      status: CHAT_SESSION_STATUS.ACTIVE,
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich with girl data and last message
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const [girl, lastMsg] = await Promise.all([
          GirlProfile.findById(s.girlProfileId).select('name photos charmLevel').lean(),
          ChatMessage.findOne({ userId, girlProfileId: s.girlProfileId })
            .sort({ sentAt: -1 })
            .lean(),
        ]);

        // Count unread
        const unreadCount = await ChatMessage.countDocuments({
          userId,
          girlProfileId: s.girlProfileId,
          senderType: { $ne: SENDER_TYPES.USER },
          isRead: false,
        });

        return {
          ...s,
          girl,
          lastMessage: lastMsg?.content?.text || '',
          lastMessageType: lastMsg?.content?.type || 'text',
          unreadCount,
        };
      })
    );

    return enriched;
  },

  /**
   * GET /chat/:girlId/messages — paginated messages
   */
  async getMessages(userId, girlProfileId, query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    // Mark messages as read
    await ChatMessage.updateMany(
      { userId, girlProfileId, senderType: { $ne: SENDER_TYPES.USER }, isRead: false },
      { isRead: true }
    );

    const messages = await ChatMessage.find({ userId, girlProfileId })
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return messages.reverse(); // oldest first
  },

  /**
   * POST /chat/:girlId/send — send a user message, get auto-reply
   */
  async sendMessage(userId, girlProfileId, { text, type = 'text', mediaUrl = null }) {
    // Ensure session exists
    let session = await ChatSession.findOne({ userId, girlProfileId });
    if (!session) {
      session = await ChatSession.create({
        userId,
        girlProfileId,
        isWaitingForUser: false,
        status: CHAT_SESSION_STATUS.ACTIVE,
      });
    }

    // Save user message
    const userMsg = await ChatMessage.create({
      userId,
      girlProfileId,
      senderType: SENDER_TYPES.USER,
      content: {
        type: type === 'photo' ? MESSAGE_TYPES.PHOTO : MESSAGE_TYPES.TEXT,
        text: text || '',
        mediaUrl,
      },
      sentAt: new Date(),
    });

    // Update session
    session.lastUserMessageAt = new Date();
    await session.save();

    // Trigger auto-reply (async, don't block response)
    AutoReplyEngine.processUserMessage(userId, girlProfileId).catch(() => {});

    return userMsg;
  },

  /**
   * Insert a call log message into chat
   */
  async insertCallLog(userId, girlProfileId, status, durationSeconds = 0) {
    await ChatMessage.create({
      userId,
      girlProfileId,
      senderType: SENDER_TYPES.AUTO,
      content: {
        type: MESSAGE_TYPES.CALL_LOG,
        text: status === CALL_STATUS.ACCEPTED
          ? `Video call · ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
          : status === CALL_STATUS.DECLINED ? 'Declined call' : 'Missed call',
        callLog: { status, durationSeconds },
      },
      sentAt: new Date(),
    });
  },

  /**
   * DELETE /chat/clear-all
   */
  async clearAll(userId) {
    await ChatSession.updateMany({ userId }, { status: CHAT_SESSION_STATUS.CLOSED });
    return { cleared: true };
  },
};

export default chatService;

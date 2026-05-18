import ChatSession from '../models/Conversation.js';
import ChatMessage from '../models/Message.js';
import GirlProfile from '../models/Girl.js';
import AutoReplyEngine from '../engines/AutoReplyEngine.js';
import AutoReplyPool from '../models/AutoReplyPool.js';
import { SENDER_TYPES, MESSAGE_TYPES, CHAT_SESSION_STATUS, CALL_STATUS } from '../utils/constants.js';
import { getIO } from '../config/socket.js';

const formatLastMessagePreview = (message) => {
  const type = message?.content?.type || MESSAGE_TYPES.TEXT;
  if (type === MESSAGE_TYPES.GIFT) {
    const giftName = message?.content?.giftName || 'gift';
    const quantity = message?.content?.quantity || 1;
    return quantity > 1 ? `Sent ${quantity}x ${giftName}` : `Sent ${giftName}`;
  }
  if (type === MESSAGE_TYPES.PHOTO) return 'Photo';
  if (type === MESSAGE_TYPES.RELATIONSHIP_EVENT) return message?.content?.text || 'Relationship update';
  return message?.content?.text || '';
};

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
          lastMessage: formatLastMessagePreview(lastMsg),
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

  async deliverPrefetchedMessage(userId, { girlId, text, notificationId = null }) {
    if (notificationId) {
      const existingMessage = await ChatMessage.findOne({
        userId,
        clientDeliveryId: notificationId,
      }).lean();

      if (existingMessage) {
        return existingMessage;
      }
    }

    const sentAt = new Date();
    const deliveredMessage = await ChatMessage.create({
      userId,
      girlProfileId: girlId,
      senderType: SENDER_TYPES.AUTO,
      clientDeliveryId: notificationId,
      content: {
        type: MESSAGE_TYPES.TEXT,
        text: text || 'Hello!',
      },
      sentAt,
    });

    await ChatSession.findOneAndUpdate(
      { userId, girlProfileId: girlId },
      {
        $set: {
          status: CHAT_SESSION_STATUS.ACTIVE,
          isWaitingForUser: true,
          lastGirlMessageAt: sentAt,
        },
      },
      { upsert: true }
    );

    return deliveredMessage;
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

  /**
   * GET /messages/trigger — Triggers a single fake incoming message.
   */
  async triggerAutoMessage(userId) {
    // Pick a random girl to send message from
    const girlsCount = await GirlProfile.countDocuments({ isActive: true });
    if (!girlsCount) return null;

    const randomSkip = Math.floor(Math.random() * girlsCount);
    const girl = await GirlProfile.findOne({ isActive: true }).skip(randomSkip);
    
    if (!girl) return null;

    const lang = girl.language === 'Hindi' ? 'hi' : girl.language === 'Bengali' ? 'bn' : 'en';
    const pool = await AutoReplyPool.aggregate([
      { $match: { language: lang, category: 'greeting' } }, // Prefer greetings for triggers
      { $sample: { size: 1 } },
    ]);

    let replyText = 'Hi!';
    if (pool.length && pool[0].messages?.length) {
      const messages = pool[0].messages;
      replyText = messages[Math.floor(Math.random() * messages.length)];
    }

    const payload = {
      userId,
      girlProfileId: girl._id,
      senderType: SENDER_TYPES.AUTO,
      content: { type: MESSAGE_TYPES.TEXT, text: replyText },
      sentAt: new Date(),
    };

    const reply = await ChatMessage.create(payload);
    const emittedReply = {
      ...reply.toObject(),
      source: 'trigger',
      girl: {
        _id: girl._id,
        name: girl.name,
        avatar: girl.photos?.[0] || null,
      },
    };

    await ChatSession.findOneAndUpdate(
      { userId, girlProfileId: girl._id },
      { 
        $set: { lastGirlMessageAt: new Date(), isWaitingForUser: true }, 
        $setOnInsert: { status: CHAT_SESSION_STATUS.ACTIVE }
      },
      { upsert: true, new: true }
    );

    try {
      getIO().to(`user:${userId}`).emit('new_message', emittedReply);
    } catch (err) {
      console.error('Socket emission failed', err.message);
    }

    return {
      message: emittedReply,
      girl: emittedReply.girl,
    };
  },

  /**
   * GET /messages/prefetch — Generates an array of future fake messages for offline local pushes.
   */
  async prefetchAutoMessages(userId, count = 3) {
    const girls = await GirlProfile.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: count } }
    ]);

    const prefetchedMessages = [];

    for (const girl of girls) {
      const lang = girl.language === 'Hindi' ? 'hi' : girl.language === 'Bengali' ? 'bn' : 'en';
      const pool = await AutoReplyPool.aggregate([
        { $match: { language: lang } },
        { $sample: { size: 1 } },
      ]);
  
      let replyText = 'Hello!';
      if (pool.length && pool[0].messages?.length) {
        const messages = pool[0].messages;
        replyText = messages[Math.floor(Math.random() * messages.length)];
      }

      prefetchedMessages.push({
        girlId: girl._id,
        girlName: girl.name,
        girlAvatar: girl.photos?.[0] || null,
        text: replyText
      });
    }

    return prefetchedMessages;
  }
};

export default chatService;

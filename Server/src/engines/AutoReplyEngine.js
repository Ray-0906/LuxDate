import ChatMessage from '../models/Message.js';
import ChatSession from '../models/Conversation.js';
import GirlProfile from '../models/Girl.js';
import AutoReplyPool from '../models/AutoReplyPool.js';
import { SENDER_TYPES, MESSAGE_TYPES, CHAT_SESSION_STATUS, REPLY_CATEGORIES } from '../utils/constants.js';
import { getIO } from '../config/socket.js';

/**
 * AutoReplyEngine — picks a reply from pool and sends it after delay.
 */
const AutoReplyEngine = {
  resolveLanguage(girl) {
    return girl?.language === 'Hindi' ? 'hi' : girl?.language === 'Bengali' ? 'bn' : 'en';
  },

  async createAndEmitReply({ userId, girlProfileId, session, girl, replyText, source = 'auto_reply' }) {
    const reply = await ChatMessage.create({
      userId,
      girlProfileId,
      senderType: SENDER_TYPES.AUTO,
      content: { type: MESSAGE_TYPES.TEXT, text: replyText },
      sentAt: new Date(),
    });

    session.isWaitingForUser = true;
    session.lastGirlMessageAt = new Date();
    await session.save();

    try {
      getIO().to(`user:${userId}`).emit('new_message', {
        ...reply.toObject(),
        source,
        girl: {
          _id: girlProfileId,
          name: girl?.name,
          avatar: girl?.photos?.[0] || null,
        },
      });
    } catch (socketError) {
      console.error('AutoReplyEngine socket emission failed:', socketError.message);
    }

    return reply;
  },

  async processUserMessage(userId, girlProfileId) {
    const session = await ChatSession.findOne({ userId, girlProfileId });
    if (!session || session.status === CHAT_SESSION_STATUS.CLOSED) return null;

    if (session.isWaitingForUser) {
      session.isWaitingForUser = false;
      session.lastUserMessageAt = new Date();
      await session.save();
    }

    const girl = await GirlProfile.findById(girlProfileId).select('language name photos').lean();
    const lang = this.resolveLanguage(girl);

    const pool = await AutoReplyPool.aggregate([
      { $match: { language: lang } },
      { $sample: { size: 1 } },
    ]);

    if (!pool.length || !pool[0].messages?.length) return null;

    const messages = pool[0].messages;
    const replyText = messages[Math.floor(Math.random() * messages.length)];
    const delayMs = Math.floor(Math.random() * 2000) + 1000;

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const reply = await this.createAndEmitReply({
            userId,
            girlProfileId,
            session,
            girl,
            replyText,
            source: 'auto_reply',
          });
          resolve(reply);
        } catch (e) {
          console.error('AutoReplyEngine error:', e.message);
          resolve(null);
        }
      }, delayMs);
    });
  },

  async processGiftReaction({ userId, girlId, giftName, callSessionId = null }) {
    const session = await ChatSession.findOne({ userId, girlProfileId: girlId });
    if (!session || session.status === CHAT_SESSION_STATUS.CLOSED) return null;

    const girl = await GirlProfile.findById(girlId).select('language name photos').lean();
    const lang = this.resolveLanguage(girl);

    const pool = await AutoReplyPool.aggregate([
      { $match: { language: lang, category: REPLY_CATEGORIES.GIFT_REACTION } },
      { $sample: { size: 1 } },
    ]);

    let replyText = `Aww, thank you for the ${giftName}!`;
    if (pool.length && pool[0].messages?.length) {
      const messages = pool[0].messages;
      replyText = messages[Math.floor(Math.random() * messages.length)].replaceAll('{gift}', giftName);
    }

    const delayMs = Math.floor(Math.random() * 3000) + 2000;

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const reply = await this.createAndEmitReply({
            userId,
            girlProfileId: girlId,
            session,
            girl,
            replyText,
            source: 'auto_reply',
          });
          resolve(reply);
        } catch (error) {
          console.error('Gift reaction error:', error.message);
          resolve(null);
        }
      }, delayMs);
    });
  },
};

export default AutoReplyEngine;

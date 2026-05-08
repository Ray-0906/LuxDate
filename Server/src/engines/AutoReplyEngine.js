import ChatMessage from '../models/Message.js';
import ChatSession from '../models/Conversation.js';
import GirlProfile from '../models/Girl.js';
import AutoReplyPool from '../models/AutoReplyPool.js';
import { SENDER_TYPES, MESSAGE_TYPES, CHAT_SESSION_STATUS } from '../utils/constants.js';

/**
 * AutoReplyEngine — picks a reply from the pool and sends it after a delay.
 * Rules:
 *  - Only reply if chatSession.isWaitingForUser === false (girl hasn't replied yet)
 *  - After replying, set isWaitingForUser = true (wait for user to respond)
 *  - 1-3 second artificial delay
 */
const AutoReplyEngine = {
  async processUserMessage(userId, girlProfileId) {
    const session = await ChatSession.findOne({ userId, girlProfileId });
    if (!session || session.status === CHAT_SESSION_STATUS.CLOSED) return null;

    // If girl already replied and waiting for user, DON'T send another reply
    if (session.isWaitingForUser) {
      // User just responded — now we can reply
      session.isWaitingForUser = false;
      session.lastUserMessageAt = new Date();
      await session.save();
    }

    // Get girl's language for matching
    const girl = await GirlProfile.findById(girlProfileId).select('language').lean();
    const lang = girl?.language === 'Hindi' ? 'hi' : girl?.language === 'Bengali' ? 'bn' : 'en';

    // Pick a random reply from pool
    const pool = await AutoReplyPool.aggregate([
      { $match: { language: lang } },
      { $sample: { size: 1 } },
    ]);

    if (!pool.length || !pool[0].messages?.length) return null;

    const messages = pool[0].messages;
    const replyText = messages[Math.floor(Math.random() * messages.length)];

    // Delay 1-3 seconds to feel human
    const delayMs = Math.floor(Math.random() * 2000) + 1000;

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const reply = await ChatMessage.create({
            userId,
            girlProfileId,
            senderType: SENDER_TYPES.AUTO,
            content: { type: MESSAGE_TYPES.TEXT, text: replyText },
            sentAt: new Date(),
          });

          // Update session
          session.isWaitingForUser = true;
          session.lastGirlMessageAt = new Date();
          await session.save();

          resolve(reply);
        } catch (e) {
          console.error('AutoReplyEngine error:', e.message);
          resolve(null);
        }
      }, delayMs);
    });
  },
};

export default AutoReplyEngine;

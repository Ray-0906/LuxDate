import ChatMessage from '../models/Message.js';
import ChatSession from '../models/Conversation.js';
import GirlProfile from '../models/Girl.js';
import User from '../models/User.js';
import { SENDER_TYPES, MESSAGE_TYPES, CHAT_SESSION_STATUS } from '../utils/constants.js';

/**
 * FakeInteractionEngine — handles registration auto-messages.
 * On first login, sends 5-10 messages from random girl profiles.
 */
const FakeInteractionEngine = {
  async sendRegistrationMessages(userId) {
    const user = await User.findById(userId);
    if (!user || user.registrationMessagesSent) return;

    // Pick 5-10 random girls
    const count = Math.floor(Math.random() * 6) + 5;
    const girls = await GirlProfile.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: count } },
    ]);

    for (const girl of girls) {
      // Use firstMessages if available, otherwise generic
      let messageText = 'Hey! 👋';
      let messageType = MESSAGE_TYPES.TEXT;
      let mediaUrl = null;

      if (girl.firstMessages?.length) {
        const fm = girl.firstMessages[Math.floor(Math.random() * girl.firstMessages.length)];
        messageText = fm.content || 'Hey! 👋';
        if (fm.type === 'text+photo' && fm.photoUrl) {
          mediaUrl = fm.photoUrl;
        }
      }

      // Create/get chat session
      let session = await ChatSession.findOne({ userId, girlProfileId: girl._id });
      if (!session) {
        session = await ChatSession.create({
          userId,
          girlProfileId: girl._id,
          isWaitingForUser: true,
          lastGirlMessageAt: new Date(),
          status: CHAT_SESSION_STATUS.ACTIVE,
        });
      }

      // Insert message
      await ChatMessage.create({
        userId,
        girlProfileId: girl._id,
        senderType: SENDER_TYPES.AUTO,
        content: {
          type: mediaUrl ? MESSAGE_TYPES.PHOTO : MESSAGE_TYPES.TEXT,
          text: messageText,
          mediaUrl,
        },
        sentAt: new Date(Date.now() - Math.random() * 3600000), // random time in last hour
      });
    }

    // Mark as sent
    user.registrationMessagesSent = true;
    await user.save();
  },
};

export default FakeInteractionEngine;

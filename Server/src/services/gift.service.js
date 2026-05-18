import mongoose from 'mongoose';
import Gift from '../models/Gift.js';
import GiftTransaction from '../models/GiftLog.js';
import GirlProfile from '../models/Girl.js';
import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import ChatMessage from '../models/Message.js';
import ChatSession from '../models/Conversation.js';
import Relationship from '../models/Relationship.js';
import AutoReplyEngine from '../engines/AutoReplyEngine.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { AppError, ValidationError } from '../utils/errors.js';
import { COIN_TX_TYPES, MESSAGE_TYPES, SENDER_TYPES, CHAT_SESSION_STATUS } from '../utils/constants.js';
import { getIO } from '../config/socket.js';

const WEALTH_THRESHOLDS = [
  0, 100, 500, 1500, 3000, 5000, 8000, 12000,
  18000, 25000, 35000, 50000, 70000, 100000, 150000, 200000,
];

const normalizeGirlId = (payload = {}) => payload.girlId || payload.girlProfileId || null;

class GiftFlowError extends Error {
  constructor(result) {
    super(result?.message || 'Gift flow halted');
    this.name = 'GiftFlowError';
    this.result = result;
  }
}

const isTransactionSupportError = (error) => (
  typeof error?.message === 'string'
  && (
    error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
    || error.message.includes('Transaction support is not available')
    || error.message.includes('transactions are not supported')
  )
);

const calculateWealthLevel = (totalSpent) => {
  let level = 0;
  for (let i = WEALTH_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (totalSpent >= WEALTH_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
};

const RELATIONSHIP_GIFT_COPY = {
  soulmate: { icon: '💫', label: 'Soulmate' },
  lover: { icon: '❤️', label: 'Lover' },
  close_friend: { icon: '👫', label: 'Close Friend' },
  best_friend: { icon: '👫', label: 'Close Friend' },
};

const maybeSession = (query, session) => (session ? query.session(session) : query);

const createWithOptionalSession = async (Model, docs, session) => {
  if (session) {
    return Model.create(docs, { session });
  }
  return Model.create(docs);
};

const updateGirlGiftAggregation = async ({
  girlId,
  gift,
  quantity,
  session = null,
}) => {
  const existing = await maybeSession(
    GirlProfile.findOne({ _id: girlId, 'gifts.giftId': gift._id }).select('_id'),
    session
  );

  if (existing) {
    const query = GirlProfile.updateOne(
      { _id: girlId, 'gifts.giftId': gift._id },
      {
        $inc: { 'gifts.$.count': quantity },
        $set: {
          'gifts.$.giftName': gift.name,
          'gifts.$.giftIconUrl': gift.iconUrl || '',
          'gifts.$.emojiFallback': gift.emojiFallback || '',
        },
      }
    );

    if (session) {
      await query.session(session);
    } else {
      await query;
    }
    return;
  }

  const query = GirlProfile.updateOne(
    { _id: girlId },
    {
      $push: {
        gifts: {
          giftId: gift._id,
          giftName: gift.name,
          giftIconUrl: gift.iconUrl || '',
          emojiFallback: gift.emojiFallback || '',
          count: quantity,
        },
      },
    }
  );

  if (session) {
    await query.session(session);
  } else {
    await query;
  }
};

const persistGiftSend = async ({
  userId,
  giftId,
  girlId,
  quantity,
  callSessionId,
  session = null,
}) => {
  const [gift, girl, user] = await Promise.all([
    maybeSession(Gift.findOne({ _id: giftId, isActive: true }), session),
    maybeSession(GirlProfile.findOne({ _id: girlId, isActive: true }), session),
    maybeSession(User.findById(userId), session),
  ]);

  if (!gift) {
    throw new ValidationError('Validation failed', [
      { field: 'giftId', message: 'Gift not found' },
    ]);
  }

  if (!girl) {
    throw new ValidationError('Validation failed', [
      { field: 'girlId', message: 'Girl not found' },
    ]);
  }

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const totalCost = gift.coinCost * quantity;
  if (user.coinBalance < totalCost) {
    throw new GiftFlowError({
      error: true,
      code: 'insufficient_coins',
      statusCode: 402,
      paywallType: 'insufficient_coins',
      coinBalance: user.coinBalance,
      message: 'Insufficient coins',
    });
  }

  const previousWealthLevel = user.wealthLevel || 0;
  const sentAt = new Date();

  const relationship = await maybeSession(
    Relationship.findOne({
      userId,
      girlProfileId: girlId,
      status: { $in: ['accepted', 'active'] },
    }).sort({ acceptedAt: -1, createdAt: -1 }),
    session
  );
  const relationshipCopy = relationship ? RELATIONSHIP_GIFT_COPY[String(relationship.type || '').toLowerCase()] : null;
  const relationshipGiftHeadline = relationshipCopy
    ? `${relationshipCopy.icon} Your ${relationshipCopy.label} ${girl.name} received your ${gift.name} ${gift.emojiFallback || '🎁'}`
    : '';

  user.coinBalance -= totalCost;
  user.totalCoinsEverSpent += totalCost;
  user.wealthLevel = calculateWealthLevel(user.totalCoinsEverSpent);
  if (session) {
    await user.save({ session });
  } else {
    await user.save();
  }

  await createWithOptionalSession(CoinTransaction, [{
    userId,
    type: COIN_TX_TYPES.GIFT_DEDUCT,
    amount: -totalCost,
    balanceAfter: user.coinBalance,
    referenceId: String(gift._id),
    note: `Gift: ${gift.name} x${quantity} to ${girl.name}`,
  }], session);

  const [giftTxn] = await createWithOptionalSession(GiftTransaction, [{
    fromUserId: userId,
    toGirlProfileId: girlId,
    giftId: gift._id,
    giftName: gift.name,
    giftIconUrl: gift.iconUrl || '',
    giftAnimationUrl: gift.animationUrl || '',
    emojiFallback: gift.emojiFallback || '',
    quantity,
    coinCostEach: gift.coinCost,
    totalCoinsSpent: totalCost,
    callSessionId,
    sentAt,
  }], session);

  await updateGirlGiftAggregation({
    girlId,
    gift,
    quantity,
    session,
  });

  const [chatMessage] = await createWithOptionalSession(ChatMessage, [{
    userId,
    girlProfileId: girlId,
    senderType: SENDER_TYPES.USER,
    content: {
      type: MESSAGE_TYPES.GIFT,
      giftId: gift._id,
      giftName: gift.name,
      giftIconUrl: gift.iconUrl || '',
      giftAnimationUrl: gift.animationUrl || '',
      emojiFallback: gift.emojiFallback || '',
      quantity,
      totalCoinsSpent: totalCost,
      sentDuringCallSessionId: callSessionId,
      relationshipGiftHeadline,
      relationshipGiftType: relationshipCopy ? relationshipCopy.label : '',
    },
    sentAt,
  }], session);

  await ChatSession.findOneAndUpdate(
    { userId, girlProfileId: girlId },
    {
      $set: {
        status: CHAT_SESSION_STATUS.ACTIVE,
        isWaitingForUser: false,
        lastUserMessageAt: sentAt,
      },
    },
    session ? { upsert: true, new: true, session } : { upsert: true, new: true }
  );

  return {
    success: true,
    chatMessage: chatMessage.toObject(),
    coinBalance: user.coinBalance,
    wealthLevel: user.wealthLevel,
    wealthLevelChanged: user.wealthLevel > previousWealthLevel,
    giftTransactionId: String(giftTxn._id),
    gift: {
      _id: String(gift._id),
      name: gift.name,
      iconUrl: gift.iconUrl || '',
      animationUrl: gift.animationUrl || '',
      emojiFallback: gift.emojiFallback || '',
    },
    girl: {
      _id: String(girl._id),
      name: girl.name,
      avatar: girl.photos?.[0] || '',
    },
  };
};

const giftService = {
  async getCatalog() {
    return Gift.find({ isActive: true })
      .sort({ coinCost: 1, sortOrder: 1, createdAt: 1, name: 1 })
      .lean();
  },

  async sendGift(userId, payload = {}) {
    const { giftId, callSessionId = null } = payload;
    const girlId = normalizeGirlId(payload);
    const quantity = Number(payload.quantity ?? 1);

    if (!mongoose.Types.ObjectId.isValid(giftId || '')) {
      throw new ValidationError('Validation failed', [
        { field: 'giftId', message: 'Invalid giftId' },
      ]);
    }

    if (!mongoose.Types.ObjectId.isValid(girlId || '')) {
      throw new ValidationError('Validation failed', [
        { field: 'girlId', message: 'Invalid girlId' },
      ]);
    }

    if (callSessionId && !mongoose.Types.ObjectId.isValid(callSessionId)) {
      throw new ValidationError('Validation failed', [
        { field: 'callSessionId', message: 'Invalid callSessionId' },
      ]);
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return {
        error: true,
        code: 'invalid_quantity',
        statusCode: 400,
        message: 'Invalid gift quantity',
      };
    }

    try {
      let result = null;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await persistGiftSend({
            userId,
            giftId,
            girlId,
            quantity,
            callSessionId,
            session,
          });
        });
      } finally {
        await session.endSession();
      }

      if (!result) throw new AppError('Gift sending failed', 500);

      try {
        getIO().to(`user:${userId}`).emit('new_message', {
          ...result.chatMessage,
          source: 'gift',
          girl: result.girl,
        });
      } catch (socketError) {
        logger.error({ err: socketError }, 'Gift socket emission failed');
      }

      AutoReplyEngine.processGiftReaction({
        userId,
        girlId,
        giftName: result.gift.name,
        callSessionId,
      }).catch((error) => {
        logger.error({ err: error }, 'Gift auto-reply scheduling failed');
      });

      return result;
    } catch (error) {
      if (error instanceof GiftFlowError) {
        return error.result;
      }
      if (isTransactionSupportError(error)) {
        if (!env.isProd) {
          logger.warn({ err: error }, 'Gift send falling back to non-transaction flow in non-production');
          const result = await persistGiftSend({
            userId,
            giftId,
            girlId,
            quantity,
            callSessionId,
            session: null,
          });

          try {
            getIO().to(`user:${userId}`).emit('new_message', {
              ...result.chatMessage,
              source: 'gift',
              girl: result.girl,
            });
          } catch (socketError) {
            logger.error({ err: socketError }, 'Gift socket emission failed');
          }

          AutoReplyEngine.processGiftReaction({
            userId,
            girlId,
            giftName: result.gift.name,
            callSessionId,
          }).catch((reactionError) => {
            logger.error({ err: reactionError }, 'Gift auto-reply scheduling failed');
          });

          return result;
        }

        logger.error({ err: error }, 'Gift sending requires Mongo replica set transactions');
        throw new AppError('Gift service temporarily unavailable', 500);
      }
      throw error;
    }
  },
};

export default giftService;

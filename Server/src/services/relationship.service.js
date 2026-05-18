import mongoose from 'mongoose';
import Relationship from '../models/Relationship.js';
import GirlProfile from '../models/Girl.js';
import ChatMessage from '../models/Message.js';
import ChatSession from '../models/Conversation.js';
import MonetizationController from '../engines/MonetizationController.js';
import { getIO } from '../config/socket.js';
import {
  RELATIONSHIP_TYPES,
  COIN_TX_TYPES,
  MESSAGE_TYPES,
  SENDER_TYPES,
  CHAT_SESSION_STATUS,
} from '../utils/constants.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

const ACTIVE_STATUSES = ['pending', 'accepted', 'active'];
const ACCEPTED_STATUSES = ['accepted', 'active'];

const TYPE_CONFIG = {
  [RELATIONSHIP_TYPES.CLOSE_FRIEND]: {
    type: RELATIONSHIP_TYPES.CLOSE_FRIEND,
    label: 'Close Friend',
    icon: '👫',
    cost: 500,
  },
  [RELATIONSHIP_TYPES.LOVER]: {
    type: RELATIONSHIP_TYPES.LOVER,
    label: 'Lover',
    icon: '❤️',
    cost: 1000,
  },
  [RELATIONSHIP_TYPES.SOULMATE]: {
    type: RELATIONSHIP_TYPES.SOULMATE,
    label: 'Soulmate',
    icon: '💫',
    cost: 2000,
  },
};

const ORDERED_TYPES = [
  RELATIONSHIP_TYPES.CLOSE_FRIEND,
  RELATIONSHIP_TYPES.LOVER,
  RELATIONSHIP_TYPES.SOULMATE,
];

const toId = (value) => String(value?._id || value || '');
const normalizeType = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'best_friend') return RELATIONSHIP_TYPES.CLOSE_FRIEND;
  if (raw === RELATIONSHIP_TYPES.CLOSE_FRIEND) return RELATIONSHIP_TYPES.CLOSE_FRIEND;
  if (raw === RELATIONSHIP_TYPES.LOVER) return RELATIONSHIP_TYPES.LOVER;
  if (raw === RELATIONSHIP_TYPES.SOULMATE) return RELATIONSHIP_TYPES.SOULMATE;
  return null;
};
const normalizeStatus = (value) => {
  if (value === 'active') return 'accepted';
  return value;
};

function getTypeCondition(type) {
  if (type === RELATIONSHIP_TYPES.CLOSE_FRIEND) {
    return { $in: [RELATIONSHIP_TYPES.CLOSE_FRIEND, 'best_friend'] };
  }
  return type;
}

function toPublicRelationship(doc, girl = null) {
  const type = normalizeType(doc.type) || doc.type;
  const status = normalizeStatus(doc.status);
  const config = TYPE_CONFIG[type] || { label: type, icon: '💞', cost: doc.coinsSpent || 0 };
  return {
    _id: toId(doc._id),
    userId: toId(doc.userId),
    girlProfileId: toId(doc.girlProfileId),
    type,
    typeLabel: config.label,
    typeIcon: config.icon,
    status,
    coinsSpent: doc.coinsSpent || config.cost,
    requestedAt: doc.requestedAt || doc.createdAt || null,
    acceptanceDueAt: doc.acceptanceDueAt || null,
    acceptedAt: doc.acceptedAt || null,
    endedAt: doc.endedAt || null,
    endedReason: doc.endedReason || null,
    acceptanceNotificationSentAt: doc.acceptanceNotificationSentAt || null,
    girl: girl ? {
      _id: toId(girl._id),
      name: girl.name || '',
      photo: girl.photos?.[0] || '',
    } : null,
  };
}

async function emitRelationshipEventMessage({
  userId,
  girl,
  relationship,
  eventType,
  text,
  quote = '',
}) {
  const sentAt = new Date();
  const message = await ChatMessage.create({
    userId,
    girlProfileId: relationship.girlProfileId,
    senderType: SENDER_TYPES.AUTO,
    content: {
      type: MESSAGE_TYPES.RELATIONSHIP_EVENT,
      text,
      relationshipEvent: {
        eventType,
        relationshipId: relationship._id,
        relationshipType: normalizeType(relationship.type),
        quote,
      },
    },
    sentAt,
  });

  await ChatSession.findOneAndUpdate(
    { userId, girlProfileId: relationship.girlProfileId },
    {
      $set: {
        status: CHAT_SESSION_STATUS.ACTIVE,
        isWaitingForUser: true,
        lastGirlMessageAt: sentAt,
      },
    },
    { upsert: true, new: true }
  );

  try {
    getIO().to(`user:${userId}`).emit('new_message', {
      ...message.toObject(),
      source: 'relationship_event',
      girl: {
        _id: toId(girl?._id || relationship.girlProfileId),
        name: girl?.name || '',
        avatar: girl?.photos?.[0] || null,
      },
    });
  } catch (err) {
    // socket delivery is best-effort
  }

  return message;
}

function buildSlot(type, current, targetGirlId, girlsById) {
  const config = TYPE_CONFIG[type];
  if (!current) {
    return {
      type,
      typeLabel: config.label,
      typeIcon: config.icon,
      cost: config.cost,
      state: 'empty',
      canRequest: true,
      relationship: null,
      occupiedBy: null,
    };
  }

  const status = normalizeStatus(current.status);
  const relationshipGirlId = toId(current.girlProfileId);
  const currentGirl = girlsById.get(relationshipGirlId) || null;
  const relationship = toPublicRelationship(current, currentGirl);
  const isMyConnectionsView = !targetGirlId;
  const isOnCurrentGirl = targetGirlId && relationshipGirlId === targetGirlId;

  if (isMyConnectionsView || isOnCurrentGirl) {
    return {
      type,
      typeLabel: config.label,
      typeIcon: config.icon,
      cost: config.cost,
      state: status === 'pending' ? 'pending' : 'accepted',
      canRequest: false,
      relationship,
      occupiedBy: null,
    };
  }

  return {
    type,
    typeLabel: config.label,
    typeIcon: config.icon,
    cost: config.cost,
    state: 'occupied',
    canRequest: false,
    relationship: null,
    occupiedBy: relationship,
  };
}

const relationshipService = {
  getTypeCatalog() {
    return ORDERED_TYPES.map((type) => TYPE_CONFIG[type]);
  },

  async getOptions(userId, girlId) {
    if (!mongoose.isValidObjectId(girlId)) {
      throw new ValidationError('Invalid girl id');
    }

    const girl = await GirlProfile.findOne({
      _id: girlId,
      isActive: true,
      relationshipFeatureEnabled: true,
    }).lean();
    if (!girl) {
      throw new NotFoundError('Girl not found');
    }

    const relationships = await Relationship.find({
      userId,
      status: { $in: ACTIVE_STATUSES },
    }).sort({ requestedAt: -1, createdAt: -1 }).lean();

    const girlsById = new Map([[toId(girl._id), girl]]);
    for (const rel of relationships) {
      const relGirlId = toId(rel.girlProfileId);
      if (!girlsById.has(relGirlId)) {
        girlsById.set(relGirlId, null);
      }
    }
    const missingIds = [...girlsById.entries()].filter(([, value]) => !value).map(([id]) => id);
    if (missingIds.length) {
      const docs = await GirlProfile.find({ _id: { $in: missingIds } }).select('name photos').lean();
      for (const entry of docs) girlsById.set(toId(entry._id), entry);
    }

    const activeByType = new Map();
    for (const rel of relationships) {
      const mappedType = normalizeType(rel.type);
      if (!mappedType) continue;
      if (!activeByType.has(mappedType)) activeByType.set(mappedType, rel);
    }

    const targetGirlId = toId(girlId);
    const slots = ORDERED_TYPES.map((type) => buildSlot(type, activeByType.get(type), targetGirlId, girlsById));

    return {
      girl: {
        _id: toId(girl._id),
        name: girl.name || '',
        photo: girl.photos?.[0] || '',
      },
      slots,
      relationshipTypes: this.getTypeCatalog(),
      serverNow: new Date().toISOString(),
    };
  },

  async getMyConnections(userId) {
    const relationships = await Relationship.find({
      userId,
      status: { $in: ACTIVE_STATUSES },
    }).sort({ requestedAt: -1, createdAt: -1 }).lean();

    const girlIds = [...new Set(relationships.map((rel) => toId(rel.girlProfileId)).filter(Boolean))];
    const girls = girlIds.length
      ? await GirlProfile.find({ _id: { $in: girlIds } }).select('name photos').lean()
      : [];
    const girlsById = new Map(girls.map((girl) => [toId(girl._id), girl]));

    const activeByType = new Map();
    for (const rel of relationships) {
      const mappedType = normalizeType(rel.type);
      if (!mappedType) continue;
      if (!activeByType.has(mappedType)) activeByType.set(mappedType, rel);
    }

    const slots = ORDERED_TYPES.map((type) => buildSlot(type, activeByType.get(type), null, girlsById));
    const pendingOverdue = relationships
      .filter((rel) => normalizeStatus(rel.status) === 'pending' && rel.acceptanceDueAt && new Date(rel.acceptanceDueAt) <= new Date())
      .map((rel) => toPublicRelationship(rel, girlsById.get(toId(rel.girlProfileId)) || null));

    return {
      slots,
      pendingOverdue,
      serverNow: new Date().toISOString(),
    };
  },

  async invite(userId, payload = {}) {
    const girlId = payload.girlId || payload.girlProfileId;
    const type = normalizeType(payload.type);
    if (!mongoose.isValidObjectId(girlId || '')) {
      throw new ValidationError('Invalid girlId');
    }
    if (!type) throw new ValidationError('Invalid relationship type');

    const girl = await GirlProfile.findOne({
      _id: girlId,
      isActive: true,
      relationshipFeatureEnabled: true,
    }).select('name photos').lean();
    if (!girl) throw new NotFoundError('Girl not found');

    const existingType = await Relationship.findOne({
      userId,
      type: getTypeCondition(type),
      status: { $in: ACTIVE_STATUSES },
    }).sort({ requestedAt: -1, createdAt: -1 });

    if (existingType) {
      const sameGirl = toId(existingType.girlProfileId) === toId(girlId);
      if (sameGirl && normalizeStatus(existingType.status) === 'pending') {
        return {
          ok: true,
          alreadyPending: true,
          relationship: toPublicRelationship(existingType, girl),
          coinBalance: null,
          wealthLevel: null,
        };
      }

      throw new ConflictError(`You already have a ${TYPE_CONFIG[type].label}`);
    }

    const currentWithGirl = await Relationship.findOne({
      userId,
      girlProfileId: girlId,
      status: { $in: ACTIVE_STATUSES },
    }).lean();
    if (currentWithGirl) {
      throw new ConflictError('This girl already has a relationship slot occupied in your world');
    }

    const requestedAt = new Date();
    const acceptanceDelayMs = (40 + Math.floor(Math.random() * 21)) * 1000;
    const acceptanceDueAt = new Date(requestedAt.getTime() + acceptanceDelayMs);

    let relationship;
    try {
      relationship = await Relationship.create({
        userId,
        girlProfileId: girlId,
        type,
        coinsSpent: TYPE_CONFIG[type].cost,
        status: 'pending',
        requestedAt,
        acceptanceDueAt,
      });
    } catch (err) {
      if (err?.code === 11000) {
        throw new ConflictError(`You already have a ${TYPE_CONFIG[type].label}`);
      }
      throw err;
    }

    try {
      const debit = await MonetizationController.deductCoins(
        userId,
        TYPE_CONFIG[type].cost,
        COIN_TX_TYPES.RELATIONSHIP_DEDUCT,
        `rel:invite:${relationship._id}`,
        `${TYPE_CONFIG[type].label} request to ${girl.name}`
      );

      if (debit?.error && debit?.paywallType === 'insufficient_coins') {
        await Relationship.deleteOne({ _id: relationship._id });
        return {
          ok: false,
          error: true,
          code: 'insufficient_coins',
          paywallType: debit.paywallType,
          coinBalance: debit.coinBalance ?? 0,
          requiredCoins: TYPE_CONFIG[type].cost,
          message: 'Insufficient coins',
        };
      }

      return {
        ok: true,
        relationship: toPublicRelationship(relationship, girl),
        coinBalance: debit.coinBalance,
        wealthLevel: debit.wealthLevel,
      };
    } catch (err) {
      await Relationship.deleteOne({ _id: relationship._id });
      throw err;
    }
  },

  async accept(userId, relationshipId) {
    if (!mongoose.isValidObjectId(relationshipId || '')) {
      throw new ValidationError('Invalid relationship id');
    }

    const relationship = await Relationship.findOne({ _id: relationshipId, userId });
    if (!relationship) throw new NotFoundError('Relationship not found');

    const status = normalizeStatus(relationship.status);
    if (status === 'ended') {
      throw new ValidationError('Relationship already ended');
    }
    if (status === 'accepted') {
      const girl = await GirlProfile.findById(relationship.girlProfileId).select('name photos').lean();
      return {
        ok: true,
        alreadyAccepted: true,
        relationship: toPublicRelationship(relationship, girl),
      };
    }

    const dueAt = relationship.acceptanceDueAt ? new Date(relationship.acceptanceDueAt).getTime() : 0;
    const nowMs = Date.now();
    if (dueAt && nowMs < dueAt) {
      return {
        ok: false,
        error: 'acceptance_not_due',
        waitMs: dueAt - nowMs,
      };
    }

    relationship.status = 'accepted';
    relationship.acceptedAt = new Date();
    relationship.acceptanceNotificationSentAt = new Date();
    await relationship.save();

    const girl = await GirlProfile.findById(relationship.girlProfileId).select('name photos').lean();
    const type = normalizeType(relationship.type);
    const config = TYPE_CONFIG[type];
    const quoteByType = {
      [RELATIONSHIP_TYPES.SOULMATE]: 'I feel like we were meant to find each other 💫✨',
      [RELATIONSHIP_TYPES.LOVER]: 'I love this feeling between us ❤️',
      [RELATIONSHIP_TYPES.CLOSE_FRIEND]: 'You are my favorite person to share things with 👫',
    };
    const chatMessage = await emitRelationshipEventMessage({
      userId,
      girl,
      relationship,
      eventType: 'accepted',
      text: `${config.icon} ${girl?.name || 'She'} accepted your ${config.label} request`,
      quote: quoteByType[type] || '',
    });

    return {
      ok: true,
      alreadyAccepted: false,
      relationship: toPublicRelationship(relationship, girl),
      chatMessage,
    };
  },

  async break(userId, relationshipId, payload = {}) {
    if (!mongoose.isValidObjectId(relationshipId || '')) {
      throw new ValidationError('Invalid relationship id');
    }

    const relationship = await Relationship.findOne({
      _id: relationshipId,
      userId,
      status: { $in: ACTIVE_STATUSES },
    });
    if (!relationship) throw new NotFoundError('Relationship not found');

    const status = normalizeStatus(relationship.status);
    const wasAccepted = ACCEPTED_STATUSES.includes(status);
    relationship.status = 'ended';
    relationship.endedAt = new Date();
    relationship.endedReason = payload.reason || 'manual_break';
    await relationship.save();

    const girl = await GirlProfile.findById(relationship.girlProfileId).select('name photos').lean();
    let chatMessage = null;
    if (wasAccepted) {
      const type = normalizeType(relationship.type);
      const config = TYPE_CONFIG[type];
      chatMessage = await emitRelationshipEventMessage({
        userId,
        girl,
        relationship,
        eventType: 'ended',
        text: `💔 Your ${config.label} bond with ${girl?.name || 'her'} has ended`,
      });
    }

    return {
      ok: true,
      relationship: toPublicRelationship(relationship, girl),
      insertedBreakMessage: !!chatMessage,
      chatMessage,
    };
  },
};

export default relationshipService;

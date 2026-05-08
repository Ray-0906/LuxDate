import CallSession from '../models/VideoCallLog.js';
import GirlProfile from '../models/Girl.js';
import User from '../models/User.js';
import CoinTransaction from '../models/CoinTransaction.js';
import { CALL_STATUS, TRIGGER_TYPES, CALL_TYPES, COIN_TX_TYPES } from '../utils/constants.js';

const videoCallService = {
  /**
   * GET /calls/trigger — returns a random girl or requested girl
   */
  async triggerCall(userId, girlId = null) {
    let girl;
    if (girlId) {
      girl = await GirlProfile.findById(girlId).select('name age photos charmLevel location videoUrl').lean();
    }
    if (!girl) {
      const [randomGirl] = await GirlProfile.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: 1 } },
        { $project: { name: 1, age: 1, photos: 1, charmLevel: 1, location: 1, videoUrl: 1 } },
      ]);
      girl = randomGirl;
    }
    if (!girl) return null;

    // Determine call type (free vs paid)
    const user = await User.findById(userId).select('freeCallsRemaining coinBalance').lean();
    const callType = user.freeCallsRemaining > 0 ? CALL_TYPES.FREE : CALL_TYPES.PAID;

    return {
      girl,
      videoUrl: girl.videoUrl || null,
      callType,
      freeCallsRemaining: user.freeCallsRemaining,
      coinBalance: user.coinBalance,
    };
  },

  /**
   * POST /calls/:id/end — end a call session
   */
  async endCall(userId, callId, { status }) {
    if (!Object.values(CALL_STATUS).includes(status)) {
      throw new Error('Invalid call status');
    }

    let session = await CallSession.findById(callId);
    if (!session) {
      // Create session inline if trigger didn't persist one
      return { status };
    }

    session.status = status;
    session.endedAt = new Date();
    await session.save();

    return session;
  },

  /**
   * Initiate a call session record (called by trigger)
   */
  async createCallSession(userId, girlId, triggerType, callType) {
    const session = await CallSession.create({
      userId,
      girlProfileId: girlId,
      triggerType,
      callType,
      status: CALL_STATUS.MISSED, // default to missed, updated on accept/decline
      startedAt: new Date(),
    });
    return session;
  },

  /**
   * Accept a call — deduct coins if paid, create session if doesn't exist
   */
  async acceptCall(userId, callIdOrGirlId, isDirectGirlId = false) {
    let session;
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (isDirectGirlId) {
      // Create session on the fly
      const callType = user.freeCallsRemaining > 0 ? CALL_TYPES.FREE : CALL_TYPES.PAID;
      session = await CallSession.create({
        userId,
        girlProfileId: callIdOrGirlId,
        triggerType: 'profile_visit',
        callType,
        status: CALL_STATUS.ACCEPTED,
        startedAt: new Date(),
      });
    } else {
      session = await CallSession.findById(callIdOrGirlId);
      if (!session) throw new Error('Call session not found');
    }

    if (session.callType === CALL_TYPES.FREE) {
      if (user.freeCallsRemaining <= 0) {
        return { error: true, paywallType: 'coins_only', coinBalance: user.coinBalance };
      }
      user.freeCallsRemaining -= 1;
      await user.save();
    } else {
      // Paid call — check coin balance
      const costPerMinute = 10; // from app_settings
      if (user.coinBalance < costPerMinute) {
        return { error: true, paywallType: 'coins_only', coinBalance: user.coinBalance };
      }
      user.coinBalance -= costPerMinute;
      user.totalCoinsEverSpent += costPerMinute;
      await user.save();

      // Record transaction
      await CoinTransaction.create({
        userId: user._id,
        type: COIN_TX_TYPES.CALL_DEDUCT,
        amount: -costPerMinute,
        balanceAfter: user.coinBalance,
        referenceId: session._id.toString(),
        note: `Call with ${session.girlProfileId}`,
      });

      session.coinsSpent = costPerMinute;
    }

    if (!isDirectGirlId) {
      session.status = CALL_STATUS.ACCEPTED;
      await session.save();
    }

    return { session, coinBalance: user.coinBalance };
  },

  /**
   * GET /calls/history
   */
  async getCallHistory(userId, query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [calls, total] = await Promise.all([
      CallSession.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('girlProfileId', 'name photos')
        .lean(),
      CallSession.countDocuments({ userId }),
    ]);

    return { calls, total, page, limit };
  },
};

export default videoCallService;

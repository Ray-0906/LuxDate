import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Initialize all Socket.IO event handlers and auth.
 */
const initSocketHandlers = (io) => {
  // ─── Socket Authentication ────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.jwt.accessSecret);

      if (decoded.type === 'user') {
        const user = await User.findById(decoded.userId).select('name isBlocked');
        if (!user || user.isBlocked) {
          return next(new Error('User not found or blocked'));
        }
        socket.userId = user._id.toString();
        socket.userName = user.name || 'User';
        socket.userType = 'user';
      } else if (decoded.type === 'admin') {
        socket.adminId = decoded.adminId;
        socket.userType = 'admin';
      }

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────
  io.on('connection', (socket) => {
    logger.info(
      { socketId: socket.id, userId: socket.userId, type: socket.userType },
      'Socket connected'
    );

    // Join personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    if (socket.adminId) {
      socket.join('admins');
    }

    // ─── Chat Events ──────────────────────────────────────

    /**
     * Typing indicator.
     * Payload: { girlId, isTyping }
     */
    socket.on('chat:typing', (data) => {
      if (!data.girlId) return;

      if (socket.userType === 'admin') {
        // Forward typing indicator to user
        io.to(`user:${data.targetUserId}`).emit('chat:typing', {
          girlId: data.girlId,
          isTyping: data.isTyping,
        });
      }
    });

    /**
     * New message notification (server → client).
     * Emitted by AutoReplyEngine after generating a reply.
     */
    // No client handler needed — server pushes via io.to(`user:${userId}`)

    // ─── Call Events (Signaling) ──────────────────────────

    socket.on('call:accept', (data) => {
      if (!data.callId) return;
      logger.info({ userId: socket.userId, callId: data.callId }, 'Call accepted via socket');
    });

    socket.on('call:decline', (data) => {
      if (!data.callId) return;
      logger.info({ userId: socket.userId, callId: data.callId }, 'Call declined via socket');
    });

    socket.on('call:end', (data) => {
      if (!data.callId) return;
      logger.info({ userId: socket.userId, callId: data.callId }, 'Call ended via socket');
    });

    // ─── Disconnect ───────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(
        { socketId: socket.id, userId: socket.userId },
        'Socket disconnected'
      );
    });
  });

  logger.info('Socket.IO handlers initialized');
};

export default initSocketHandlers;

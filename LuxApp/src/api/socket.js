import { io } from 'socket.io-client';
import mmkvStorage from '../utils/storage.js';

const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:5000'
  : 'https://api.luxdate.app';

let socket = null;

const socketService = {
  connect() {
    if (socket?.connected) return socket;

    const tokensStr = mmkvStorage.getItem('user_tokens');
    let token = null;
    try {
      token = JSON.parse(tokensStr)?.accessToken;
    } catch { /* ignore */ }

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('[Socket] Error:', err.message);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  joinConversation(conversationId) {
    if (socket?.connected) {
      socket.emit('join_conversation', { conversationId });
    }
  },

  leaveConversation(conversationId) {
    if (socket?.connected) {
      socket.emit('leave_conversation', { conversationId });
    }
  },

  onNewMessage(callback) {
    if (socket) {
      socket.on('new_message', callback);
    }
  },

  offNewMessage(callback) {
    if (socket) {
      socket.off('new_message', callback);
    }
  },

  onGiftReceived(callback) {
    if (socket) {
      socket.on('gift_received', callback);
    }
  },

  emitTyping(conversationId) {
    if (socket?.connected) {
      socket.emit('chat:typing', { girlId: conversationId, isTyping: true });
    }
  },

  onTyping(callback) {
    if (socket) {
      socket.on('typing', callback);
      socket.on('chat:typing', callback);
    }
  },

  offTyping(callback) {
    if (socket) {
      socket.off('typing', callback);
      socket.off('chat:typing', callback);
    }
  },
};

export default socketService;

/**
 * Application-wide constants — aligned to product spec.
 */

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUB_ADMIN: 'sub_admin',
};

export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_GIRLS: 'manage_girls',
  MANAGE_CHAT: 'manage_chat',
  MANAGE_COINS: 'manage_coins',
  MANAGE_GIFTS: 'manage_gifts',
  MANAGE_VIP: 'manage_vip',
  MANAGE_PAYMENTS: 'manage_payments',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_ADMINS: 'manage_admins',
};

// Chat message content types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  PHOTO: 'photo',
  CALL_LOG: 'call_log',
  GIFT: 'gift',
};

// Who sent the message
export const SENDER_TYPES = {
  USER: 'user',
  AUTO: 'auto',
  ADMIN: 'admin',
};

// Coin transaction types
export const COIN_TX_TYPES = {
  PURCHASE: 'purchase',
  REWARD: 'reward',
  CALL_DEDUCT: 'call_deduct',
  GIFT_DEDUCT: 'gift_deduct',
  RELATIONSHIP_DEDUCT: 'relationship_deduct',
  ADMIN_ADJUST: 'admin_adjust',
  CHECKIN: 'checkin',
  REFUND: 'refund',
};

// Call session status
export const CALL_STATUS = {
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  MISSED: 'missed',
};

// What triggered the call
export const TRIGGER_TYPES = {
  PROFILE_VISIT: 'profile_visit',
  IDLE: 'idle',
  EVENT: 'event',
  BACKGROUND: 'background',
};

// Free vs paid call
export const CALL_TYPES = {
  FREE: 'free',
  PAID: 'paid',
};

// Payment status
export const PAYMENT_STATUS = {
  CREATED: 'created',
  SUCCESS: 'success',
  FAILED: 'failed',
};

// Payment gateways
export const PAYMENT_GATEWAYS = {
  RAZORPAY: 'razorpay',
  MOCK: 'mock',
};

// VIP plan types
export const VIP_TYPES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ELITE_MONTHLY: 'elite_monthly',
};

// Auto-reply categories
export const REPLY_CATEGORIES = {
  GREETING: 'greeting',
  FLIRTY: 'flirty',
  CURIOUS: 'curious',
  GENERIC: 'generic',
  GIFT_REACTION: 'gift_reaction',
};

// Chat session status
export const CHAT_SESSION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
};

// Relationship types
export const RELATIONSHIP_TYPES = {
  SOULMATE: 'soulmate',
  BEST_FRIEND: 'best_friend',
  LOVER: 'lover',
};

// Upload limits
export const UPLOAD_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,
  VIDEO_MAX_SIZE: 100 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
};

// Defaults
export const DEFAULTS = {
  FREE_CALLS: 3,
  HOT_FEED_SIZE: 18,
  NEARBY_FEED_SIZE: 25,
  PAGE_SIZE: 20,
};

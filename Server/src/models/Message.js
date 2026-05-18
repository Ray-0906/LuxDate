import mongoose from 'mongoose';
import { MESSAGE_TYPES, SENDER_TYPES } from '../utils/constants.js';

const chatMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    girlProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GirlProfile', required: true },
    senderType: {
      type: String,
      enum: Object.values(SENDER_TYPES),
      required: true,
    },
    content: {
      type: {
        type: String,
        enum: Object.values(MESSAGE_TYPES),
        default: MESSAGE_TYPES.TEXT,
      },
      text: { type: String, default: '' },
      mediaUrl: { type: String, default: null },
      giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift', default: null },
      giftName: { type: String, default: '' },
      giftIconUrl: { type: String, default: '' },
      giftAnimationUrl: { type: String, default: '' },
      emojiFallback: { type: String, default: '' },
      quantity: { type: Number, default: 1, min: 1 },
      totalCoinsSpent: { type: Number, default: 0, min: 0 },
      sentDuringCallSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallSession', default: null },
      relationshipGiftHeadline: { type: String, default: '' },
      relationshipGiftType: { type: String, default: '' },
      callLog: {
        status: { type: String, default: null },
        durationSeconds: { type: Number, default: 0 },
      },
      relationshipEvent: {
        eventType: { type: String, default: '' },
        relationshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Relationship', default: null },
        relationshipType: { type: String, default: '' },
        quote: { type: String, default: '' },
      },
    },
    isRead: { type: Boolean, default: false },
    clientDeliveryId: { type: String, default: null },
    sentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

chatMessageSchema.index({ userId: 1, girlProfileId: 1, sentAt: -1 });
chatMessageSchema.index({ userId: 1, sentAt: -1 });
chatMessageSchema.index({ userId: 1, clientDeliveryId: 1 }, { unique: true, sparse: true });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;

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
      callLog: {
        status: { type: String, default: null },
        durationSeconds: { type: Number, default: 0 },
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

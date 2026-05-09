import mongoose from 'mongoose';
import { CHAT_SESSION_STATUS } from '../utils/constants.js';

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    girlProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GirlProfile', required: true },
    isWaitingForUser: { type: Boolean, default: true },
    lastUserMessageAt: { type: Date, default: null },
    lastGirlMessageAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(CHAT_SESSION_STATUS),
      default: CHAT_SESSION_STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

chatSessionSchema.index({ userId: 1, girlProfileId: 1 }, { unique: true });
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;

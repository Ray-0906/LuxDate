import mongoose from 'mongoose';
import { CALL_STATUS, TRIGGER_TYPES, CALL_TYPES } from '../utils/constants.js';

const callSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    girlProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GirlProfile', required: true },
    triggerType: {
      type: String,
      enum: Object.values(TRIGGER_TYPES),
      required: true,
    },
    callType: {
      type: String,
      enum: Object.values(CALL_TYPES),
      required: true,
    },
    coinsSpent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(CALL_STATUS),
      required: true,
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
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

callSessionSchema.index({ userId: 1, createdAt: -1 });
callSessionSchema.index({ girlProfileId: 1 });

const CallSession = mongoose.model('CallSession', callSessionSchema);
export default CallSession;

import mongoose from 'mongoose';
import { RELATIONSHIP_TYPES } from '../utils/constants.js';

const relationshipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    girlProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GirlProfile', required: true },
    type: {
      type: String,
      enum: Object.values(RELATIONSHIP_TYPES),
      required: true,
    },
    coinsSpent: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'ended', 'active'],
      default: 'pending',
    },
    requestedAt: { type: Date, default: Date.now },
    acceptanceDueAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    endedReason: {
      type: String,
      enum: ['manual_break', 'switch', 'admin', 'unknown'],
      default: null,
    },
    acceptanceNotificationSentAt: { type: Date, default: null },
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

relationshipSchema.index(
  { userId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'accepted', 'active'] } },
  }
);
relationshipSchema.index({ userId: 1, girlProfileId: 1, type: 1 });
relationshipSchema.index({ userId: 1, status: 1, requestedAt: -1 });
relationshipSchema.index({ status: 1, acceptanceDueAt: 1 });

const Relationship = mongoose.model('Relationship', relationshipSchema);
export default Relationship;

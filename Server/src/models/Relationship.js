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
      enum: ['active', 'ended'],
      default: 'active',
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

relationshipSchema.index({ userId: 1, girlProfileId: 1 }, { unique: true });
relationshipSchema.index({ userId: 1, status: 1 });

const Relationship = mongoose.model('Relationship', relationshipSchema);
export default Relationship;

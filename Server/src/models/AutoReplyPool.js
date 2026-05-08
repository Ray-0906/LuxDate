import mongoose from 'mongoose';
import { REPLY_CATEGORIES } from '../utils/constants.js';

const autoReplyPoolSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: Object.values(REPLY_CATEGORIES),
      required: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'bn'],
      default: 'en',
    },
    messages: [{ type: String }],
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

autoReplyPoolSchema.index({ category: 1, language: 1 });

const AutoReplyPool = mongoose.model('AutoReplyPool', autoReplyPoolSchema);
export default AutoReplyPool;

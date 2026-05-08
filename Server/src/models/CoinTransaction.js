import mongoose from 'mongoose';
import { COIN_TX_TYPES } from '../utils/constants.js';

const coinTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: Object.values(COIN_TX_TYPES),
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: String, default: '' },
    note: { type: String, default: '' },
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

coinTransactionSchema.index({ userId: 1, createdAt: -1 });
coinTransactionSchema.index({ type: 1, createdAt: -1 });

const CoinTransaction = mongoose.model('CoinTransaction', coinTransactionSchema);
export default CoinTransaction;

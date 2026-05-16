import mongoose from 'mongoose';

const CONTEXT_ENUM = ['call', 'gift', 'wallet'];

const coinPackSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    priceInr: { type: Number, required: true, min: 1 },
    coins: { type: Number, required: true, min: 1 },
    bonusCoins: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    contexts: {
      type: [String],
      enum: CONTEXT_ENUM,
      default() {
        return ['call', 'gift', 'wallet'];
      },
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

coinPackSchema.index({ isActive: 1, sortOrder: 1 });

const CoinPack = mongoose.model('CoinPack', coinPackSchema);
export default CoinPack;

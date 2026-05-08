import mongoose from 'mongoose';

const giftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    iconUrl: { type: String, default: '' },
    coinCost: { type: Number, required: true, min: 1 },
    level: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
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

giftSchema.index({ isActive: 1 });

const Gift = mongoose.model('Gift', giftSchema);
export default Gift;

import mongoose from 'mongoose';

const giftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    iconUrl: { type: String, default: '' },
    animationUrl: { type: String, default: '' },
    emojiFallback: { type: String, default: '' },
    coinCost: { type: Number, required: true, min: 1 },
    level: { type: Number, default: 1, min: 1 },
    sortOrder: { type: Number, default: 0 },
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
giftSchema.index({ coinCost: 1, sortOrder: 1, createdAt: 1 });

const Gift = mongoose.model('Gift', giftSchema);
export default Gift;

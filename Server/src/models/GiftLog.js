import mongoose from 'mongoose';

const giftTransactionSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toGirlProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GirlProfile', required: true },
    giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift', required: true },
    giftName: { type: String, required: true, trim: true },
    giftIconUrl: { type: String, default: '' },
    giftAnimationUrl: { type: String, default: '' },
    emojiFallback: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 1 },
    coinCostEach: { type: Number, required: true, min: 1 },
    totalCoinsSpent: { type: Number, required: true },
    callSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallSession', default: null },
    sentAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

giftTransactionSchema.index({ fromUserId: 1, sentAt: -1 });
giftTransactionSchema.index({ toGirlProfileId: 1, sentAt: -1 });

const GiftTransaction = mongoose.model('GiftTransaction', giftTransactionSchema);
export default GiftTransaction;

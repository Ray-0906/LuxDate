import mongoose from 'mongoose';

const giftTransactionSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toGirlProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GirlProfile', required: true },
    giftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gift', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    totalCoinsSpent: { type: Number, required: true },
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

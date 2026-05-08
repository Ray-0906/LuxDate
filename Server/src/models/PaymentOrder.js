import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_GATEWAYS } from '../utils/constants.js';

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gateway: {
      type: String,
      enum: Object.values(PAYMENT_GATEWAYS),
      required: true,
    },
    gatewayOrderId: { type: String, default: '' },
    gatewayPaymentId: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    purpose: {
      type: String,
      enum: ['coins', 'vip'],
      required: true,
    },
    purposeMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
    },
    webhookVerified: { type: Boolean, default: false },
    idempotencyKey: { type: String, default: '' },
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

paymentTransactionSchema.index({ userId: 1, createdAt: -1 });
paymentTransactionSchema.index({ gatewayOrderId: 1 });
paymentTransactionSchema.index({ idempotencyKey: 1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
export default PaymentTransaction;

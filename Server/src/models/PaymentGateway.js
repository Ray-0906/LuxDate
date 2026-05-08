import mongoose from 'mongoose';
import { PAYMENT_GATEWAYS } from '../utils/constants.js';

const paymentGatewaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: Object.values(PAYMENT_GATEWAYS),
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        delete ret.config;
        return ret;
      },
    },
  }
);

const PaymentGateway = mongoose.model('PaymentGateway', paymentGatewaySchema);

export default PaymentGateway;

import RazorpayGateway from './razorpay.gateway.js';
import PaymentTransaction from '../../models/PaymentOrder.js';
import PaymentGatewayModel from '../../models/PaymentGateway.js';
import coinService from '../coin.service.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { PAYMENT_GATEWAYS, PAYMENT_STATUS, COIN_TX_TYPES } from '../../utils/constants.js';
import logger from '../../utils/logger.js';

const gatewayInstances = {
  [PAYMENT_GATEWAYS.RAZORPAY]: new RazorpayGateway(),
};

const paymentService = {
  async getActiveGateway() {
    const gw = await PaymentGatewayModel.findOne({ isDefault: true, isEnabled: true });
    if (!gw) {
      const anyGw = await PaymentGatewayModel.findOne({ isEnabled: true });
      if (!anyGw) throw new ValidationError('No payment gateway is enabled');
      return anyGw;
    }
    return gw;
  },

  getGatewayInstance(name) {
    const instance = gatewayInstances[name];
    if (!instance) throw new ValidationError(`Unknown payment gateway: ${name}`);
    return instance;
  },

  async createOrder(userId, { amount, purpose, purposeMeta = {}, gatewayName }) {
    let gateway;
    if (gatewayName) {
      const gw = await PaymentGatewayModel.findOne({ name: gatewayName, isEnabled: true });
      if (!gw) throw new ValidationError(`Gateway ${gatewayName} is not available`);
      gateway = gw;
    } else {
      gateway = await this.getActiveGateway();
    }

    const instance = this.getGatewayInstance(gateway.name);
    const gatewayOrder = await instance.createOrder(amount, 'INR', {
      userId,
      purpose,
      receipt: `${purpose}_${userId}_${Date.now()}`,
    });

    const txn = await PaymentTransaction.create({
      userId,
      gateway: gateway.name,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      amount,
      currency: 'INR',
      purpose,
      purposeMeta,
    });

    return {
      transaction: txn,
      gatewayData: {
        orderId: gatewayOrder.gatewayOrderId,
        clientSecret: gatewayOrder.clientSecret,
        gateway: gateway.name,
      },
    };
  },

  async verifyPayment(transactionId, paymentData) {
    const txn = await PaymentTransaction.findById(transactionId);
    if (!txn) throw new NotFoundError('Payment transaction not found');

    if (txn.status !== PAYMENT_STATUS.CREATED) {
      throw new ValidationError(`Transaction already ${txn.status}`);
    }

    const instance = this.getGatewayInstance(txn.gateway);
    const result = await instance.verifyPayment(paymentData);

    if (result.valid) {
      txn.status = PAYMENT_STATUS.SUCCESS;
      txn.gatewayPaymentId = result.gatewayPaymentId;
      txn.webhookVerified = true;
      await txn.save();

      await this.fulfillOrder(txn);
      logger.info({ txnId: txn._id }, 'Payment verified');
    } else {
      txn.status = PAYMENT_STATUS.FAILED;
      await txn.save();
      logger.warn({ txnId: txn._id }, 'Payment verification failed');
    }

    return { transaction: txn, verified: result.valid };
  },

  async fulfillOrder(txn) {
    if (txn.purpose === 'coins' && txn.purposeMeta?.coinsToCredit) {
      await coinService.credit(
        txn.userId,
        txn.purposeMeta.coinsToCredit,
        COIN_TX_TYPES.PURCHASE,
        { referenceId: txn._id.toString(), note: `Purchased ${txn.purposeMeta.coinsToCredit} coins` }
      );
    }

    if (txn.purpose === 'vip' && txn.purposeMeta?.planId) {
      const { default: vipService } = await import('../vip.service.js');
      await vipService.purchase(txn.userId, txn.purposeMeta.planId, txn._id);
    }
  },

  async getUserOrders(userId, query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      PaymentTransaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PaymentTransaction.countDocuments({ userId }),
    ]);

    return { orders, total, page, limit };
  },

  async getAvailableGateways() {
    return PaymentGatewayModel.find({ isEnabled: true }).select('name displayName isDefault').lean();
  },
};

export default paymentService;

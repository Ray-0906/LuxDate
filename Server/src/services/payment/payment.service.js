import mongoose from 'mongoose';
import crypto from 'crypto';
import RazorpayGateway from './razorpay.gateway.js';
import MockGateway from './mock.gateway.js';
import PaymentTransaction from '../../models/PaymentOrder.js';
import PaymentGatewayModel from '../../models/PaymentGateway.js';
import coinService from '../coin.service.js';
import coinPackService from '../coinPack.service.js';
import vipService from '../vip.service.js';
import User from '../../models/User.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import {
  PAYMENT_GATEWAYS,
  PAYMENT_STATUS,
  COIN_TX_TYPES,
} from '../../utils/constants.js';
import logger from '../../utils/logger.js';
import VipPlan from '../../models/VipPlan.js';
import env from '../../config/env.js';

const gatewayInstances = {
  [PAYMENT_GATEWAYS.RAZORPAY]: new RazorpayGateway(),
  [PAYMENT_GATEWAYS.MOCK]: new MockGateway(),
};

/** Razorpay order `receipt` max length is 40 (API validation). */
function buildGatewayReceipt(purpose, userId) {
  const p = String(purpose || 'pay').slice(0, 8);
  const tail = String(userId).replace(/[^a-f0-9]/gi, '').slice(-8) || 'x';
  const ts = Date.now().toString(36);
  const r = `${p}_${ts}_${tail}`;
  return r.length <= 40 ? r : r.slice(0, 40);
}

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

  async seedDefaultGateway() {
    let razorpay = await PaymentGatewayModel.findOne({ name: PAYMENT_GATEWAYS.RAZORPAY });
    if (!razorpay) {
      razorpay = await PaymentGatewayModel.create({
        name: PAYMENT_GATEWAYS.RAZORPAY,
        displayName: 'Razorpay',
        isEnabled: true,
        isDefault: !env.paymentMockEnabled,
        config: {},
      });
    }

    let mockGw = await PaymentGatewayModel.findOne({ name: PAYMENT_GATEWAYS.MOCK });
    if (!mockGw) {
      mockGw = await PaymentGatewayModel.create({
        name: PAYMENT_GATEWAYS.MOCK,
        displayName: 'Mock (dev/test)',
        isEnabled: env.paymentMockEnabled,
        isDefault: !!env.paymentMockEnabled,
        config: {},
      });
    }

    if (env.paymentMockEnabled) {
      await PaymentGatewayModel.updateMany({}, { $set: { isDefault: false } });
      await PaymentGatewayModel.findOneAndUpdate(
        { name: PAYMENT_GATEWAYS.RAZORPAY },
        { $set: { isDefault: false } }
      );
      await PaymentGatewayModel.findOneAndUpdate(
        { name: PAYMENT_GATEWAYS.MOCK },
        { $set: { isEnabled: true, isDefault: true } }
      );
      logger.info({ gateway: 'mock' }, 'Payment gateway defaults: mock is active');
    } else {
      await PaymentGatewayModel.updateMany({}, { $set: { isDefault: false } });
      await PaymentGatewayModel.findOneAndUpdate(
        { name: PAYMENT_GATEWAYS.MOCK },
        { $set: { isEnabled: false, isDefault: false } }
      );
      await PaymentGatewayModel.findOneAndUpdate(
        { name: PAYMENT_GATEWAYS.RAZORPAY },
        { $set: { isEnabled: true, isDefault: true } }
      );
      logger.info({ gateway: 'razorpay' }, 'Payment gateway defaults: Razorpay is active');
    }

    return env.paymentMockEnabled
      ? PaymentGatewayModel.findOne({ name: PAYMENT_GATEWAYS.MOCK })
      : PaymentGatewayModel.findOne({ name: PAYMENT_GATEWAYS.RAZORPAY });
  },

  /**
   * Resolve which gateway to use for a new order.
   * @param {string|undefined} requestedName - optional client choice: `mock` | `razorpay`
   */
  async resolveCheckoutGateway(requestedName) {
    if (requestedName == null || String(requestedName).trim() === '') {
      const g = await this.getActiveGateway();
      return g.name;
    }
    const n = String(requestedName).toLowerCase().trim();
    if (![PAYMENT_GATEWAYS.MOCK, PAYMENT_GATEWAYS.RAZORPAY].includes(n)) {
      throw new ValidationError('Invalid payment gateway');
    }
    if (n === PAYMENT_GATEWAYS.MOCK && !env.paymentMockEnabled) {
      throw new ValidationError('Mock payments are disabled on this server');
    }
    const gw = await PaymentGatewayModel.findOne({ name: n, isEnabled: true });
    if (!gw) throw new ValidationError(`Gateway "${n}" is not available`);
    return n;
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
      receipt: buildGatewayReceipt(purpose, userId),
    });

    const idempotencyKey = `${userId}_${gatewayOrder.gatewayOrderId}`;

    const isMock = gateway.name === PAYMENT_GATEWAYS.MOCK;
    const mockCompletionNonce = isMock ? crypto.randomBytes(16).toString('hex') : undefined;
    const mockNonceExpiresAt = isMock ? new Date(Date.now() + 10 * 60 * 1000) : undefined;

    const txn = await PaymentTransaction.create({
      userId,
      gateway: gateway.name,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      amount,
      currency: 'INR',
      purpose,
      purposeMeta,
      idempotencyKey,
      ...(isMock ? { mockCompletionNonce, mockNonceExpiresAt } : {}),
    });

    const gatewayData = {
      orderId: gatewayOrder.gatewayOrderId,
      amountPaise: Math.round(amount * 100),
      amountInr: amount,
      currency: 'INR',
      keyId: isMock ? 'mock_rzp_key_unused' : env.razorpay.keyId || '',
      clientSecret: gatewayOrder.clientSecret,
      gateway: gateway.name,
      transactionId: txn._id.toString(),
    };
    if (isMock) {
      gatewayData.mockCompletionNonce = mockCompletionNonce;
      gatewayData.isMock = true;
    }

    return {
      transaction: txn,
      gatewayData,
    };
  },

  async createCoinPurchaseOrder(userId, body = {}) {
    const { packId, gateway: gatewayFromClient } = body;
    if (!mongoose.isValidObjectId(packId)) {
      throw new ValidationError('Invalid pack id');
    }
    const pack = await coinPackService.resolvePackForPurchase(packId);
    if (!pack) {
      throw new NotFoundError('Coin pack not found');
    }
    const gatewayName = await this.resolveCheckoutGateway(gatewayFromClient);
    return this.createOrder(userId, {
      amount: pack.priceInr,
      purpose: 'coins',
      purposeMeta: {
        packId: pack.packId,
        coinsToCredit: pack.coinsToCredit,
      },
      gatewayName,
    });
  },

  async createVipPurchaseOrder(userId, body = {}) {
    const { planId, gateway: gatewayFromClient } = body;
    if (!mongoose.isValidObjectId(planId)) {
      throw new ValidationError('Invalid plan id');
    }
    const plan = await VipPlan.findOne({ _id: planId, isActive: true });
    if (!plan) throw new NotFoundError('VIP plan not found');
    const gatewayName = await this.resolveCheckoutGateway(gatewayFromClient);
    return this.createOrder(userId, {
      amount: plan.price,
      purpose: 'vip',
      purposeMeta: { planId: plan._id.toString(), planName: plan.name },
      gatewayName,
    });
  },

  async findTransactionForUser(identifier, userId) {
    const or = [];
    if (mongoose.isValidObjectId(identifier)) {
      or.push({ _id: identifier });
    }
    or.push({ gatewayOrderId: String(identifier) });

    const txn = await PaymentTransaction.findOne({
      userId,
      $or: or,
    });
    return txn;
  },

  async getOrder(userId, identifier) {
    const txn = await this.findTransactionForUser(identifier, userId);
    if (!txn) throw new NotFoundError('Order not found');

    const canRetryVerify = txn.status === PAYMENT_STATUS.CREATED;
    return {
      order: txn.toObject ? txn.toObject() : txn,
      canRetryVerify,
    };
  },

  async getUserOrders(userId, query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (query.status) {
      filter.status = query.status;
    }
    if (query.status === PAYMENT_STATUS.CREATED && query.minAgeMinutes != null) {
      const minAge = Math.max(0, parseInt(query.minAgeMinutes, 10) || 2);
      filter.createdAt = { $lte: new Date(Date.now() - minAge * 60 * 1000) };
    }

    const [orders, total] = await Promise.all([
      PaymentTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PaymentTransaction.countDocuments(filter),
    ]);

    return { orders, total, page, limit };
  },

  /**
   * Atomic flip CREATED -> SUCCESS then fulfill once.
   */
  async fulfillIfCreated(txnId, paymentId, { webhookVerified = false } = {}) {
    const updated = await PaymentTransaction.findOneAndUpdate(
      {
        _id: txnId,
        status: PAYMENT_STATUS.CREATED,
      },
      {
        $set: {
          status: PAYMENT_STATUS.SUCCESS,
          gatewayPaymentId: paymentId,
          webhookVerified,
        },
      },
      { new: true }
    );

    if (!updated) {
      const existing = await PaymentTransaction.findById(txnId);
      if (existing?.status === PAYMENT_STATUS.SUCCESS) {
        const user = await User.findById(existing.userId).select('coinBalance isVip vipExpiresAt vipFrameType vipBadgeType').lean();
        return {
          alreadyFulfilled: true,
          transaction: existing,
          newBalance: user?.coinBalance,
          vip: user ? {
            isVip: user.isVip,
            vipExpiresAt: user.vipExpiresAt,
            vipFrameType: user.vipFrameType,
            vipBadgeType: user.vipBadgeType,
          } : null,
        };
      }
      throw new ValidationError('Transaction cannot be fulfilled');
    }

    if (updated.purpose === 'coins' && updated.purposeMeta?.coinsToCredit) {
      const { coinBalance } = await coinService.credit(
        updated.userId,
        updated.purposeMeta.coinsToCredit,
        COIN_TX_TYPES.PURCHASE,
        {
          referenceId: updated._id.toString(),
          note: `Purchased ${updated.purposeMeta.coinsToCredit} coins`,
        }
      );
      return {
        alreadyFulfilled: false,
        transaction: updated,
        newBalance: coinBalance,
        vip: null,
      };
    }

    if (updated.purpose === 'vip' && updated.purposeMeta?.planId) {
      await vipService.activateFromPayment(
        updated.userId,
        updated.purposeMeta.planId,
        updated._id
      );
      const user = await User.findById(updated.userId)
        .select('coinBalance isVip vipExpiresAt vipFrameType vipBadgeType')
        .lean();
      return {
        alreadyFulfilled: false,
        transaction: updated,
        newBalance: user?.coinBalance,
        vip: {
          isVip: user?.isVip,
          vipExpiresAt: user?.vipExpiresAt,
          vipFrameType: user?.vipFrameType,
          vipBadgeType: user?.vipBadgeType,
        },
      };
    }

    logger.error({ txnId }, 'Fulfillment missing purposeMeta');
    throw new ValidationError('Invalid order purpose');
  },

  async verifyPayment(userId, orderIdentifier, paymentData) {
    const txn = await this.findTransactionForUser(orderIdentifier, userId);
    if (!txn) throw new NotFoundError('Payment transaction not found');

    if (txn.status === PAYMENT_STATUS.SUCCESS) {
      const user = await User.findById(userId).select('coinBalance isVip vipExpiresAt vipFrameType vipBadgeType').lean();
      return {
        verified: true,
        alreadyFulfilled: true,
        transaction: txn,
        newBalance: user?.coinBalance,
        vip: user ? {
          isVip: user.isVip,
          vipExpiresAt: user.vipExpiresAt,
          vipFrameType: user.vipFrameType,
          vipBadgeType: user.vipBadgeType,
        } : null,
      };
    }

    if (txn.gateway === PAYMENT_GATEWAYS.MOCK) {
      const nonceIn = paymentData?.mockCompletionNonce;
      if (!nonceIn || nonceIn !== txn.mockCompletionNonce) {
        logger.warn({ txnId: txn._id, purpose: txn.purpose }, 'Mock payment verify: invalid or missing nonce');
        return { verified: false, transaction: txn, newBalance: null, vip: null };
      }
      if (!txn.mockNonceExpiresAt || Date.now() > new Date(txn.mockNonceExpiresAt).getTime()) {
        logger.warn({ txnId: txn._id }, 'Mock payment verify: nonce expired');
        return { verified: false, transaction: txn, newBalance: null, vip: null };
      }

      const paymentId = `mock_pay_${txn.gatewayOrderId}`;
      const out = await this.fulfillIfCreated(txn._id, paymentId, {
        webhookVerified: false,
      });
      await PaymentTransaction.updateOne(
        { _id: txn._id },
        { $set: { mockCompletionNonce: null, mockNonceExpiresAt: null } }
      );
      logger.info({ gateway: 'mock', purpose: txn.purpose, txnId: String(txn._id) }, 'Mock payment verified');
      return { verified: true, ...out };
    }

    const instance = this.getGatewayInstance(txn.gateway);
    const result = await instance.verifyPayment(paymentData);

    if (!result.valid) {
      txn.status = PAYMENT_STATUS.FAILED;
      await txn.save();
      return { verified: false, transaction: txn, newBalance: null, vip: null };
    }

    const out = await this.fulfillIfCreated(txn._id, result.gatewayPaymentId, {
      webhookVerified: false,
    });
    return { verified: true, ...out };
  },

  /** Poll Razorpay for captured payment when client never called verify */
  async reconcileOrder(userId, orderIdentifier) {
    const txn = await this.findTransactionForUser(orderIdentifier, userId);
    if (!txn) throw new NotFoundError('Payment transaction not found');
    if (txn.status === PAYMENT_STATUS.SUCCESS) {
      const user = await User.findById(userId).select('coinBalance isVip vipExpiresAt vipFrameType vipBadgeType').lean();
      return {
        reconciled: true,
        alreadyFulfilled: true,
        newBalance: user?.coinBalance,
        vip: user,
      };
    }

    if (txn.gateway === PAYMENT_GATEWAYS.MOCK) {
      return { reconciled: false, reason: 'mock_requires_client_verify' };
    }

    const instance = this.getGatewayInstance(txn.gateway);
    const status = await instance.getPaymentStatus(txn.gatewayOrderId);
    if (status.status !== 'captured' || !status.paymentId) {
      return { reconciled: false, reason: 'no_captured_payment', status };
    }

    const confirm = await instance.confirmCapturedPayment(txn.gatewayOrderId, status.paymentId);
    if (!confirm.valid) {
      return { reconciled: false, reason: 'confirm_failed' };
    }

    const out = await this.fulfillIfCreated(txn._id, confirm.gatewayPaymentId, {
      webhookVerified: false,
    });
    return { reconciled: true, ...out };
  },

  async fulfillOrder(txn) {
    if (txn.status !== PAYMENT_STATUS.SUCCESS) return;
    logger.warn({ id: txn._id }, 'fulfillOrder deprecated path called');
  },

  async processWebhookPaymentCaptured(entity) {
    if (!entity || entity.status !== 'captured') return { handled: false };
    const orderId = entity.order_id;
    const paymentId = entity.id;
    const txn = await PaymentTransaction.findOne({
      gatewayOrderId: orderId,
      status: PAYMENT_STATUS.CREATED,
    });
    if (!txn) {
      return { handled: false, reason: 'no_pending_txn' };
    }
    if (txn.gateway === PAYMENT_GATEWAYS.MOCK) {
      return { handled: false, reason: 'mock_no_webhook_fulfill' };
    }
    const instance = this.getGatewayInstance(txn.gateway);
    const confirm = await instance.confirmCapturedPayment(orderId, paymentId);
    if (!confirm.valid) return { handled: false, reason: 'confirm_failed' };
    return this.fulfillIfCreated(txn._id, paymentId, { webhookVerified: true });
  },

  async getAvailableGateways() {
    return PaymentGatewayModel.find({ isEnabled: true }).select('name displayName isDefault').lean();
  },
};

export default paymentService;

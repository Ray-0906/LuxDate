import crypto from 'crypto';
import PaymentGatewayStrategy from './PaymentGatewayStrategy.js';

export const MOCK_ORDER_PREFIX = 'mock_ord_';

function assertMockOrderId(gatewayOrderId) {
  if (typeof gatewayOrderId !== 'string' || !gatewayOrderId.startsWith(MOCK_ORDER_PREFIX)) {
    throw new Error('MockGateway received non-mock orderId');
  }
}

/**
 * Dev/test gateway: no Razorpay HTTP. Order ids use {@link MOCK_ORDER_PREFIX}.
 */
class MockGateway extends PaymentGatewayStrategy {
  constructor() {
    super('mock');
  }

  async createOrder(amount, currency = 'INR', metadata = {}) {
    const gatewayOrderId = `${MOCK_ORDER_PREFIX}${crypto.randomBytes(12).toString('hex')}`;
    return {
      gatewayOrderId,
      amount,
      currency,
      status: 'created',
      gateway: this.name,
      raw: { mock: true, receipt: metadata.receipt },
    };
  }

  /**
   * Mock orders validate nonce/expiry in payment.service (needs DB txn). Do not call alone.
   */
  async verifyPayment() {
    return { valid: false, gatewayPaymentId: '', gatewayOrderId: '' };
  }

  async getPaymentStatus(orderId) {
    assertMockOrderId(orderId);
    return {
      status: 'captured',
      paymentId: `mock_pay_${orderId}`,
      raw: { mock: true },
    };
  }

  async confirmCapturedPayment(orderId, paymentId) {
    assertMockOrderId(orderId);
    const expected = `mock_pay_${orderId}`;
    const ok = paymentId === expected;
    return {
      valid: ok,
      gatewayPaymentId: paymentId,
      gatewayOrderId: orderId,
    };
  }
}

export default MockGateway;

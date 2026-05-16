import axios from 'axios';
import crypto from 'crypto';
import PaymentGatewayStrategy from './PaymentGatewayStrategy.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Razorpay payment gateway implementation.
 */
class RazorpayGateway extends PaymentGatewayStrategy {
  constructor() {
    super('razorpay');
    this.keyId = env.razorpay.keyId;
    this.keySecret = env.razorpay.keySecret;
    this.baseUrl = 'https://api.razorpay.com/v1';
  }

  get auth() {
    return {
      username: this.keyId,
      password: this.keySecret,
    };
  }

  async createOrder(amount, currency = 'INR', metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          amount: Math.round(amount * 100), // Razorpay uses paise
          currency,
          receipt: String(metadata.receipt || `rcpt_${Date.now()}`).slice(0, 40),
          notes: metadata.notes || {},
        },
        { auth: this.auth }
      );

      return {
        gatewayOrderId: response.data.id,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        status: response.data.status,
        gateway: this.name,
        raw: response.data,
      };
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'Razorpay createOrder failed');
      throw new Error('Payment order creation failed');
    }
  }

  async verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    return {
      valid: isValid,
      gatewayPaymentId: razorpay_payment_id,
      gatewayOrderId: razorpay_order_id,
    };
  }

  async getPaymentStatus(orderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}/payments`,
        { auth: this.auth }
      );

      const payments = response.data.items || [];
      const captured = payments.find((p) => p.status === 'captured') || payments[0];

      return {
        status: captured?.status || 'unknown',
        paymentId: captured?.id,
        raw: captured,
      };
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'Razorpay getPaymentStatus failed');
      throw new Error('Failed to fetch payment status');
    }
  }

  /**
   * Server-side confirmation: payment exists, is captured, and belongs to order.
   */
  async confirmCapturedPayment(orderId, paymentId) {
    if (!paymentId) return { valid: false };
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        { auth: this.auth }
      );
      const p = response.data;
      const ok = p.status === 'captured' && p.order_id === orderId;
      return {
        valid: ok,
        gatewayPaymentId: paymentId,
        gatewayOrderId: orderId,
      };
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'Razorpay confirmCapturedPayment failed');
      return { valid: false };
    }
  }
}

export default RazorpayGateway;

import axios from 'axios';
import crypto from 'crypto';
import PaymentGatewayStrategy from './PaymentGatewayStrategy.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Cashfree payment gateway implementation.
 */
class CashfreeGateway extends PaymentGatewayStrategy {
  constructor() {
    super('cashfree');
    this.appId = env.cashfree.appId;
    this.secretKey = env.cashfree.secretKey;
    this.baseUrl = env.isProd
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  get headers() {
    return {
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
    };
  }

  async createOrder(amount, currency = 'INR', metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/orders`,
        {
          order_amount: amount,
          order_currency: currency,
          order_id: metadata.receipt || `cf_${Date.now()}`,
          customer_details: {
            customer_id: metadata.userId || 'guest',
            customer_phone: metadata.phone || '9999999999',
          },
          order_meta: {
            return_url: metadata.returnUrl || '',
          },
        },
        { headers: this.headers }
      );

      return {
        gatewayOrderId: response.data.order_id,
        amount: response.data.order_amount,
        currency: response.data.order_currency,
        status: response.data.order_status,
        sessionId: response.data.payment_session_id,
        gateway: this.name,
        raw: response.data,
      };
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'Cashfree createOrder failed');
      throw new Error('Payment order creation failed');
    }
  }

  async verifyPayment(paymentData) {
    const { orderId } = paymentData;

    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}/payments`,
        { headers: this.headers }
      );

      const payments = response.data || [];
      const successPayment = payments.find((p) => p.payment_status === 'SUCCESS');

      return {
        valid: !!successPayment,
        gatewayPaymentId: successPayment?.cf_payment_id || '',
        gatewayOrderId: orderId,
      };
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'Cashfree verifyPayment failed');
      return { valid: false, gatewayPaymentId: '', gatewayOrderId: orderId };
    }
  }

  async getPaymentStatus(orderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${orderId}`,
        { headers: this.headers }
      );

      return {
        status: response.data.order_status,
        paymentId: response.data.cf_order_id,
        raw: response.data,
      };
    } catch (error) {
      logger.error({ err: error.response?.data || error.message }, 'Cashfree getPaymentStatus failed');
      throw new Error('Failed to fetch payment status');
    }
  }
}

export default CashfreeGateway;

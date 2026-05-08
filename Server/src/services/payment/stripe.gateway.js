import PaymentGatewayStrategy from './PaymentGatewayStrategy.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Stripe payment gateway implementation.
 * Uses Stripe Node SDK-style API calls via axios for consistency.
 */
class StripeGateway extends PaymentGatewayStrategy {
  constructor() {
    super('stripe');
    this.secretKey = env.stripe.secretKey;
    this.webhookSecret = env.stripe.webhookSecret;
  }

  async createOrder(amount, currency = 'INR', metadata = {}) {
    try {
      // Dynamic import to avoid loading stripe SDK if not used
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(this.secretKey);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses smallest currency unit
        currency: currency.toLowerCase(),
        metadata: {
          userId: metadata.userId || '',
          purpose: metadata.purpose || '',
        },
      });

      return {
        gatewayOrderId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        gateway: this.name,
        raw: paymentIntent,
      };
    } catch (error) {
      logger.error({ err: error.message }, 'Stripe createOrder failed');
      throw new Error('Payment order creation failed');
    }
  }

  async verifyPayment(paymentData) {
    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(this.secretKey);

      const { paymentIntentId } = paymentData;
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        valid: intent.status === 'succeeded',
        gatewayPaymentId: intent.id,
        gatewayOrderId: intent.id,
      };
    } catch (error) {
      logger.error({ err: error.message }, 'Stripe verifyPayment failed');
      return { valid: false, gatewayPaymentId: '', gatewayOrderId: '' };
    }
  }

  async getPaymentStatus(orderId) {
    try {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(this.secretKey);

      const intent = await stripe.paymentIntents.retrieve(orderId);

      return {
        status: intent.status,
        paymentId: intent.id,
        raw: intent,
      };
    } catch (error) {
      logger.error({ err: error.message }, 'Stripe getPaymentStatus failed');
      throw new Error('Failed to fetch payment status');
    }
  }
}

export default StripeGateway;

/**
 * Payment Gateway Strategy Pattern
 * Each gateway implements the same interface:
 *   - createOrder(amount, currency, metadata)
 *   - verifyPayment(paymentData)
 *   - getPaymentStatus(orderId)
 *
 * Swap gateways without touching any business logic.
 */

class PaymentGatewayStrategy {
  constructor(name) {
    this.name = name;
  }

  async createOrder(/* amount, currency, metadata */) {
    throw new Error(`createOrder not implemented for ${this.name}`);
  }

  async verifyPayment(/* paymentData */) {
    throw new Error(`verifyPayment not implemented for ${this.name}`);
  }

  async getPaymentStatus(/* orderId */) {
    throw new Error(`getPaymentStatus not implemented for ${this.name}`);
  }
}

export default PaymentGatewayStrategy;

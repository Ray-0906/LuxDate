import crypto from 'crypto';
import env from '../config/env.js';
import paymentService from '../services/payment/payment.service.js';
import logger from '../utils/logger.js';

const webhookController = {
  async razorpay(req, res, next) {
    try {
      if (!env.razorpay.webhookSecret) {
        logger.warn('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
        return res.status(503).json({ success: false, message: 'Webhook not configured' });
      }

      const sig = req.get('X-Razorpay-Signature');
      const bodyBuf = req.body;
      const body = Buffer.isBuffer(bodyBuf) ? bodyBuf : Buffer.from(JSON.stringify(bodyBuf || {}));

      const expected = crypto
        .createHmac('sha256', env.razorpay.webhookSecret)
        .update(body)
        .digest('hex');

      if (sig !== expected) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }

      const event = JSON.parse(body.toString());

      if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
        await paymentService.processWebhookPaymentCaptured(event.payload.payment.entity);
      }

      return res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
};

export default webhookController;

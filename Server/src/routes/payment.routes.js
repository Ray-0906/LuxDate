import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  paymentCoinOrderLimiter,
  paymentVipOrderLimiter,
  paymentVerifyLimiter,
} from '../middleware/rateLimiter.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/gateways', paymentController.getGateways);
router.post('/coins/order', paymentCoinOrderLimiter, paymentController.createCoinOrder);
router.post('/vip/order', paymentVipOrderLimiter, paymentController.createVipOrder);
router.post('/orders/:orderId/verify', paymentVerifyLimiter, paymentController.verifyPayment);
router.post('/orders/:orderId/reconcile', paymentVerifyLimiter, paymentController.reconcilePayment);
router.get('/orders', paymentController.getMyOrders);
router.get('/orders/:orderId', paymentController.getOrder);

export default router;

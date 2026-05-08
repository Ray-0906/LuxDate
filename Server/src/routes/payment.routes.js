import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/gateways', paymentController.getGateways);
router.post('/coins/order', paymentController.createCoinOrder);
router.post('/vip/order', paymentController.createVipOrder);
router.post('/:orderId/verify', paymentController.verifyPayment);
router.get('/orders', paymentController.getMyOrders);
router.get('/orders/:orderId', paymentController.getOrder);

export default router;

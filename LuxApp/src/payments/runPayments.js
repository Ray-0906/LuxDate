import RazorpayCheckout from 'react-native-razorpay';
import { paymentsApi } from '../api/services.js';

export const GW_MOCK = 'mock';
export const GW_RAZORPAY = 'razorpay';

/** POST /payments/orders/:id/verify returns 200 even when verification fails; treat as error. */
function assertPaymentVerified(verifyRes) {
  const envelope = verifyRes?.data;
  const data = envelope?.data ?? envelope;
  if (data?.verified === true) {
    return data;
  }
  const msg = envelope?.message || data?.message || 'Payment verification failed';
  const err = new Error(msg);
  err.response = { data: envelope };
  throw err;
}

/** Enabled gateway names from API (e.g. `mock`, `razorpay`). */
export async function fetchPaymentGatewayNames() {
  const res = await paymentsApi.gateways();
  const gateways = res.data?.data?.gateways ?? res.data?.gateways ?? [];
  return [...new Set(gateways.map((g) => g.name).filter(Boolean))];
}

async function createCoinOrderSafe({ packId, gateway }) {
  try {
    return await paymentsApi.createCoinOrder({ packId, gateway });
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      'Could not create payment order';
    const err = new Error(msg);
    err.response = e.response;
    err.code = e.code;
    throw err;
  }
}

async function createVipOrderSafe({ planId, gateway }) {
  try {
    return await paymentsApi.createVipOrder({ planId, gateway });
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      'Could not create payment order';
    const err = new Error(msg);
    err.response = e.response;
    err.code = e.code;
    throw err;
  }
}

/**
 * @param {object} opts
 * @param {({ amountInr: number, purposeLabel: string }) => Promise<void>} [opts.confirmMockUi]
 *        Required when the created order uses the mock gateway — use a React Modal, not Alert.
 */
async function verifyAfterOrder(gatewayData, paymentDataOrNull, { confirmMockUi } = {}) {
  if (gatewayData.gateway === GW_MOCK) {
    if (!gatewayData.mockCompletionNonce) {
      throw new Error('Invalid mock order response');
    }
    if (typeof confirmMockUi !== 'function') {
      throw new Error('confirmMockUi is required for mock checkout');
    }
    await confirmMockUi({
      amountInr: gatewayData.amountInr,
      purposeLabel: gatewayData.purposeLabel || 'Purchase',
    });
    const verifyRes = await paymentsApi.verify(gatewayData.transactionId, {
      mockCompletionNonce: gatewayData.mockCompletionNonce,
    });
    return assertPaymentVerified(verifyRes);
  }

  const paymentData = paymentDataOrNull;
  const verifyRes = await paymentsApi.verify(gatewayData.transactionId, {
    razorpay_order_id: paymentData.razorpay_order_id,
    razorpay_payment_id: paymentData.razorpay_payment_id,
    razorpay_signature: paymentData.razorpay_signature,
  });
  return assertPaymentVerified(verifyRes);
}

/**
 * @param {string} packId
 * @param {{ phone?: string, gateway: string, confirmMockUi?: function }} opts
 */
export async function checkoutAndVerifyCoinPack(packId, { phone = '', gateway, confirmMockUi } = {}) {
  // #region agent log
  fetch('http://127.0.0.1:7800/ingest/b0692f4a-68ed-4309-8de8-e990dc865839', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a0d528' },
    body: JSON.stringify({
      sessionId: 'a0d528',
      hypothesisId: 'H1',
      location: 'runPayments.js:checkoutAndVerifyCoinPack',
      message: 'coin checkout start',
      data: { packId: String(packId), gateway },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!gateway || typeof gateway !== 'string') {
    throw new Error('gateway is required — pick a payment method in the UI first');
  }
  const orderRes = await createCoinOrderSafe({ packId, gateway });
  const payload = orderRes.data?.data || orderRes.data;
  const gatewayData = { ...payload.gatewayData, purposeLabel: 'LuxDate coins' };
  if (!gatewayData?.orderId || !gatewayData?.keyId) {
    throw new Error('Invalid order response');
  }

  if (gatewayData.gateway === GW_MOCK) {
    return verifyAfterOrder(gatewayData, null, { confirmMockUi });
  }

  const options = {
    description: 'LuxDate coins',
    image: '',
    currency: 'INR',
    key: gatewayData.keyId,
    amount: gatewayData.amountPaise,
    name: 'LuxDate',
    order_id: gatewayData.orderId,
    prefill: { contact: phone || '', email: '' },
    theme: { color: '#1a1a2e' },
  };

  const paymentData = await RazorpayCheckout.open(options);
  return verifyAfterOrder(gatewayData, paymentData);
}

export async function checkoutAndVerifyVip(planId, { phone = '', gateway, confirmMockUi } = {}) {
  // #region agent log
  fetch('http://127.0.0.1:7800/ingest/b0692f4a-68ed-4309-8de8-e990dc865839', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a0d528' },
    body: JSON.stringify({
      sessionId: 'a0d528',
      hypothesisId: 'H1',
      location: 'runPayments.js:checkoutAndVerifyVip',
      message: 'vip checkout start',
      data: { planId: String(planId), gateway },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!gateway || typeof gateway !== 'string') {
    throw new Error('gateway is required — pick a payment method in the UI first');
  }
  const orderRes = await createVipOrderSafe({ planId, gateway });
  const payload = orderRes.data?.data || orderRes.data;
  const gatewayData = { ...payload.gatewayData, purposeLabel: 'LuxDate VIP' };
  if (!gatewayData?.orderId || !gatewayData?.keyId) {
    throw new Error('Invalid order response');
  }

  if (gatewayData.gateway === GW_MOCK) {
    return verifyAfterOrder(gatewayData, null, { confirmMockUi });
  }

  const options = {
    description: 'LuxDate VIP',
    image: '',
    currency: 'INR',
    key: gatewayData.keyId,
    amount: gatewayData.amountPaise,
    name: 'LuxDate VIP',
    order_id: gatewayData.orderId,
    prefill: { contact: phone || '', email: '' },
    theme: { color: '#FFD700' },
  };

  const paymentData = await RazorpayCheckout.open(options);
  return verifyAfterOrder(gatewayData, paymentData);
}

export function isUserCancelledRazorpay(err) {
  const code = err?.code || err?.error?.code;
  return (
    code === 'USER_CANCELLED' ||
    code === 0 ||
    code === 'MOCK_USER_CANCELLED' ||
    code === 'GATEWAY_PICK_CANCELLED'
  );
}

import api from './client.js';

export const authApi = {
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  onboard: (data) => api.post('/auth/onboarding', data),
};

export const appApi = {
  settings: () => api.get('/app/settings'),
};

export const profilesApi = {
  hot: (params) => api.get('/feed/hot', { params }),
  nearby: (params) => api.get('/feed/nearby', { params }),
  random: () => api.get('/feed/random'),
  getById: (girlId) => api.get(`/feed/${girlId}`),
  search: (id) => api.get('/feed/search', { params: { id } }),
};

export const callsApi = {
  trigger: (girlId) => api.get('/calls/trigger', { params: { girlId } }),
  accept: (callId, config) => api.post(`/calls/${callId}/accept`, {}, config || {}),
  end: (callId, data) => api.post(`/calls/${callId}/end`, data),
  history: (params) => api.get('/calls/history', { params }),  
  clearHistory: () => api.delete('/calls/history'),
};

export const chatApi = {
  inbox: (params) => api.get('/chat/inbox', { params }),
  messages: (girlId, params) => api.get(`/chat/${girlId}/messages`, { params }),
  send: (girlId, data) => api.post(`/chat/${girlId}/send`, data),
  clearAll: () => api.delete('/chat/clear-all'),
  clearCalls: () => api.delete('/chat/calls/clear'),
  clearConversation: (girlId) => api.delete(`/chat/conversation/${girlId}`),
};

export const mediaApi = {
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const coinsApi = {
  balance: () => api.get('/coins/balance'),
  economy: () => api.get('/coins/economy'),
  transactions: (params) => api.get('/coins/transactions', { params }),
  packs: (params) => api.get('/coins/packs', { params }),
  checkinStatus: () => api.get('/coins/checkin/status'),
  checkinClaim: (payload = {}) => api.post('/coins/checkin', payload),
};

export const vipApi = {
  plans: () => api.get('/vip/plans'),
  status: () => api.get('/vip/status'),
  purchase: (planId, paymentTransactionId) => api.post('/vip/purchase', { planId, paymentTransactionId }),
};

export const paymentsApi = {
  gateways: () => api.get('/payments/gateways'),
  createCoinOrder: (data) => api.post('/payments/coins/order', data),
  createVipOrder: (data) => api.post('/payments/vip/order', data),
  verify: (transactionId, body) => api.post(`/payments/orders/${transactionId}/verify`, body),
  reconcile: (transactionId) => api.post(`/payments/orders/${transactionId}/reconcile`),
  orders: (params) => api.get('/payments/orders', { params }),
  getOrder: (orderId) => api.get(`/payments/orders/${orderId}`),
};

export const giftsApi = {
  catalog: () => api.get('/gifts/catalog'),
  send: (data) => api.post('/gifts/send', data),
};

export const relationshipsApi = {
  options: (girlId) => api.get(`/relationships/options/${girlId}`),
  my: () => api.get('/relationships/my'),
  invite: (data) => api.post('/relationships/invite', data),
  accept: (relationshipId) => api.post(`/relationships/${relationshipId}/accept`),
  break: (relationshipId, data = {}) => api.post(`/relationships/${relationshipId}/break`, data),
};

export const userApi = {
  me: () => api.get('/users/me'),
  update: (data) => api.put('/users/me', data),
  uploadPhoto: (formData) => api.post('/users/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  wealthLevels: () => api.get('/users/wealth-levels'),
};

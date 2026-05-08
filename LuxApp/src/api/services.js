import api from './client.js';

export const authApi = {
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  onboard: (data) => api.post('/auth/onboarding', data),
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
  accept: (callId) => api.post(`/calls/${callId}/accept`),
  end: (callId, data) => api.post(`/calls/${callId}/end`, data),
  history: (params) => api.get('/calls/history', { params }),
};

export const chatApi = {
  inbox: (params) => api.get('/chat/inbox', { params }),
  messages: (girlId, params) => api.get(`/chat/${girlId}/messages`, { params }),
  send: (girlId, message) => api.post(`/chat/${girlId}/send`, { message }),
  clearAll: () => api.delete('/chat/clear-all'),
  clearCalls: () => api.delete('/chat/calls/clear'),
};

export const coinsApi = {
  balance: () => api.get('/coins/balance'),
  transactions: (params) => api.get('/coins/transactions', { params }),
  packs: () => api.get('/coins/packs'),
};

export const checkinApi = {
  claim: () => api.post('/checkin/claim'),
};

export const vipApi = {
  plans: () => api.get('/vip/plans'),
  purchase: (planId) => api.post('/vip/purchase', { planId }),
};

export const paymentsApi = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verify: (data) => api.post('/payments/verify', data),
  history: (params) => api.get('/payments/history', { params }),
};

export const giftsApi = {
  catalog: () => api.get('/gifts/catalog'),
  send: (data) => api.post('/gifts/send', data),
};

export const relationshipsApi = {
  options: (girlId) => api.get(`/relationships/options/${girlId}`),
  invite: (data) => api.post('/relationships/invite', data),
};

export const userApi = {
  me: () => api.get('/user/me'),
  update: (data) => api.put('/user/me', data),
  uploadPhoto: (formData) => api.post('/user/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  wealthLevels: () => api.get('/user/wealth-levels'),
};

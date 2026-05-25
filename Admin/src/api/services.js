import api from './client.js';

export const authApi = {
  login: (email, password) => api.post('/admin/auth/login', { email, password }),
  getMe: () => api.get('/admin/auth/me'),
  logout: () => api.post('/admin/auth/logout'),
  refreshToken: (refreshToken) => api.post('/admin/auth/refresh-token', { refreshToken }),
};

export const usersApi = {
  list: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  toggleBlock: (id) => api.patch(`/admin/users/${id}/block`),
  addCoins: (id, amount, description) => api.post(`/admin/users/${id}/coins/add`, { amount, description }),
  deductCoins: (id, amount, description) => api.post(`/admin/users/${id}/coins/deduct`, { amount, description }),
  getTransactions: (id, params) => api.get(`/admin/users/${id}/transactions`, { params }),
};

export const girlsApi = {
  list: (params) => api.get('/admin/girls', { params }),
  getById: (id) => api.get(`/admin/girls/${id}`),
  create: (formData) => api.post('/admin/girls', formData),
  update: (id, data) => api.put(`/admin/girls/${id}`, data),
  updatePhoto: (id, formData) => api.patch(`/admin/girls/${id}/photo`, formData),
  addPhotos: (id, formData) => api.post(`/admin/girls/${id}/photos`, formData),
  delete: (id) => api.delete(`/admin/girls/${id}`),
  uploadVideo: (id, formData) => api.post(`/admin/girls/${id}/videos`, formData),
  listVideos: (id, params) => api.get(`/admin/girls/${id}/videos`, { params }),
  deleteVideo: (id) => api.delete(`/admin/girls/videos/${id}`),
};

export const chatApi = {
  getInbox: (params) => api.get('/admin/chat/inbox', { params }),
  getMessages: (conversationId, params) => api.get(`/admin/chat/${conversationId}/messages`, { params }),
  reply: (conversationId, content) => api.post(`/admin/chat/${conversationId}/reply`, { content }),
  sendAuto: (conversationId, content) => api.post(`/admin/chat/${conversationId}/auto`, { content }),
};

export const giftsApi = {
  list: () => api.get('/admin/gifts'),
  create: (data) => api.post('/admin/gifts', data),
  update: (id, data) => api.put(`/admin/gifts/${id}`, data),
  delete: (id) => api.delete(`/admin/gifts/${id}`),
  getStats: (params) => api.get('/admin/gifts/stats', { params }),
};

export const vipApi = {
  listPlans: () => api.get('/admin/vip/plans'),
  createPlan: (data) => api.post('/admin/vip/plans', data),
  updatePlan: (id, data) => api.put(`/admin/vip/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/admin/vip/plans/${id}`),
  listSubscriptions: (params) => api.get('/admin/vip/subscriptions', { params }),
};

export const coinPacksApi = {
  list: () => api.get('/admin/coin-packs'),
  create: (data) => api.post('/admin/coin-packs', data),
  update: (id, data) => api.put(`/admin/coin-packs/${id}`, data),
  delete: (id) => api.delete(`/admin/coin-packs/${id}`),
};

export const paymentsAdminApi = {
  transactions: (params) => api.get('/admin/payments/transactions', { params }),
};

export const settingsApi = {
  getAll: (group) => api.get('/admin/settings', { params: { group } }),
  set: (key, value, group, description) => api.post('/admin/settings', { key, value, group, description }),
  saveAppSettings: (data) => api.post('/admin/settings/app', data),
  saveBranding: (data) => api.post('/admin/settings/branding', data),
  uploadBrandingLogo: (formData) => api.post('/admin/settings/branding/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (key) => api.delete(`/admin/settings/${key}`),
  seedDefaults: () => api.post('/admin/settings/seed'),
  getCallLogs: (params) => api.get('/admin/settings/call-logs', { params }),
};

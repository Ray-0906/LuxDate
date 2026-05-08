import axios from 'axios';
import mmkvStorage from '../utils/storage.js';

const API_BASE = __DEV__
  ? 'http://10.0.2.2:5000/api'   // Android emulator → localhost
  : 'https://api.luxdate.app/api'; // Production

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  const tokensStr = mmkvStorage.getItem('user_tokens');
  if (tokensStr) {
    try {
      const tokens = JSON.parse(tokensStr);
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    } catch { /* ignore */ }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const tokensStr = mmkvStorage.getItem('user_tokens');
        if (tokensStr) {
          const tokens = JSON.parse(tokensStr);
          const res = await axios.post(`${API_BASE}/auth/refresh-token`, {
            refreshToken: tokens.refreshToken,
          });
          const newTokens = res.data.data.tokens;
          mmkvStorage.setItem('user_tokens', JSON.stringify(newTokens));
          original.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(original);
        }
      } catch {
        mmkvStorage.removeItem('user_tokens');
        mmkvStorage.removeItem('user_profile');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

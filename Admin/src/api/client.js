import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('admin_tokens') || 'null');
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
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
        const tokens = JSON.parse(localStorage.getItem('admin_tokens') || 'null');
        if (tokens?.refreshToken) {
          const res = await axios.post(`${API_BASE}/admin/auth/refresh-token`, {
            refreshToken: tokens.refreshToken,
          });
          const newTokens = res.data.data.tokens;
          localStorage.setItem('admin_tokens', JSON.stringify(newTokens));
          original.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('admin_tokens');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

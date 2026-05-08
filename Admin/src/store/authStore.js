import { create } from 'zustand';
import { authApi } from '../api/services.js';

const useAuthStore = create((set, get) => ({
  admin: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  tokens: JSON.parse(localStorage.getItem('admin_tokens') || 'null'),
  isAuthenticated: !!localStorage.getItem('admin_tokens'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      const { admin, tokens } = res.data.data;
      localStorage.setItem('admin_user', JSON.stringify(admin));
      localStorage.setItem('admin_tokens', JSON.stringify(tokens));
      set({ admin, tokens, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_tokens');
    set({ admin: null, tokens: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const tokens = get().tokens;
    if (!tokens) return;
    try {
      const res = await authApi.getMe();
      set({ admin: res.data.data.admin, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },
}));

export default useAuthStore;

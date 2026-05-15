import { create } from 'zustand';
import mmkvStorage from '../utils/storage.js';
import { authApi, userApi } from '../api/services.js';
import socketService from '../api/socket.js';
import useChatBadgeStore from './chatBadgeStore.js';
import useGiftStore from './giftStore.js';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(mmkvStorage.getItem('user_profile') || 'null'),
  tokens: JSON.parse(mmkvStorage.getItem('user_tokens') || 'null'),
  isAuthenticated: !!mmkvStorage.getItem('user_tokens'),
  isOnboarded: false,
  isLoading: false,
  error: null,

  setTokens: (tokens) => {
    mmkvStorage.setItem('user_tokens', JSON.stringify(tokens));
    set({ tokens, isAuthenticated: true });
    socketService.connect();
    useChatBadgeStore.getState().refreshUnreadCount();
  },

  setUser: (user) => {
    mmkvStorage.setItem('user_profile', JSON.stringify(user));
    set({ user, isOnboarded: !!user?.name });
  },

  sendOtp: async (phone) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.sendOtp(phone);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to send OTP', isLoading: false });
      return false;
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.verifyOtp(phone, otp);
      const { user, tokens } = res.data.data;
      get().setTokens(tokens);
      get().setUser(user);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Invalid OTP', isLoading: false });
      return false;
    }
  },

  onboard: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.onboard(data);
      get().setUser(res.data.data.user || res.data.data);
      set({ isLoading: false, isOnboarded: true });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Onboarding failed', isLoading: false });
      return false;
    }
  },

  loadProfile: async () => {
    try {
      const res = await userApi.me();
      get().setUser({ ...res.data.data }); // Force new obj ref
    } catch (e) { console.warn('Load profile error:', e); }
  },

  logout: () => {
    mmkvStorage.removeItem('user_tokens');
    mmkvStorage.removeItem('user_profile');
    socketService.disconnect();
    useChatBadgeStore.getState().reset();
    useGiftStore.getState().reset();
    set({ user: null, tokens: null, isAuthenticated: false, isOnboarded: false });
  },
}));

export default useAuthStore;

import { create } from 'zustand';
import { chatApi } from '../api/services.js';

const useChatBadgeStore = create((set, get) => ({
  unreadCount: 0,
  isRefreshing: false,

  setUnreadCount: (unreadCount) => {
    set({ unreadCount: Math.max(0, unreadCount || 0) });
  },

  reset: () => {
    set({ unreadCount: 0, isRefreshing: false });
  },

  refreshUnreadCount: async () => {
    if (get().isRefreshing) return get().unreadCount;

    set({ isRefreshing: true });

    try {
      const res = await chatApi.inbox();
      const conversations = res.data?.data || [];
      const unreadCount = conversations.reduce(
        (sum, item) => sum + (item.unreadCount || 0),
        0
      );

      set({ unreadCount, isRefreshing: false });
      return unreadCount;
    } catch (error) {
      console.warn('Unread badge refresh error:', error.message);
      set({ isRefreshing: false });
      return get().unreadCount;
    }
  },
}));

export default useChatBadgeStore;

import { create } from 'zustand';
import { giftsApi } from '../api/services.js';

const sortCatalog = (gifts = []) => [...gifts].sort((a, b) => (
  (a.coinCost ?? 0) - (b.coinCost ?? 0)
  || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  || String(a.name || '').localeCompare(String(b.name || ''))
));

const useGiftStore = create((set, get) => ({
  gifts: [],
  isLoading: false,
  error: null,
  lastLoadedAt: 0,

  loadCatalog: async (force = false) => {
    const { gifts, isLoading, lastLoadedAt } = get();
    if (isLoading) return gifts;
    if (!force && gifts.length && (Date.now() - lastLoadedAt) < 5 * 60 * 1000) {
      return gifts;
    }

    set({ isLoading: true, error: null });
    try {
      const res = await giftsApi.catalog();
      const catalog = sortCatalog(res.data?.data || []);
      set({
        gifts: catalog,
        isLoading: false,
        error: null,
        lastLoadedAt: Date.now(),
      });
      return catalog;
    } catch (error) {
      set({
        isLoading: false,
        error: error.message,
      });
      throw error;
    }
  },

  reset: () => {
    set({
      gifts: [],
      isLoading: false,
      error: null,
      lastLoadedAt: 0,
    });
  },
}));

export default useGiftStore;

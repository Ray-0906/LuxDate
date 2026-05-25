import { create } from 'zustand';
import { appApi } from '../api/services.js';
import mmkvStorage from '../utils/storage.js';

const STORAGE_KEY = 'app_settings';

export const DEFAULT_APP_SETTINGS = {
  branding: {
    appName: 'LuxDate',
    appLogoUrl: '',
    revision: 1,
  },
  calls: {
    nonVipRate: 10,
    vipRate: 7,
    minCoinsForCall: 20,
  },
};

const sanitizeSettings = (payload = {}) => ({
  branding: {
    appName: String(payload?.branding?.appName || DEFAULT_APP_SETTINGS.branding.appName),
    appLogoUrl: String(payload?.branding?.appLogoUrl || DEFAULT_APP_SETTINGS.branding.appLogoUrl),
    revision: Number(payload?.branding?.revision ?? DEFAULT_APP_SETTINGS.branding.revision) || DEFAULT_APP_SETTINGS.branding.revision,
  },
  calls: {
    nonVipRate: Number(payload?.calls?.nonVipRate ?? DEFAULT_APP_SETTINGS.calls.nonVipRate) || DEFAULT_APP_SETTINGS.calls.nonVipRate,
    vipRate: Number(payload?.calls?.vipRate ?? DEFAULT_APP_SETTINGS.calls.vipRate) || DEFAULT_APP_SETTINGS.calls.vipRate,
    minCoinsForCall: Number(payload?.calls?.minCoinsForCall ?? DEFAULT_APP_SETTINGS.calls.minCoinsForCall) || DEFAULT_APP_SETTINGS.calls.minCoinsForCall,
  },
});

const readCachedSettings = () => {
  try {
    const raw = mmkvStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
};

const writeCachedSettings = (settings) => {
  mmkvStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const useAppSettingsStore = create((set) => ({
  settings: readCachedSettings(),
  isBootstrapping: false,
  lastLoadedAt: null,

  bootstrap: async () => {
    set({ isBootstrapping: true });
    try {
      const res = await appApi.settings();
      const settings = sanitizeSettings(res.data?.data || {});
      writeCachedSettings(settings);
      set({ settings, isBootstrapping: false, lastLoadedAt: Date.now() });
      return settings;
    } catch (error) {
      const cached = readCachedSettings();
      set({ settings: cached, isBootstrapping: false });
      return cached;
    }
  },

  applySettings: (payload) => {
    const settings = sanitizeSettings(payload);
    writeCachedSettings(settings);
    set({ settings, lastLoadedAt: Date.now() });
  },
}));

export const getDisplayAppName = (state) => state?.settings?.branding?.appName || DEFAULT_APP_SETTINGS.branding.appName;
export const getDisplayLogoUrl = (state) => state?.settings?.branding?.appLogoUrl || '';

export default useAppSettingsStore;

import { create } from 'zustand';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import mmkvStorage from '../utils/storage.js';

export const PERMISSION_KEYS = ['photos', 'camera', 'microphone'];
const STORAGE_KEY = 'android_permission_statuses';

const DEFAULT_STATUSES = {
  photos: 'denied',
  camera: 'denied',
  microphone: 'denied',
};

const readStoredStatuses = () => {
  try {
    const raw = mmkvStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATUSES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATUSES, ...parsed };
  } catch {
    return DEFAULT_STATUSES;
  }
};

const persistStatuses = (statuses) => {
  mmkvStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
};

const getPermissionConstant = (key) => {
  switch (key) {
    case 'photos':
      return Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    case 'camera':
      return PermissionsAndroid.PERMISSIONS.CAMERA;
    case 'microphone':
      return PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    default:
      return null;
  }
};

const isGrantedMap = (statuses) => PERMISSION_KEYS.every((key) => statuses[key] === 'granted');

const usePermissionStore = create((set, get) => ({
  statuses: Platform.OS === 'android'
    ? readStoredStatuses()
    : {
        photos: 'granted',
        camera: 'granted',
        microphone: 'granted',
      },
  hasChecked: Platform.OS !== 'android',
  sessionDismissed: false,
  isRequesting: false,

  refreshStatuses: async () => {
    if (Platform.OS !== 'android') {
      const grantedStatuses = {
        photos: 'granted',
        camera: 'granted',
        microphone: 'granted',
      };
      set({ statuses: grantedStatuses, hasChecked: true });
      return grantedStatuses;
    }

    const previous = get().statuses;
    const entries = await Promise.all(PERMISSION_KEYS.map(async (key) => {
      const permission = getPermissionConstant(key);
      const granted = permission ? await PermissionsAndroid.check(permission) : true;
      if (granted) return [key, 'granted'];
      if (previous[key] === 'blocked') return [key, 'blocked'];
      return [key, 'denied'];
    }));

    const statuses = Object.fromEntries(entries);
    persistStatuses(statuses);
    set({ statuses, hasChecked: true });
    return statuses;
  },

  requestPermission: async (key) => {
    if (Platform.OS !== 'android') return true;

    const permission = getPermissionConstant(key);
    if (!permission) return true;

    set({ isRequesting: true });
    try {
      const result = await PermissionsAndroid.request(permission);
      const nextStatus =
        result === PermissionsAndroid.RESULTS.GRANTED
          ? 'granted'
          : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            ? 'blocked'
            : 'denied';

      const statuses = {
        ...get().statuses,
        [key]: nextStatus,
      };

      persistStatuses(statuses);
      set({ statuses, hasChecked: true });
      return nextStatus === 'granted';
    } finally {
      set({ isRequesting: false });
    }
  },

  requestPermissions: async (keys = PERMISSION_KEYS) => {
    let allGranted = true;
    for (const key of keys) {
      const currentStatus = get().statuses[key];
      if (currentStatus === 'granted' || currentStatus === 'blocked') continue;
      const granted = await get().requestPermission(key);
      if (!granted) {
        allGranted = false;
      }
    }
    await get().refreshStatuses();
    return isGrantedMap(get().statuses) && allGranted;
  },

  dismissForSession: () => set({ sessionDismissed: true }),
  resetSessionDismissal: () => set({ sessionDismissed: false }),
  openAppSettings: async () => {
    await Linking.openSettings();
  },
}));

export const getAllRequiredGranted = (state) => isGrantedMap(state.statuses);

export default usePermissionStore;

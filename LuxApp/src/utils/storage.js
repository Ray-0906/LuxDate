import { MMKV } from 'react-native-mmkv';

const memoryStore = new Map();
let storage;

try {
  storage = new MMKV({ id: 'luxdate-storage' });
  storage.set('_test', '1');
  storage.getString('_test');
} catch (e) {
  console.log('[DEBUG] Failed to create MMKV, using memory fallback:', e);
  storage = {
    getString: (key) => memoryStore.has(key) ? memoryStore.get(key) : null,
    set: (key, value) => memoryStore.set(key, value),
    delete: (key) => memoryStore.delete(key),
  };
}

const mmkvStorage = {
  getItem: (key) => {
    const value = storage.getString(key);
    return value ?? null;
  },
  setItem: (key, value) => {
    storage.set(key, value);
  },
  removeItem: (key) => {
    storage.delete(key);
  },
};

export default mmkvStorage;

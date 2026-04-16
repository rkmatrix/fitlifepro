/**
 * Local database — thin AsyncStorage wrapper for all FitLife data.
 * No network. No auth. Everything lives on the device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@fitlife:';

export const localDB = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* quota or corrupt store — fail silently */ }
  },

  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch { }
  },

  /** Clear all FitLife data — used for "reset app" */
  clearAll: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const fitKeys = keys.filter((k) => k.startsWith(PREFIX));
      await AsyncStorage.multiRemove(fitKeys);
    } catch { }
  },
};

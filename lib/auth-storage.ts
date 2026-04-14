/**
 * Supabase auth persistence. AsyncStorage on native; on web we use localStorage
 * only when `window` exists. RN-web's AsyncStorage touches `window` during SSR /
 * static export and throws `ReferenceError: window is not defined`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const webStorage: AuthStorage = {
  getItem: (key) => {
    try {
      if (typeof window === 'undefined') return Promise.resolve(null);
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window === 'undefined') return Promise.resolve();
      window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode */
    }
    return Promise.resolve();
  },
  removeItem: (key) => {
    try {
      if (typeof window === 'undefined') return Promise.resolve();
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  },
};

export const authStorage: AuthStorage =
  Platform.OS === 'web' ? webStorage : AsyncStorage;

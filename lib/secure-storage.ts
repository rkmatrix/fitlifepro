/**
 * Secure storage adapter for Supabase auth tokens.
 *
 * Native (iOS/Android): uses expo-secure-store — hardware-backed encrypted
 *   keychain (iOS) or Android Keystore (Android). Tokens cannot be extracted
 *   even by root/jailbreak in most configurations.
 *
 * Web: uses sessionStorage — tokens live only for the browser session and are
 *   never written to disk. This limits XSS exposure compared to localStorage.
 *   CSP headers in .htaccess further restrict script injection.
 */

import { Platform } from 'react-native';

// Native import — resolved at runtime only on iOS/Android
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  // Dynamic require keeps the web bundle clean
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
}

// Supabase storage adapter interface
export const SecureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return sessionStorage.getItem(key);
      }
      return await SecureStore!.getItemAsync(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        sessionStorage.setItem(key, value);
        return;
      }
      await SecureStore!.setItemAsync(key, value, {
        // Require device unlock (biometric or PIN) to access
        keychainAccessible: SecureStore!.WHEN_UNLOCKED,
      });
    } catch {
      // Fallback: do not store (session won't persist but app remains safe)
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        sessionStorage.removeItem(key);
        return;
      }
      await SecureStore!.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

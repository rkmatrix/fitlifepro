/**
 * Local database for all FitLife data.
 *
 * NATIVE (iOS / Android):
 *   AsyncStorage only — everything stays on the device.
 *
 * WEB:
 *   localStorage is used as an instant cache.
 *   Every write is also sent to Supabase `web_storage` (free tier, no auth).
 *   On startup call `localDB.syncFromCloud()` to hydrate from the cloud so
 *   data survives clearing the browser cache or opening on another device.
 *   The device is identified by a UUID auto-generated on first visit and
 *   persisted in localStorage under `fitlife_device_id`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PREFIX = '@fitlife:';

// ─── Web helpers ─────────────────────────────────────────────────────────────

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('fitlife_device_id');
    if (!id) {
      id = 'web_' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
      localStorage.setItem('fitlife_device_id', id);
    }
    return id;
  } catch {
    return 'web_anon';
  }
}

// Lazy-loaded Supabase client — avoids circular imports at module init time.
let _sb: import('@supabase/supabase-js').SupabaseClient | null = null;
async function getSB() {
  if (!_sb) {
    const { supabase } = await import('./supabase');
    _sb = supabase;
  }
  return _sb;
}

async function cloudGet(key: string): Promise<unknown | null> {
  try {
    const sb = await getSB();
    const { data } = await sb
      .from('web_storage')
      .select('value')
      .eq('device_id', getDeviceId())
      .eq('key', key)
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

async function cloudSet(key: string, value: unknown): Promise<void> {
  try {
    const sb = await getSB();
    await sb.from('web_storage').upsert(
      { device_id: getDeviceId(), key, value, updated_at: new Date().toISOString() },
      { onConflict: 'device_id,key' }
    );
  } catch { /* offline — local cache is still written */ }
}

async function cloudRemove(key: string): Promise<void> {
  try {
    const sb = await getSB();
    await sb.from('web_storage').delete()
      .eq('device_id', getDeviceId()).eq('key', key);
  } catch { }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const localDB = {
  get: async <T>(key: string): Promise<T | null> => {
    if (Platform.OS !== 'web') {
      // Native: AsyncStorage
      try {
        const raw = await AsyncStorage.getItem(PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch { return null; }
    }

    // Web: try localStorage cache first (instant), then cloud
    try {
      const cached = localStorage.getItem(PREFIX + key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch { }
    const remote = await cloudGet(key);
    if (remote !== null) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(remote)); } catch { }
      return remote as T;
    }
    return null;
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    if (Platform.OS !== 'web') {
      try { await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { }
      return;
    }
    // Web: write to cache immediately, then persist to cloud
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { }
    await cloudSet(key, value);
  },

  remove: async (key: string): Promise<void> => {
    if (Platform.OS !== 'web') {
      try { await AsyncStorage.removeItem(PREFIX + key); } catch { }
      return;
    }
    try { localStorage.removeItem(PREFIX + key); } catch { }
    await cloudRemove(key);
  },

  /** Clear all FitLife data — used for "reset app" */
  clearAll: async (): Promise<void> => {
    if (Platform.OS !== 'web') {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const fitKeys = keys.filter((k) => k.startsWith(PREFIX));
        await AsyncStorage.multiRemove(fitKeys);
      } catch { }
      return;
    }
    // Web: clear localStorage cache
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch { }
    // Clear cloud
    try {
      const sb = await getSB();
      await sb.from('web_storage').delete().eq('device_id', getDeviceId());
    } catch { }
  },

  /**
   * WEB ONLY — pull all rows for this device from Supabase into localStorage.
   * Call once on app startup (in _layout.tsx) so the app has fresh cloud data.
   * No-op on native.
   */
  syncFromCloud: async (): Promise<void> => {
    if (Platform.OS !== 'web') return;
    try {
      const sb = await getSB();
      const { data } = await sb
        .from('web_storage')
        .select('key, value')
        .eq('device_id', getDeviceId());
      if (data) {
        for (const row of data) {
          try { localStorage.setItem(PREFIX + row.key, JSON.stringify(row.value)); } catch { }
        }
      }
    } catch { /* network error — localStorage cache will be used */ }
  },
};

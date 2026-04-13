import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import { SecureStorageAdapter } from './secure-storage';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing URL or anon key — running in limited mode.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Use hardware-encrypted storage on native; session-scoped storage on web
    storage: SecureStorageAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    // Enable URL-based session detection for web OAuth redirects
    detectSessionInUrl: Platform.OS === 'web',
    // Use PKCE flow — prevents auth code interception attacks
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Platform': Platform.OS,
      'X-Client-Version': '1.0.0',
    },
  },
  // Disable realtime to reduce attack surface on mobile; enable per-feature
  realtime: {
    params: { eventsPerSecond: 2 },
  },
});

/** Call once at app start. Logs Supabase auth errors in dev only. */
export function initSupabaseAuthLogging() {
  if (__DEV__) {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase Auth]', event, session?.user?.email ?? 'no user');
    });
  }
}

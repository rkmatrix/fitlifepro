import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import { authStorage } from './auth-storage';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing URL or anon key — running in limited mode.');
}

/**
 * Auth storage: AsyncStorage on native; web-safe localStorage via `auth-storage`
 * (avoids AsyncStorage + `window` during SSR / Node).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    // PKCE on web only; implicit refresh works reliably on native with AsyncStorage
    ...(Platform.OS === 'web' ? { flowType: 'pkce' as const } : {}),
  },
  global: {
    headers: {
      'X-Client-Platform': Platform.OS,
      'X-Client-Version': '1.0.0',
    },
  },
  realtime: {
    params: { eventsPerSecond: 2 },
  },
});

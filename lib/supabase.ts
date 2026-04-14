import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing URL or anon key — running in limited mode.');
}

/**
 * Auth storage: AsyncStorage is the officially supported option for React Native +
 * Supabase. SecureStore caused session restore issues on some devices (stuck splash).
 * Web uses the same package (localStorage under the hood in RN-web).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
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

/**
 * OAuth callback route.
 *
 * This screen handles the redirect after a user signs in via:
 *   • Google OAuth   → fitlife://auth/callback?code=...  (native)
 *   •                 → https://yourapp.com/auth/callback#access_token=... (web)
 *   • Facebook OAuth → same patterns
 *   • Magic link email → same patterns
 *
 * Supabase JS (with detectSessionInUrl: true on web) automatically exchanges
 * the code/token in the URL for a session. This page just shows a spinner
 * while that exchange happens, then routes to the main app.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../stores/userStore';
import { Colors } from '../../constants/theme';

export default function AuthCallbackScreen() {
  const { loadProfile } = useUserStore();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // On web, Supabase automatically picks up the token from the URL hash/query.
      // On native, the deep link provides `code` and `state` parameters via PKCE.
      const code = params.code as string | undefined;

      if (code) {
        // Exchange PKCE code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      // Get the current session (may have been set by detectSessionInUrl)
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        await loadProfile();
        router.replace('/(tabs)');
      } else {
        // No session established — go back to onboarding
        router.replace('/onboarding');
      }
    } catch (err) {
      console.error('[AuthCallback] Error:', err);
      router.replace('/onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 16 },
  text: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
});

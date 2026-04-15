/**
 * OAuth callback route.
 *
 * This screen handles the redirect after a user signs in via:
 *   • Google OAuth   → fitlife://auth/callback?code=...  (native)
 *   •                 → https://yourapp.com/auth/callback?code=... (web, PKCE)
 *   • Facebook OAuth → same patterns
 *   • Magic link email → same patterns
 *
 * On NATIVE: we exchange the PKCE code manually here.
 * On WEB:    detectSessionInUrl:true + flowType:'pkce' means the Supabase client
 *            automatically exchanges the code during initialization.  Calling
 *            exchangeCodeForSession() a second time would consume the already-used
 *            code verifier and throw an error.  Instead we subscribe to
 *            onAuthStateChange and wait for SIGNED_IN.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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
      if (Platform.OS !== 'web') {
        // ── Native: manually exchange the PKCE code delivered via deep link ──
        const code = params.code as string | undefined;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadProfile();
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } else {
        // ── Web: detectSessionInUrl already exchanged (or is exchanging) the code ──
        // Check for an already-established session first.
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (existing) {
          await loadProfile();
          router.replace('/(tabs)');
          return;
        }

        // Session not ready yet — wait for Supabase to finish the auto-exchange.
        const fallback = setTimeout(() => router.replace('/onboarding'), 10_000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              clearTimeout(fallback);
              subscription.unsubscribe();
              await loadProfile();
              router.replace('/(tabs)');
            } else if (event === 'SIGNED_OUT') {
              clearTimeout(fallback);
              subscription.unsubscribe();
              router.replace('/onboarding');
            }
          }
        );
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

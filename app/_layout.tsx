import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUserStore } from '../stores/userStore';
import { requestNotificationPermission } from '../engines/accountabilityEngine';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../constants/demo';

export default function RootLayout() {
  const { loadProfile, setProfile, logout } = useUserStore();

  useEffect(() => {
    // Load persisted session on app start
    loadProfile();
    requestNotificationPermission();

    if (IS_DEMO) return; // Skip live auth in demo mode

    // ── Cross-device session sync ─────────────────────────────────────────
    // onAuthStateChange fires whenever:
    //   • a session is restored from secure storage on launch
    //   • the user signs in (any platform)
    //   • the token auto-refreshes
    //   • the user signs out from any device
    //   • the session expires
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Reload the profile from DB to keep all devices in sync
          await loadProfile();
        }

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          await logout();
          router.replace('/onboarding');
        }

        if (event === 'TOKEN_REFRESHED') {
          // Session silently refreshed — no UI change needed
        }

        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password-reset link — route to reset screen
          router.push('/auth/reset-password');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F6F9' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/index" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
          <Stack.Screen
            name="workout/session/[id]"
            options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="workout/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

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

/**
 * Do not use expo-splash-screen here — Expo Router already coordinates splash hide
 * via its internal navigation `onReady` hook. Extra preventAutoHide/hideAsync calls
 * conflict on Android and can leave a frozen splash or blank screen.
 */
export default function RootLayout() {
  const loadProfile = useUserStore((s) => s.loadProfile);
  const logout = useUserStore((s) => s.logout);

  useEffect(() => {
    loadProfile();
    requestNotificationPermission();
  }, [loadProfile]);

  useEffect(() => {
    if (IS_DEMO) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await useUserStore.getState().loadProfile();
      }

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await logout();
        router.replace('/onboarding');
      }

      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [logout]);

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

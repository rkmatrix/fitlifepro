import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useUserStore } from '../stores/userStore';
import { requestNotificationPermission } from '../engines/accountabilityEngine';
import { supabase } from '../lib/supabase';
import { IS_DEMO } from '../constants/demo';

// Keep the splash visible until we know where to route (auth check or demo).
// Expo Router's internal auto-hide is unreliable on Android with newArchEnabled
// + edgeToEdgeEnabled — managing it explicitly prevents the "frozen logo" symptom.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const loadProfile = useUserStore((s) => s.loadProfile);
  const logout = useUserStore((s) => s.logout);
  const isLoading = useUserStore((s) => s.isLoading);

  // Hide the splash as soon as the auth/profile check is done.
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  useEffect(() => {
    loadProfile();
    requestNotificationPermission();
  }, [loadProfile]);

  useEffect(() => {
    if (IS_DEMO) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
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
          <Stack.Screen name="workout" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

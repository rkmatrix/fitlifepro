import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useUserStore } from '../stores/userStore';
import { requestNotificationPermission } from '../engines/accountabilityEngine';

// Keep the splash visible until the profile check is done.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const loadProfile = useUserStore((s) => s.loadProfile);
  const isLoading = useUserStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  useEffect(() => {
    loadProfile();
    requestNotificationPermission();
  }, [loadProfile]);

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

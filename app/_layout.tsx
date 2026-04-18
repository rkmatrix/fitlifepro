import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useUserStore } from '../stores/userStore';
import { localDB } from '../lib/local-db';

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
    // Load from localStorage immediately — never block on cloud sync
    if (Platform.OS === 'web') {
      loadProfile();
      // Background cloud sync: hydrate localStorage with any newer cloud data
      localDB.syncFromCloud().catch(() => {});
    } else {
      loadProfile();
    }
  }, [loadProfile]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#0f0f1a' : undefined }}>
      {/* On web: center a phone-width column; on native: fill the screen */}
      <View style={Platform.OS === 'web'
        ? { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' as const, overflow: 'hidden' as any, boxShadow: '0 0 60px rgba(0,0,0,0.45)' } as any
        : { flex: 1 }
      }>
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
      </View>
    </GestureHandlerRootView>
  );
}

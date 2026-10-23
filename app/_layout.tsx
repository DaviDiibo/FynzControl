import { useEffect, type JSX } from 'react';
import { AppState } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/auth-store';
import { handleAppStateChange } from '../src/utils/session';
import { useAppHydration } from '../src/hooks/use-app-hydration';

SplashScreen.preventAutoHideAsync().catch(() => {});

const RootLayout = (): JSX.Element | null => {
  const isHydrated = useAppHydration();
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isHydrated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // @ts-expect-error Expo router group route canonical path
      router.replace('/(app)');
    }
  }, [isHydrated, isAuthenticated, segments, router]);

  if (!isHydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* @ts-ignore - expo-status-bar types in SDK 57 omit backgroundColor and translucent */}
      <StatusBar style="light" backgroundColor="#121212" translucent={false} />
      <Slot />
    </SafeAreaProvider>
  );
};

export default RootLayout;

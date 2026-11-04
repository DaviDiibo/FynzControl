import { useEffect, type JSX } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Slot, useRouter, useSegments, DarkTheme, ThemeProvider, type Theme } from 'expo-router';
import Head from 'expo-router/head';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/auth-store';
import { handleAppStateChange } from '../src/utils/session';
import { useAppHydration } from '../src/hooks/use-app-hydration';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PUBLIC_ROUTES = ['terms', 'privacy'];

const customDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212',
    card: '#121212',
    border: '#2C2C2E',
  },
};

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
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'ControlFynz';
      let iconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = '/LogoMiniaturaFynz.jpeg';
    }
  }, [segments]);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isPublicRoute = Boolean(segments[0] && PUBLIC_ROUTES.includes(segments[0]));

    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // @ts-expect-error Expo router group route canonical path
      router.replace('/(app)');
    }
  }, [isHydrated, isAuthenticated, segments, router]);

  return (
    <SafeAreaProvider>
      <Head>
        <title>ControlFynz</title>
        <link rel="icon" type="image/jpeg" href="/LogoMiniaturaFynz.jpeg" />
        <link rel="shortcut icon" href="/LogoMiniaturaFynz.jpeg" />
        <link rel="apple-touch-icon" href="/LogoMiniaturaFynz.jpeg" />
        <style id="cf-dark-root">{`
          html, body, #root {
            background-color: #121212 !important;
            margin: 0;
            padding: 0;
          }
        `}</style>
      </Head>
      {/* @ts-ignore - expo-status-bar types in SDK 57 omit backgroundColor and translucent */}
      <StatusBar style="light" backgroundColor="#121212" translucent={false} />
      <ThemeProvider value={customDarkTheme}>
        <View style={{ flex: 1, backgroundColor: '#121212' }}>
          {isHydrated ? <Slot /> : null}
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;

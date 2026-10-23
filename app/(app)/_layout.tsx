import type { JSX } from 'react';
import { Platform } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';

const AppLayout = (): JSX.Element => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(modal)"
        options={{
          presentation: Platform.OS === 'ios' ? 'modal' : 'transparentModal',
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_bottom',
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default AppLayout;

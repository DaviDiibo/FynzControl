import type { JSX } from 'react';
import { Platform } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { colors } from '../../src/theme/colors';

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
          animation: Platform.OS === 'ios' ? 'default' : 'fade',
          headerShown: false,
          contentStyle: {
            backgroundColor: Platform.OS === 'ios' ? colors.background : 'transparent',
          },
        }}
      />
    </Stack>
  );
};

export default AppLayout;

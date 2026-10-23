import type { JSX } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';

const AppLayout = (): JSX.Element => {
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

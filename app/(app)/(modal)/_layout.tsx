import type { JSX } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/colors';

const ModalLayout = (): JSX.Element => {
  return (
    <Stack
      screenOptions={{
        presentation: Platform.OS === 'ios' ? 'card' : 'transparentModal',
        animation: Platform.OS === 'ios' ? 'default' : 'fade',
        headerShown: false,
        contentStyle: {
          backgroundColor: Platform.OS === 'ios' ? colors.background : 'transparent',
        },
      }}
    >
      <Stack.Screen name="new-transaction" options={{ headerShown: false }} />
      <Stack.Screen name="new-debt" options={{ headerShown: false }} />
      <Stack.Screen name="cards-overview" options={{ headerShown: false }} />
      <Stack.Screen name="legacy-card-expense" options={{ headerShown: false }} />
    </Stack>
  );
};

export default ModalLayout;

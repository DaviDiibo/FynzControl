import type { JSX } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/colors';

const ModalLayout = (): JSX.Element => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Platform.OS === 'ios' ? colors.background : 'transparent',
        },
      }}
    >
      <Stack.Screen name="new-transaction" options={{ headerShown: false }} />
      <Stack.Screen name="new-debt" options={{ headerShown: false }} />
    </Stack>
  );
};

export default ModalLayout;

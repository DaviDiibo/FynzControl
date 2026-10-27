import type { JSX } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsWide } from '../../../src/hooks/use-responsive';

const TabsLayout = (): JSX.Element => {
  const insets = useSafeAreaInsets();
  const isWide = useIsWide(768);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00FFA3',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: isWide
          ? {
              position: 'absolute' as const,
              bottom: 16,
              left: 0,
              right: 0,
              marginHorizontal: 'auto',
              maxWidth: 540,
              width: '100%',
              height: 64,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#2C2C2E',
              borderTopWidth: 1,
              borderTopColor: '#2C2C2E',
              backgroundColor: '#1A1A1A',
              paddingTop: 8,
              paddingBottom: 8,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 10,
              overflow: 'hidden' as const,
            }
          : {
              backgroundColor: '#1A1A1A',
              borderTopColor: '#2C2C2E',
              borderTopWidth: 1,
              height: Platform.OS === 'ios' ? 88 : 60 + insets.bottom,
              paddingBottom: Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8),
              paddingTop: Platform.OS === 'ios' ? 10 : 8,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color }) => (
            <Ionicons name="swap-horizontal-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: 'Deudas',
          tabBarIcon: ({ color }) => (
            <Ionicons name="card-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ color }) => (
            <Ionicons name="pie-chart-outline" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;

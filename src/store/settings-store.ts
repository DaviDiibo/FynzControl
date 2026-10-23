import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Memoria fallback en caso de retraso en enlace nativo
const memoryStorage = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value;
    } catch {
      return memoryStorage.get(name) ?? null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      memoryStorage.set(name, value);
      await AsyncStorage.setItem(name, value);
    } catch {
      // Silently fallback to memory storage
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      memoryStorage.delete(name);
      await AsyncStorage.removeItem(name);
    } catch {
      // Silently fallback to memory storage
    }
  },
};

export type CurrencyCode = 'USD' | 'EUR' | 'BRL' | 'ARS' | 'COP' | 'MXN';

export interface SettingsState {
  currency: CurrencyCode;
  privacyMode: boolean; // Ocultar saldos por defecto
  biometricsEnabled: boolean;
  setCurrency: (currency: CurrencyCode) => void;
  setPrivacyMode: (enabled: boolean) => void;
  togglePrivacyMode: () => void;
  setBiometricsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'USD',
      privacyMode: false,
      biometricsEnabled: false,
      setCurrency: (currency: CurrencyCode) => set({ currency }),
      setPrivacyMode: (privacyMode: boolean) => set({ privacyMode }),
      togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),
      setBiometricsEnabled: (biometricsEnabled: boolean) => set({ biometricsEnabled }),
    }),
    {
      name: 'controlfynz-settings-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

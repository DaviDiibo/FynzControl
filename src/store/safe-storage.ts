import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

const memoryStorage = new Map<string, string>();

export const safeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (value !== null) {
        memoryStorage.set(name, value);
        return value;
      }
      return memoryStorage.get(name) ?? null;
    } catch {
      return memoryStorage.get(name) ?? null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    memoryStorage.set(name, value);
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Fallback a memoria si AsyncStorage falla o está demorado
    }
  },
  removeItem: async (name: string): Promise<void> => {
    memoryStorage.delete(name);
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Fallback a memoria
    }
  },
};

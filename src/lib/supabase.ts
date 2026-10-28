import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

const supabaseUrl: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://adzfhzseviuchmazynct.supabase.co';
const supabaseAnonKey: string =
  process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_DZ0fa5FnOQlJaaw6RajjDg_QAgISIgx';

const memoryStorage = new Map<string, string>();

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const safeAuthStorage: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return memoryStorage.get(key) ?? null;
      }
      const value = await AsyncStorage.getItem(key);
      return value ?? memoryStorage.get(key) ?? null;
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      memoryStorage.set(key, value);
      await AsyncStorage.setItem(key, value);
    } catch {
      // Fallback en memoria si falla la persistencia nativa
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      memoryStorage.delete(key);
      await AsyncStorage.removeItem(key);
    } catch {
      // Fallback en memoria si falla la persistencia nativa
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});


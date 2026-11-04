import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { syncService } from '../services/sync-service';
import { useTransactionsStore } from './transactions-store';
import { useDebtsStore } from './debts-store';
import { useCardsStore } from './cards-store';
import { isTauri, OAUTH_SUCCESS_HTML } from '../utils/tauri-helpers';
import type { User, AuthResponse } from '../types';

WebBrowser.maybeCompleteAuthSession();

const purgeAllDomainStores = (): void => {
  useTransactionsStore.getState().clearAllTransactions();
  useDebtsStore.getState().resetDebtsStore();
  useCardsStore.getState().resetCardsStore();
};

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

const mapAuthError = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Credenciales inválidas. Revisa tu correo y contraseña.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Este correo electrónico ya se encuentra registrado.';
  }
  if (lower.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (lower.includes('invalid format') || lower.includes('validate email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiados intentos. Por favor, espera unos momentos antes de reintentar.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'Error de conexión con el servidor. Revisa tu internet.';
  }
  return message || 'Ocurrió un error inesperado al procesar la autenticación.';
};

const decodeSafe = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export type AuthState = {
  user: User | null;
  session?: null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActiveTimestamp: number;
  isLocked: boolean;
  pin: string | null;
  login: (email?: string, password?: string) => Promise<AuthResponse>;
  loginWithGoogle: () => Promise<AuthResponse>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthResponse & { message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateActivity: () => void;
  setPin: (pin: string | null) => void;
  lockApp: () => void;
  unlockApp: (enteredPin?: string) => boolean;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      lastActiveTimestamp: Date.now(),
      isLocked: false,
      pin: null,

      login: async (email?: string, password?: string): Promise<AuthResponse> => {
        if (!email || !password) {
          return { error: 'Por favor, ingresa tu correo y contraseña.' };
        }

        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { error: mapAuthError(error.message) };
          }

          if (data.user) {
            const userName =
              typeof data.user.user_metadata?.name === 'string'
                ? data.user.user_metadata.name
                : data.user.email?.split('@')[0] ?? 'Usuario';

            const rawAvatar =
              typeof data.user.user_metadata?.avatar_url === 'string' && data.user.user_metadata.avatar_url.trim().length > 0
                ? data.user.user_metadata.avatar_url.trim()
                : typeof data.user.user_metadata?.picture === 'string' && data.user.user_metadata.picture.trim().length > 0
                  ? data.user.user_metadata.picture.trim()
                  : undefined;

            const mappedUser: User = {
              id: data.user.id,
              email: data.user.email ?? email,
              name: userName,
              avatarUrl: rawAvatar,
              createdAt: data.user.created_at,
            };

            const currentUser = get().user;
            if (!currentUser || currentUser.id !== mappedUser.id) {
              purgeAllDomainStores();
            }

            set({
              isAuthenticated: true,
              user: mappedUser,
              lastActiveTimestamp: Date.now(),
              isLocked: false,
              isLoading: false,
            });
            syncService.syncAll(mappedUser.id).catch(() => {});
            syncService.startRealtimeSubscription(mappedUser.id);
            return { error: null };
          }

          set({ isLoading: false });
          return { error: 'No se pudo obtener la información del usuario.' };
        } catch {
          set({ isLoading: false });
          return { error: 'Error de red o conexión al intentar iniciar sesión.' };
        }
      },

      loginWithGoogle: async (): Promise<AuthResponse> => {
        set({ isLoading: true });
        try {
          if (isTauri()) {
            const [{ start, cancel, onUrl }, { openUrl }] = await Promise.all([
              import('@fabianlars/tauri-plugin-oauth'),
              import('@tauri-apps/plugin-opener'),
            ]);

            const port = await start({ response: OAUTH_SUCCESS_HTML });
            const redirectUrl = `http://localhost:${port}`;
            let unlisten: (() => void) | null = null;
            let callbackUrl: string;

            try {
              const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: redirectUrl,
                  skipBrowserRedirect: true,
                },
              });

              if (error) {
                set({ isLoading: false });
                return { error: error.message };
              }
              if (!data?.url) {
                set({ isLoading: false });
                return { error: 'No se pudo generar la URL de autenticación.' };
              }

              const authPromise = new Promise<string>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error('El inicio de sesión expiró o fue cancelado.'));
                }, 120000);

                onUrl((url: string) => {
                  clearTimeout(timeout);
                  resolve(url);
                }).then((unlistenFn) => {
                  unlisten = unlistenFn;
                }).catch(reject);
              });

              await openUrl(data.url);
              callbackUrl = await authPromise;
            } finally {
              const activeUnlisten = unlisten as (() => void) | null;
              if (activeUnlisten) {
                try {
                  activeUnlisten();
                } catch {
                  // Silencioso
                }
              }
              try {
                await cancel(port);
              } catch {
                // Silencioso
              }
            }

            let code: string | null = null;
            let access_token: string | null = null;
            let refresh_token: string | null = null;
            let authError: string | null = null;
            let authErrorDescription: string | null = null;

            try {
              const parsedUrl = new URL(callbackUrl);
              code = parsedUrl.searchParams.get('code');
              access_token = parsedUrl.searchParams.get('access_token');
              refresh_token = parsedUrl.searchParams.get('refresh_token');
              authError = parsedUrl.searchParams.get('error');
              authErrorDescription = parsedUrl.searchParams.get('error_description');

              const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.substring(1) : parsedUrl.hash;
              if (hash) {
                const hashParams = new URLSearchParams(hash);
                if (!code) code = hashParams.get('code');
                if (!access_token) access_token = hashParams.get('access_token');
                if (!refresh_token) refresh_token = hashParams.get('refresh_token');
                if (!authError) authError = hashParams.get('error');
                if (!authErrorDescription) authErrorDescription = hashParams.get('error_description');
              }
            } catch {
              const getParam = (name: string, url: string): string | null => {
                const match = url.match(new RegExp(`[?&#]${name}=([^&#]+)`));
                return match ? decodeSafe(match[1]) : null;
              };
              code = getParam('code', callbackUrl);
              access_token = getParam('access_token', callbackUrl);
              refresh_token = getParam('refresh_token', callbackUrl);
              authError = getParam('error', callbackUrl);
              authErrorDescription = getParam('error_description', callbackUrl);
            }

            if (authError || authErrorDescription) {
              set({ isLoading: false });
              const rawMsg = authErrorDescription || authError || 'Error de autenticación.';
              return { error: decodeSafe(rawMsg) };
            }

            if (code) {
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                set({ isLoading: false });
                return { error: exchangeError.message };
              }
            } else if (access_token && refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
              if (sessionError) {
                set({ isLoading: false });
                return { error: sessionError.message };
              }
            } else {
              set({ isLoading: false });
              return { error: 'No se recibieron credenciales de autenticación válidas.' };
            }

            set({ isLoading: false });
            return { error: null };
          }

          if (Platform.OS === 'web') {
            const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo },
            });
            set({ isLoading: false });
            if (error) return { error: error.message };
            return { error: null };
          }

          const redirectUrl = makeRedirectUri({
            scheme: 'controlfynz',
            path: 'auth/callback',
          });

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true,
            },
          });

          if (error) {
            set({ isLoading: false });
            return { error: error.message };
          }
          if (!data?.url) {
            set({ isLoading: false });
            return { error: 'No se pudo generar la URL de autenticación.' };
          }

          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
            preferEphemeralSession: false,
          });

          if (result.type !== 'success' || !result.url) {
            set({ isLoading: false });
            return { error: 'Inicio de sesión cancelado o cerrado.' };
          }

          let code: string | null = null;
          let access_token: string | null = null;
          let refresh_token: string | null = null;
          let authError: string | null = null;
          let authErrorDescription: string | null = null;

          try {
            const parsedUrl = new URL(result.url);
            code = parsedUrl.searchParams.get('code');
            access_token = parsedUrl.searchParams.get('access_token');
            refresh_token = parsedUrl.searchParams.get('refresh_token');
            authError = parsedUrl.searchParams.get('error');
            authErrorDescription = parsedUrl.searchParams.get('error_description');

            const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.substring(1) : parsedUrl.hash;
            if (hash) {
              const hashParams = new URLSearchParams(hash);
              if (!code) code = hashParams.get('code');
              if (!access_token) access_token = hashParams.get('access_token');
              if (!refresh_token) refresh_token = hashParams.get('refresh_token');
              if (!authError) authError = hashParams.get('error');
              if (!authErrorDescription) authErrorDescription = hashParams.get('error_description');
            }
          } catch {
            const getParam = (name: string, url: string): string | null => {
              const match = url.match(new RegExp(`[?&#]${name}=([^&#]+)`));
              return match ? decodeSafe(match[1]) : null;
            };
            code = getParam('code', result.url);
            access_token = getParam('access_token', result.url);
            refresh_token = getParam('refresh_token', result.url);
            authError = getParam('error', result.url);
            authErrorDescription = getParam('error_description', result.url);
          }

          if (authError || authErrorDescription) {
            set({ isLoading: false });
            const rawMsg = authErrorDescription || authError || 'Error de autenticación.';
            return { error: decodeSafe(rawMsg) };
          }

          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              set({ isLoading: false });
              return { error: exchangeError.message };
            }
          } else if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessionError) {
              set({ isLoading: false });
              return { error: sessionError.message };
            }
          } else {
            set({ isLoading: false });
            return { error: 'No se recibieron credenciales de autenticación válidas.' };
          }

          set({ isLoading: false });
          return { error: null };
        } catch (err: unknown) {
          set({ isLoading: false });
          const message = err instanceof Error ? err.message : String(err);
          return { error: `Error al iniciar sesión con Google: ${message}` };
        }
      },

      register: async (
        name: string,
        email: string,
        password: string
      ): Promise<AuthResponse & { message?: string }> => {
        if (!name.trim() || !email.trim() || !password) {
          return { error: 'Por favor, completa todos los campos requeridos.' };
        }

        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim(),
                full_name: name.trim(),
              },
            },
          });

          if (error) {
            set({ isLoading: false });
            return { error: mapAuthError(error.message) };
          }

          if (data.user) {
            const mappedUser: User = {
              id: data.user.id,
              email: data.user.email ?? email.trim(),
              name: name.trim(),
              createdAt: data.user.created_at,
            };

            if (data.session) {
              const currentUser = get().user;
              if (!currentUser || currentUser.id !== mappedUser.id) {
                purgeAllDomainStores();
              }

              set({
                isAuthenticated: true,
                user: mappedUser,
                lastActiveTimestamp: Date.now(),
                isLocked: false,
                isLoading: false,
              });
              syncService.syncAll(mappedUser.id).catch(() => {});
              syncService.startRealtimeSubscription(mappedUser.id);
              return { error: null };
            } else {
              set({ isLoading: false });
              return {
                error: null,
                message:
                  'Cuenta creada. Por favor, revisa tu correo electrónico para confirmar tu cuenta.',
              };
            }
          }

          set({ isLoading: false });
          return { error: 'No se pudo registrar el usuario en el sistema.' };
        } catch {
          set({ isLoading: false });
          return { error: 'Error de red al intentar registrar la cuenta.' };
        }
      },

      logout: async (): Promise<void> => {
        syncService.stopRealtimeSubscription();
        purgeAllDomainStores();
        try {
          await Promise.allSettled([
            safeStorage.removeItem('controlfynz-auth-storage'),
            safeStorage.removeItem('auth-storage-v2'),
            supabase.auth.signOut({ scope: 'local' }),
          ]);
        } catch {
          // Silencioso ante contingencias de red
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            session: null,
            lastActiveTimestamp: Date.now(),
            isLocked: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async (): Promise<void> => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session?.user) {
            syncService.stopRealtimeSubscription();
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
            });
            return;
          }

          const u = data.session.user;
          const userName =
            typeof u.user_metadata?.name === 'string'
              ? u.user_metadata.name
              : u.email?.split('@')[0] ?? 'Usuario';

          const rawAvatar =
            typeof u.user_metadata?.avatar_url === 'string' && u.user_metadata.avatar_url.trim().length > 0
              ? u.user_metadata.avatar_url.trim()
              : typeof u.user_metadata?.picture === 'string' && u.user_metadata.picture.trim().length > 0
                ? u.user_metadata.picture.trim()
                : undefined;

          const mappedUser: User = {
            id: u.id,
            email: u.email ?? '',
            name: userName,
            avatarUrl: rawAvatar,
            createdAt: u.created_at,
          };

          const currentUser = get().user;
          if (!currentUser || currentUser.id !== mappedUser.id) {
            purgeAllDomainStores();
          }

          set({
            isAuthenticated: true,
            user: mappedUser,
            isLoading: false,
          });
          syncService.syncAll(mappedUser.id).catch(() => {});
          syncService.startRealtimeSubscription(mappedUser.id);
        } catch {
          set({ isLoading: false });
        }
      },

      initializeAuth: async (): Promise<void> => {
        return get().checkAuth();
      },

      updateActivity: (): void => {
        set({ lastActiveTimestamp: Date.now() });
      },

      setPin: (pin: string | null): void => {
        set({ pin });
      },

      lockApp: (): void => {
        set({ isLocked: true });
      },

      unlockApp: (enteredPin?: string): boolean => {
        const currentPin = get().pin;
        if (!currentPin) {
          set({ isLocked: false, lastActiveTimestamp: Date.now() });
          return true;
        }
        if (enteredPin === currentPin) {
          set({ isLocked: false, lastActiveTimestamp: Date.now() });
          return true;
        }
        return false;
      },

      deleteAccount: async (): Promise<{ success: boolean; error?: string }> => {
        set({ isLoading: true });
        try {
          const { error: rpcError } = await supabase.rpc('delete_user_account');
          if (rpcError) {
            set({ isLoading: false });
            return { success: false, error: rpcError.message };
          }

          syncService.stopRealtimeSubscription();
          try {
            await supabase.auth.signOut();
          } catch {
            // Silencioso si falla la red en signOut tras eliminación en servidor
          }

          purgeAllDomainStores();
          await safeStorage.removeItem('controlfynz-auth-storage');
          await safeStorage.removeItem('auth-storage-v2');

          set({
            isAuthenticated: false,
            user: null,
            session: null,
            isLoading: false,
            isLocked: false,
            pin: null,
          });

          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          const errorMessage =
            err instanceof Error ? err.message : 'Error al eliminar la cuenta';
          return { success: false, error: errorMessage };
        }
      },
    }),
    {
      name: 'controlfynz-auth-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        lastActiveTimestamp: state.lastActiveTimestamp,
        isLocked: state.isLocked,
        pin: state.pin,
      }),
    }
  )
);

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
    if (session?.user) {
      const u = session.user;
      const userName =
        typeof u.user_metadata?.name === 'string'
          ? u.user_metadata.name
          : u.email?.split('@')[0] ?? 'Usuario';

      const rawAvatar =
        typeof u.user_metadata?.avatar_url === 'string' && u.user_metadata.avatar_url.trim().length > 0
          ? u.user_metadata.avatar_url.trim()
          : typeof u.user_metadata?.picture === 'string' && u.user_metadata.picture.trim().length > 0
            ? u.user_metadata.picture.trim()
            : undefined;

      const mappedUser: User = {
        id: u.id,
        email: u.email ?? '',
        name: userName,
        avatarUrl: rawAvatar,
        createdAt: u.created_at,
      };

      const currentUser = useAuthStore.getState().user;
      if (!currentUser || currentUser.id !== mappedUser.id) {
        purgeAllDomainStores();
      }

      useAuthStore.setState({
        isAuthenticated: true,
        user: mappedUser,
        isLoading: false,
      });
      syncService.syncAll(mappedUser.id).catch(() => {});
      syncService.startRealtimeSubscription(mappedUser.id);
    }
  } else if (event === 'SIGNED_OUT') {
    syncService.stopRealtimeSubscription();
    purgeAllDomainStores();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      isLocked: false,
    });
  }
});

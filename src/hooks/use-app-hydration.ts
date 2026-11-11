import { useEffect, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { useTransactionsStore } from '../store/transactions-store';
import { useDebtsStore } from '../store/debts-store';
import { useCardsStore } from '../store/cards-store';
import { useSettingsStore } from '../store/settings-store';
import { syncService } from '../services/sync-service';

export const useAppHydration = (): boolean => {
  const [isHydrated, setIsHydrated] = useState<boolean>(() => {
    return (
      Boolean(useAuthStore.persist?.hasHydrated()) &&
      Boolean(useTransactionsStore.persist?.hasHydrated()) &&
      Boolean(useDebtsStore.persist?.hasHydrated()) &&
      Boolean(useCardsStore.persist?.hasHydrated()) &&
      Boolean(useSettingsStore.persist?.hasHydrated())
    );
  });

  useEffect(() => {
    if (isHydrated) return;

    const checkAllHydrated = (): void => {
      const allReady =
        Boolean(useAuthStore.persist?.hasHydrated()) &&
        Boolean(useTransactionsStore.persist?.hasHydrated()) &&
        Boolean(useDebtsStore.persist?.hasHydrated()) &&
        Boolean(useCardsStore.persist?.hasHydrated()) &&
        Boolean(useSettingsStore.persist?.hasHydrated());

      if (allReady) {
        setIsHydrated(true);
      }
    };

    checkAllHydrated();

    const unsubAuth = useAuthStore.persist?.onFinishHydration?.(checkAllHydrated);
    const unsubTx = useTransactionsStore.persist?.onFinishHydration?.(checkAllHydrated);
    const unsubDebts = useDebtsStore.persist?.onFinishHydration?.(checkAllHydrated);
    const unsubCards = useCardsStore.persist?.onFinishHydration?.(checkAllHydrated);
    const unsubSettings = useSettingsStore.persist?.onFinishHydration?.(checkAllHydrated);

    const safetyTimeout = setTimeout(() => {
      setIsHydrated(true);
    }, 1500);

    return () => {
      clearTimeout(safetyTimeout);
      unsubAuth?.();
      unsubTx?.();
      unsubDebts?.();
      unsubCards?.();
      unsubSettings?.();
    };
  }, [isHydrated]);

  // Sincronización silenciosa en background al completar la hidratación inicial
  useEffect(() => {
    if (!isHydrated) return;

    let isCancelled = false;

    const runInitialSync = async (): Promise<void> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isCancelled) return;

        const activeUserId = session?.user?.id || useAuthStore.getState().user?.id;
        if (activeUserId) {
          const [pendingDeletions, pendingChargeMutations] = await Promise.all([
            syncService.getPendingDeletions(),
            syncService.getPendingChargeMutations(),
          ]);
          if (isCancelled) return;

          const hasPendingLocalMutations =
            pendingDeletions.length > 0 ||
            Object.keys(pendingChargeMutations).length > 0 ||
            syncService.hasPendingBackgroundPush();

          if (hasPendingLocalMutations) {
            await syncService.syncAll(activeUserId, { silent: true }).catch(() => {});
          } else {
            await syncService.flushPendingDeletions(activeUserId).catch(() => {});
            if (isCancelled) return;
            await syncService.syncPull(activeUserId).catch(() => {});
          }

          if (isCancelled) return;
          syncService.startRealtimeSubscription(activeUserId);
        }
      } catch {
        // Silencioso en modo offline o ante fallas transitorias de sesión
      } finally {
        if (!isCancelled) {
          useDebtsStore
            .getState()
            .reconcileThirdPartyCurrentPeriod(
              useTransactionsStore.getState().transactions,
              new Date()
            );
        }
      }
    };

    void runInitialSync();

    return () => {
      isCancelled = true;
    };
  }, [isHydrated]);

  // Sincronización al Enfocar la Ventana (Focus Sync) en Web y Móvil
  useEffect(() => {
    if (!isHydrated) return;

    let isCancelled = false;
    let lastFocusSyncTimestamp = 0;
    const FOCUS_SYNC_COOLDOWN_MS = 6000;

    const triggerFocusSync = async (): Promise<void> => {
      const now = Date.now();
      if (now - lastFocusSyncTimestamp < FOCUS_SYNC_COOLDOWN_MS) {
        return;
      }
      if (syncService.isSyncing()) {
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (isCancelled || !session) {
          return;
        }

        const activeUserId = session.user?.id || useAuthStore.getState().user?.id;
        if (!activeUserId) {
          return;
        }

        lastFocusSyncTimestamp = now;
        await syncService.syncAll(activeUserId, { silent: true }).catch(() => {});
        if (isCancelled) return;
        syncService.startRealtimeSubscription(activeUserId);
      } catch {
        // Silencioso en modo offline o ante fallas transitorias de sesión
      } finally {
        if (!isCancelled) {
          useDebtsStore
            .getState()
            .reconcileThirdPartyCurrentPeriod(
              useTransactionsStore.getState().transactions,
              new Date()
            );
        }
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (nextAppState === 'active') {
        void triggerFocusSync();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    let removeWebListener: (() => void) | null = null;
    if (Platform.OS === 'web') {
      const onWindowFocus = (): void => {
        void triggerFocusSync();
      };

      const onVisibilityChange = (): void => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          void triggerFocusSync();
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            syncService.startRealtimeSubscription(currentUser.id);
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('focus', onWindowFocus);
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibilityChange);
      }

      removeWebListener = (): void => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('focus', onWindowFocus);
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      };
    }

    return () => {
      isCancelled = true;
      appStateSubscription.remove();
      if (removeWebListener) {
        removeWebListener();
      }
    };
  }, [isHydrated]);

  return isHydrated;
};

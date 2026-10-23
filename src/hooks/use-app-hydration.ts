import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { useTransactionsStore } from '../store/transactions-store';
import { useDebtsStore } from '../store/debts-store';
import { useCardsStore } from '../store/cards-store';
import { useSettingsStore } from '../store/settings-store';

export const useAppHydration = (): boolean => {
  const [isHydrated, setIsHydrated] = useState<boolean>(() => {
    return (
      useAuthStore.persist?.hasHydrated() &&
      useTransactionsStore.persist?.hasHydrated() &&
      useDebtsStore.persist?.hasHydrated() &&
      useCardsStore.persist?.hasHydrated() &&
      useSettingsStore.persist?.hasHydrated()
    );
  });

  useEffect(() => {
    if (isHydrated) return;

    const checkAllHydrated = (): void => {
      const allReady =
        useAuthStore.persist?.hasHydrated() &&
        useTransactionsStore.persist?.hasHydrated() &&
        useDebtsStore.persist?.hasHydrated() &&
        useCardsStore.persist?.hasHydrated() &&
        useSettingsStore.persist?.hasHydrated();

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

  return isHydrated;
};

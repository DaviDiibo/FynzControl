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

export interface Bank {
  id: string;
  name: string;
  initialBalance?: number; // Saldo base o dinero disponible en cuenta
  createdAt: string;
}

export interface CreditCard {
  id: string;
  name: string; // ej: 'Visa Infinite'
  bankName: string; // ej: 'Banco Santander'
  closingDay?: number; // 1 a 31, Día de cierre de factura
  paymentDay?: number; // 1 a 31, Día límite de pago / vencimiento
  cutOffDay?: number; // 1 a 31, compatibilidad retroactiva
  lastFourDigits?: string; // ej: '4589'
  creditLimit?: number; // ej: 5000
  color?: string; // ej: '#00FFA3' o '#0A84FF'
  isDefault?: boolean;
  createdAt: string;
}

export interface CardsState {
  banks: Bank[];
  cards: CreditCard[];
  isLoading?: boolean;
  error?: string | null;
  addBank: (name: string, initialBalance?: number) => Bank;
  updateBank: (id: string, name: string) => void;
  setBankBalance: (id: string, balance: number) => void;
  deleteBank: (id: string) => void;
  addCard: (card: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, card: Partial<CreditCard>) => void;
  setDefaultCard: (id: string) => void;
  deleteCard: (id: string) => void;
  getCardById: (id: string) => CreditCard | undefined;
  resetCardsStore: () => void;
}

const INITIAL_BANKS: Bank[] = [];

const INITIAL_CARDS: CreditCard[] = [];

export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      banks: INITIAL_BANKS,
      cards: INITIAL_CARDS,
      isLoading: false,
      error: null,

      addBank: (name: string, initialBalance?: number): Bank => {
        const trimmed = name.trim();
        const sanitizedBalance =
          initialBalance !== undefined && !isNaN(Number(initialBalance))
            ? Number(initialBalance)
            : undefined;
        const existing = (get().banks || []).find(
          (b) => b.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) {
          if (sanitizedBalance !== undefined) {
            get().setBankBalance(existing.id, sanitizedBalance);
          }
          return existing;
        }
        const newBank: Bank = {
          id: Date.now().toString(),
          name: trimmed,
          initialBalance: sanitizedBalance,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          banks: [...(state.banks || []), newBank],
        }));
        return newBank;
      },

      setBankBalance: (id: string, balance: number): void => {
        const sanitized = Number(balance) || 0;
        set((state) => ({
          banks: (state.banks || []).map((b) =>
            b.id === id ? { ...b, initialBalance: sanitized } : b
          ),
        }));
      },

      updateBank: (id: string, name: string): void => {
        const trimmed = name.trim();
        if (!trimmed) {
          return;
        }

        const currentBank = (get().banks || []).find((b) => b.id === id);
        if (!currentBank || currentBank.name === trimmed) {
          return;
        }

        const oldNameLower = currentBank.name.trim().toLowerCase();

        set((state) => ({
          banks: (state.banks || []).map((b) =>
            b.id === id ? { ...b, name: trimmed } : b
          ),
          cards: (state.cards || []).map((c) =>
            c.bankName.trim().toLowerCase() === oldNameLower
              ? { ...c, bankName: trimmed }
              : c
          ),
        }));
      },

      deleteBank: (id: string): void =>
        set((state) => ({
          banks: (state.banks || []).filter((b) => b.id !== id),
        })),

      addCard: (card: Omit<CreditCard, 'id' | 'createdAt'>) =>
        set((state) => {
          const isFirstCard = state.cards.length === 0;
          const shouldBeDefault = isFirstCard || !!card.isDefault;
          const closingDay = card.closingDay ?? card.cutOffDay ?? 20;
          const paymentDay = card.paymentDay ?? card.cutOffDay ?? 5;
          const cutOffDay = card.cutOffDay ?? card.paymentDay ?? closingDay;
          const newCard: CreditCard = {
            ...card,
            closingDay,
            paymentDay,
            cutOffDay,
            isDefault: shouldBeDefault,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          };
          const existingCards = shouldBeDefault
            ? state.cards.map((c) => ({ ...c, isDefault: false }))
            : state.cards;

          return {
            cards: [newCard, ...existingCards],
          };
        }),

      updateCard: (id: string, cardUpdate: Partial<CreditCard>) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, ...cardUpdate } : c
          ),
        })),

      setDefaultCard: (id: string): void => {
        set((state) => ({
          cards: state.cards.map((c) => ({
            ...c,
            isDefault: c.id === id,
          })),
        }));
      },

      deleteCard: (id: string) =>
        set((state) => {
          const cardToDelete = state.cards.find((c) => c.id === id);
          const remainingCards = state.cards.filter((c) => c.id !== id);
          if (cardToDelete?.isDefault && remainingCards.length > 0) {
            remainingCards[0] = { ...remainingCards[0], isDefault: true };
          }
          return {
            cards: remainingCards,
          };
        }),

      getCardById: (id: string): CreditCard | undefined => {
        return get().cards.find((c) => c.id === id);
      },

      resetCardsStore: (): void => {
        set({ cards: [], banks: [], isLoading: false, error: null });
      },
    }),
    {
      name: 'controlfynz-cards-storage',
      storage: createJSONStorage(() => safeStorage),
      merge: (persistedState, currentState): CardsState => {
        const state = (persistedState && typeof persistedState === 'object' ? persistedState : {}) as Partial<CardsState>;
        const persistedCards = state.cards;
        let mergedCards = Array.isArray(persistedCards)
          ? persistedCards.map((c) => ({
              ...c,
              closingDay: c.closingDay ?? c.cutOffDay ?? 20,
              paymentDay: c.paymentDay ?? c.cutOffDay ?? 5,
              cutOffDay: c.cutOffDay ?? c.paymentDay ?? c.closingDay ?? 20,
            }))
          : currentState.cards;

        if (mergedCards && mergedCards.length > 0) {
          const hasDefault = mergedCards.some((c) => c.isDefault);
          if (!hasDefault) {
            mergedCards = mergedCards.map((c, idx) => ({
              ...c,
              isDefault: idx === 0,
            }));
          }
        }

        return {
          ...currentState,
          ...state,
          cards: mergedCards,
          banks: Array.isArray(state.banks)
            ? state.banks
            : currentState.banks,
        };
      },
    }
  )
);

export const resetCardsStore = (): void => {
  useCardsStore.getState().resetCardsStore();
};

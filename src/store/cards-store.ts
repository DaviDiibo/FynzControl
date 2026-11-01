import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safe-storage';

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

export type Card = CreditCard;

export type CardSyncHandlers = {
  onCardAdded?: (card: CreditCard) => void;
  onCardUpdated?: (card: CreditCard) => void;
  onCardDeleted?: (cardId: string) => void;
  onBankAdded?: (bank: Bank) => void;
  onBankUpdated?: (bank: Bank) => void;
  onBankDeleted?: (bankId: string) => void;
};

let syncHandlers: CardSyncHandlers = {};

export const setCardSyncHandlers = (handlers: CardSyncHandlers): void => {
  syncHandlers = handlers;
};

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
        syncHandlers.onBankAdded?.(newBank);
        return newBank;
      },

      setBankBalance: (id: string, balance: number): void => {
        const sanitized = Number(balance) || 0;
        const currentBank = (get().banks || []).find((b) => b.id === id);
        if (!currentBank) return;
        const updatedBank: Bank = { ...currentBank, initialBalance: sanitized };
        set((state) => ({
          banks: (state.banks || []).map((b) =>
            b.id === id ? updatedBank : b
          ),
        }));
        syncHandlers.onBankUpdated?.(updatedBank);
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
        const updatedBank: Bank = { ...currentBank, name: trimmed };

        set((state) => ({
          banks: (state.banks || []).map((b) =>
            b.id === id ? updatedBank : b
          ),
          cards: (state.cards || []).map((c) =>
            c.bankName.trim().toLowerCase() === oldNameLower
              ? { ...c, bankName: trimmed }
              : c
          ),
        }));
        syncHandlers.onBankUpdated?.(updatedBank);
      },

      deleteBank: (id: string): void => {
        set((state) => ({
          banks: (state.banks || []).filter((b) => b.id !== id),
        }));
        syncHandlers.onBankDeleted?.(id);
      },

      addCard: (card: Omit<CreditCard, 'id' | 'createdAt'>): void => {
        let addedCard: CreditCard | null = null;
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
          addedCard = newCard;
          const existingCards = shouldBeDefault
            ? state.cards.map((c) => ({ ...c, isDefault: false }))
            : state.cards;

          return {
            cards: [newCard, ...existingCards],
          };
        });
        if (addedCard) {
          syncHandlers.onCardAdded?.(addedCard);
        }
      },

      updateCard: (id: string, cardUpdate: Partial<CreditCard>): void => {
        let updatedCard: CreditCard | null = null;
        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id === id) {
              updatedCard = { ...c, ...cardUpdate };
              return updatedCard;
            }
            return c;
          }),
        }));
        if (updatedCard) {
          syncHandlers.onCardUpdated?.(updatedCard);
        }
      },

      setDefaultCard: (id: string): void => {
        let defaultCard: CreditCard | null = null;
        set((state) => ({
          cards: state.cards.map((c) => {
            const isTarget = c.id === id;
            if (isTarget) {
              defaultCard = { ...c, isDefault: true };
            }
            return {
              ...c,
              isDefault: isTarget,
            };
          }),
        }));
        if (defaultCard) {
          syncHandlers.onCardUpdated?.(defaultCard);
        }
      },

      deleteCard: (id: string): void => {
        let promotedDefaultCard: CreditCard | null = null;
        set((state) => {
          const cardToDelete = state.cards.find((c) => c.id === id);
          const remainingCards = state.cards.filter((c) => c.id !== id);
          if (cardToDelete?.isDefault && remainingCards.length > 0) {
            promotedDefaultCard = { ...remainingCards[0], isDefault: true };
            remainingCards[0] = promotedDefaultCard;
          }
          return {
            cards: remainingCards,
          };
        });
        syncHandlers.onCardDeleted?.(id);
        if (promotedDefaultCard) {
          syncHandlers.onCardUpdated?.(promotedDefaultCard);
        }
      },

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

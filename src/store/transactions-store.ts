import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { useDebtsStore, type ThirdPartyChargeAllocation } from './debts-store';
import { useCardsStore } from './cards-store';

export type TransactionSyncHandlers = {
  onTransactionAdded?: () => void;
  onTransactionDeleted?: (id: string) => void;
};

let syncHandlers: TransactionSyncHandlers = {};

export const setTransactionSyncHandlers = (handlers: TransactionSyncHandlers): void => {
  syncHandlers = handlers;
};

// Memoria fallback en caso de retraso o indisponibilidad en enlace nativo
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

export type TransactionType = 'income' | 'expense' | 'reimbursement' | 'card_payment';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  date: string; // ISO string
  createdAt?: string; // ISO string
  dateFormatted: string; // ej: "Hoy, 14:30" o "10 Oct 2026"
  dateGroup: string; // ej: "Hoy, 10 de Octubre"
  personName?: string; // Para reembolsos
  cardName?: string; // Para reembolsos o compras con tarjeta
  notes?: string;
  relatedLoanId?: string;
  relatedDebtId?: string;
  relatedChargeId?: string;
  relatedPersonId?: string;
  relatedPersonName?: string;
  paymentMethod?: 'cash_debit' | 'credit_card';
  cardId?: string;
  bankId?: string;
  installmentsCount?: number;
  debtPaymentMode?: 'next' | 'last';
  nominalDebtAmount?: number;
  debtInstallmentsPaid?: number;
  debtDiscountSaved?: number;
  paymentTarget?: 'statement' | 'partial' | 'total';
  thirdPartyAllocations?: ThirdPartyChargeAllocation[];
}

export interface CreateTransactionDTO {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date?: string;
  personName?: string;
  cardName?: string;
  notes?: string;
  relatedLoanId?: string;
  relatedDebtId?: string;
  relatedChargeId?: string;
  relatedPersonId?: string;
  relatedPersonName?: string;
  paymentMethod?: 'cash_debit' | 'credit_card';
  cardId?: string;
  bankId?: string;
  installmentsCount?: number;
  debtPaymentMode?: 'next' | 'last';
  nominalDebtAmount?: number;
  debtInstallmentsPaid?: number;
  debtDiscountSaved?: number;
  paymentTarget?: 'statement' | 'partial' | 'total';
  thirdPartyAllocations?: ThirdPartyChargeAllocation[];
}

export interface TransactionsState {
  transactions: Transaction[];
  addTransaction: (data: CreateTransactionDTO) => void;
  deleteTransaction: (id: string) => void;
  removeInitialLoanTransactions: (params: { debtId?: string; loanId?: string }) => void;
  clearAllTransactions: () => void;
  getTotalIncome: () => number;
  getTotalExpense: () => number;
  getNetBalance: () => number;
  getCurrentMonthIncome: () => number;
  getCurrentMonthExpense: () => number;
  getCurrentMonthNetBalance: () => number;
  getBankComputedBalance: (bankId: string, baseBalance?: number) => number;
  getBankCustodyAmount: (bankId: string, unpaidCardIds?: string[]) => number;
}

const INITIAL_TRANSACTIONS: Transaction[] = [];

const SPANISH_MONTHS: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const resolveIcon = (
  type: TransactionType,
  categoryIdentifier: string
): keyof typeof Ionicons.glyphMap => {
  if (type === 'card_payment') {
    return 'card-outline';
  }
  if (type === 'reimbursement') {
    return 'people-circle-outline';
  }
  if (categoryIdentifier === 'Desembolso Préstamo') {
    return 'cash-outline';
  }
  if (categoryIdentifier === 'Préstamo Otorgado') {
    return 'paper-plane-outline';
  }
  if (categoryIdentifier === 'Cobro Préstamo') {
    return 'trending-up-outline';
  }

  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const found = allCategories.find(
    (c) => c.id === categoryIdentifier || c.name === categoryIdentifier
  );

  if (found) {
    return found.icon;
  }

  return type === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline';
};

const resolveCategoryName = (
  type: TransactionType,
  categoryIdentifier: string
): string => {
  if (type === 'card_payment') {
    return categoryIdentifier && categoryIdentifier !== 'card_payment'
      ? categoryIdentifier
      : 'Pago Tarjeta';
  }
  if (type === 'reimbursement') {
    return categoryIdentifier && categoryIdentifier !== 'reimbursement'
      ? categoryIdentifier
      : 'Reembolso';
  }

  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const found = allCategories.find(
    (c) => c.id === categoryIdentifier || c.name === categoryIdentifier
  );

  return found ? found.name : categoryIdentifier;
};

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set, get) => ({
      transactions: INITIAL_TRANSACTIONS,

      addTransaction: (data: CreateTransactionDTO): void => {
        const now = data.date ? new Date(data.date) : new Date();
        const nowIso = now.toISOString();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const monthName = SPANISH_MONTHS[now.getMonth()];

        const dateFormatted = `Hoy, ${hours}:${minutes}`;
        const dateGroup = `Hoy, ${day} de ${monthName}`;
        const icon = resolveIcon(data.type, data.category);
        const category = resolveCategoryName(data.type, data.category);
        const resolvedPersonName = data.relatedPersonName || data.personName;

        const newTransaction: Transaction = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: data.title,
          amount: data.amount,
          type: data.type,
          category,
          icon,
          date: nowIso,
          createdAt: nowIso,
          dateFormatted,
          dateGroup,
          personName: resolvedPersonName,
          cardName: data.cardName,
          notes: data.notes,
          relatedLoanId: data.relatedLoanId,
          relatedDebtId: data.relatedDebtId,
          relatedChargeId: data.relatedChargeId,
          relatedPersonId: data.relatedPersonId,
          relatedPersonName: resolvedPersonName,
          paymentMethod: data.paymentMethod,
          cardId: data.cardId,
          bankId: data.bankId,
          installmentsCount: data.installmentsCount,
          debtPaymentMode: data.debtPaymentMode,
          nominalDebtAmount: data.nominalDebtAmount,
          debtInstallmentsPaid: data.debtInstallmentsPaid,
          debtDiscountSaved: data.debtDiscountSaved,
          paymentTarget: data.paymentTarget,
          thirdPartyAllocations: data.thirdPartyAllocations,
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));
        syncHandlers.onTransactionAdded?.();
      },

      deleteTransaction: (id: string): void => {
        const tx = get().transactions.find((t) => t.id === id);
        if (tx) {
          if (tx.thirdPartyAllocations && tx.thirdPartyAllocations.length > 0) {
            useDebtsStore.getState().revertThirdPartyAllocations(tx.thirdPartyAllocations);
          } else if (tx.relatedChargeId) {
            useDebtsStore.getState().revertThirdPartyChargeCollection(tx.relatedChargeId, tx.amount);
          } else if (
            (tx.type === 'reimbursement' ||
              tx.category === 'Cobro Tarjeta Compartida' ||
              tx.category === 'Reembolso') &&
            (tx.relatedPersonName || tx.personName)
          ) {
            const targetPerson = tx.relatedPersonName || tx.personName;
            if (targetPerson) {
              useDebtsStore.getState().revertThirdPartyPersonAbono(targetPerson, tx.amount);
            }
          }

          if (tx.relatedLoanId && tx.type === 'income') {
            useDebtsStore.getState().revertFriendLoanCollection(tx.relatedLoanId, tx.amount);
          } else if (tx.type === 'income' && tx.category === 'Cobro Préstamo') {
            const loans = useDebtsStore.getState().friendLoans;
            const match =
              loans.find(
                (l) =>
                  (tx.personName && l.friendName.toLowerCase().trim() === tx.personName.toLowerCase().trim()) ||
                  tx.title.toLowerCase().includes(l.friendName.toLowerCase().trim())
              ) || (loans.length === 1 ? loans[0] : undefined);
            if (match) {
              useDebtsStore.getState().revertFriendLoanCollection(match.id, tx.amount);
            }
          }

          const revertOptions = {
            mode: tx.debtPaymentMode,
            installmentsCount: tx.debtInstallmentsPaid,
            nominalAmountExtinguished: tx.nominalDebtAmount,
            discountSaved: tx.debtDiscountSaved,
          };

          if (tx.relatedDebtId && tx.type === 'expense') {
            useDebtsStore.getState().revertPersonalDebtPayment(tx.relatedDebtId, tx.amount, revertOptions);
          } else if (tx.type === 'expense' && tx.category === 'Pago Deudas') {
            const debts = useDebtsStore.getState().personalDebts;
            const match =
              debts.find(
                (d) =>
                  tx.title.toLowerCase().includes(d.title.toLowerCase().trim()) ||
                  d.title.toLowerCase().includes(tx.title.toLowerCase().trim())
              ) || (debts.length === 1 ? debts[0] : undefined);
            if (match) {
              useDebtsStore.getState().revertPersonalDebtPayment(match.id, tx.amount, revertOptions);
            }
          }
        }

        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
        syncHandlers.onTransactionDeleted?.(id);
      },

      removeInitialLoanTransactions: ({ debtId, loanId }): void => {
        const toRemove = get().transactions.filter(
          (t) =>
            (debtId && t.relatedDebtId === debtId && t.type === 'income' && t.category === 'Desembolso Préstamo') ||
            (loanId && t.relatedLoanId === loanId && t.type === 'expense' && t.category === 'Préstamo Otorgado')
        );
        toRemove.forEach((t) => {
          syncHandlers.onTransactionDeleted?.(t.id);
        });

        set((state) => ({
          transactions: state.transactions.filter((t) => {
            if (debtId && t.relatedDebtId === debtId && t.type === 'income' && t.category === 'Desembolso Préstamo') {
              return false;
            }
            if (loanId && t.relatedLoanId === loanId && t.type === 'expense' && t.category === 'Préstamo Otorgado') {
              return false;
            }
            return true;
          }),
        }));
      },

      getTotalIncome: (): number => {
        return get()
          .transactions.filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getTotalExpense: (): number => {
        return get()
          .transactions.filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getNetBalance: (): number => {
        return get().getTotalIncome() - get().getTotalExpense();
      },

      getCurrentMonthIncome: (): number => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return get()
          .transactions.filter((t) => {
            if (t.type !== 'income') {
              return false;
            }
            const txDate = new Date(t.date);
            return (
              txDate.getMonth() === currentMonth &&
              txDate.getFullYear() === currentYear
            );
          })
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getCurrentMonthExpense: (): number => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const cards = useCardsStore.getState().cards;

        return get()
          .transactions.filter((t) => {
            if (t.type !== 'expense') {
              return false;
            }
            const txDate = new Date(t.date);

            if (t.paymentMethod === 'credit_card') {
              const card = cards.find((c) => c.id === t.cardId);
              const closingDay = card?.closingDay ?? 20;
              const d = txDate.getDate();
              const m = txDate.getMonth();
              const y = txDate.getFullYear();

              let billMonth = m;
              let billYear = y;
              if (d >= closingDay) {
                billMonth = m + 1;
                if (billMonth > 11) {
                  billMonth = 0;
                  billYear = y + 1;
                }
              }

              return billMonth === currentMonth && billYear === currentYear;
            }

            return (
              txDate.getMonth() === currentMonth &&
              txDate.getFullYear() === currentYear
            );
          })
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getCurrentMonthNetBalance: (): number => {
        return get().getCurrentMonthIncome() - get().getCurrentMonthExpense();
      },

      getBankComputedBalance: (bankId: string, baseBalance?: number): number => {
        return getBankComputedBalance(get().transactions, bankId, baseBalance);
      },

      getBankCustodyAmount: (bankId: string, unpaidCardIds?: string[]): number => {
        return getBankCustodyAmount(get().transactions, bankId, unpaidCardIds);
      },

      clearAllTransactions: (): void => {
        set({ transactions: [] });
      },
    }),
    {
      name: 'controlfynz-transactions-storage-v2',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

export const getBankComputedBalance = (
  transactions: Transaction[],
  bankId: string,
  baseBalance?: number
): number => {
  const base = baseBalance ?? 0;
  return transactions.reduce((acc, tx) => {
    if (tx.bankId !== bankId) {
      return acc;
    }
    if (tx.type === 'income' || tx.type === 'reimbursement') {
      return acc + tx.amount;
    }
    if (tx.type === 'expense' || tx.type === 'card_payment') {
      return acc - tx.amount;
    }
    return acc;
  }, base);
};

export const getBankCustodyAmount = (
  transactions: Transaction[],
  bankId: string,
  unpaidCardIds?: string[]
): number => {
  if (unpaidCardIds && unpaidCardIds.length === 0) {
    return 0;
  }

  const cards = useCardsStore.getState().cards;

  const resolveKey = (tx: Transaction): { id?: string; name?: string; key: string } | null => {
    let id = tx.cardId;
    let name = tx.cardName;

    if (!id && name) {
      const found = cards.find(
        (c) => c.name.toLowerCase().trim() === name?.toLowerCase().trim()
      );
      if (found) {
        id = found.id;
        name = found.name;
      }
    } else if (id && !name) {
      const found = cards.find((c) => c.id === id);
      if (found) {
        name = found.name;
      }
    }

    const key = id || name;
    if (!key) {
      return null;
    }

    return { id, name, key };
  };

  type CardCustodyEntry = {
    id?: string;
    name?: string;
    reimbursed: number;
    paid: number;
  };

  const cardMap = new Map<string, CardCustodyEntry>();

  for (const tx of transactions) {
    if (tx.bankId !== bankId) {
      continue;
    }

    const resolved = resolveKey(tx);
    if (!resolved) {
      continue;
    }

    const existing = cardMap.get(resolved.key) ?? {
      id: resolved.id,
      name: resolved.name,
      reimbursed: 0,
      paid: 0,
    };

    if (resolved.id && !existing.id) existing.id = resolved.id;
    if (resolved.name && !existing.name) existing.name = resolved.name;

    if (tx.type === 'reimbursement') {
      existing.reimbursed += tx.amount;
    } else if (tx.type === 'card_payment') {
      existing.paid += tx.amount;
    }

    cardMap.set(resolved.key, existing);
  }

  let totalCustody = 0;

  for (const entry of cardMap.values()) {
    if (unpaidCardIds) {
      const isUnpaid = unpaidCardIds.some((uid) => {
        const norm = uid.toLowerCase().trim();
        const matchesId = entry.id ? entry.id.toLowerCase().trim() === norm : false;
        const matchesName = entry.name ? entry.name.toLowerCase().trim() === norm : false;
        return matchesId || matchesName;
      });

      if (!isUnpaid) {
        continue;
      }
    }

    const remainingCustody = Math.max(0, entry.reimbursed - entry.paid);
    totalCustody += remainingCustody;
  }

  return totalCustody;
};

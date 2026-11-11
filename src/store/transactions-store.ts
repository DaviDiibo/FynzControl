import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { useDebtsStore, type ThirdPartyChargeAllocation } from './debts-store';
import { useCardsStore } from './cards-store';
import { safeStorage } from './safe-storage';
import { toDeterministicUuid } from '../lib/sync-adapters';

export type TransactionSyncHandlers = {
  onTransactionAdded?: () => void;
  onTransactionDeleted?: (id: string) => void;
};

let syncHandlers: TransactionSyncHandlers = {};

export const setTransactionSyncHandlers = (handlers: TransactionSyncHandlers): void => {
  syncHandlers = handlers;
};

const isSameId = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  return toDeterministicUuid(a) === toDeterministicUuid(b);
};

const isSameBankId = isSameId;

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
        let resolvedPersonName = data.relatedPersonName || data.personName;
        let resolvedPersonId = data.relatedPersonId;

        if (data.type === 'reimbursement') {
          const people = useDebtsStore.getState().people;
          if (!resolvedPersonName && resolvedPersonId) {
            const matchedById = people.find((p) => isSameId(p.id, resolvedPersonId));
            if (matchedById) {
              resolvedPersonName = matchedById.name;
            }
          } else if (resolvedPersonName && !resolvedPersonId) {
            const targetNorm = resolvedPersonName.trim().toLowerCase();
            const matchedByName = people.find(
              (p) => p.name.trim().toLowerCase() === targetNorm
            );
            if (matchedByName) {
              resolvedPersonId = matchedByName.id;
            }
          }
        }

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
          relatedPersonId: resolvedPersonId,
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
        const allTransactions = get().transactions;
        const tx = allTransactions.find((t) => t.id === id);
        if (tx) {
          const remainingTransactions = allTransactions.filter((t) => t.id !== id);
          const debtsStore = useDebtsStore.getState();

          const resolveTargetPerson = (): string | undefined => {
            let targetPerson = tx.relatedPersonName || tx.personName;
            if (!targetPerson && tx.relatedPersonId) {
              targetPerson = debtsStore.people.find((p) => isSameId(p.id, tx.relatedPersonId))?.name;
            }
            if (!targetPerson && (tx.title || tx.notes)) {
              const titleLower = (tx.title ?? '').toLowerCase();
              const notesLower = (tx.notes ?? '').toLowerCase();
              const sortedPeople = [...debtsStore.people].sort(
                (a, b) => (b.name ?? '').trim().length - (a.name ?? '').trim().length
              );
              const peopleMatch = sortedPeople.find((p) => {
                const nameLower = (p.name ?? '').toLowerCase().trim();
                return Boolean(nameLower) && (titleLower.includes(nameLower) || notesLower.includes(nameLower));
              });
              if (peopleMatch) {
                targetPerson = peopleMatch.name;
              } else {
                const sortedCharges = [...debtsStore.thirdPartyCharges].sort(
                  (a, b) => (b.personName ?? '').trim().length - (a.personName ?? '').trim().length
                );
                const chargeMatch = sortedCharges.find((c) => {
                  const nameLower = (c.personName ?? '').toLowerCase().trim();
                  return Boolean(nameLower) && (titleLower.includes(nameLower) || notesLower.includes(nameLower));
                });
                if (chargeMatch) {
                  targetPerson = chargeMatch.personName;
                }
              }
            }
            return targetPerson;
          };

          const isThirdPartyReimbursement =
            tx.type === 'reimbursement' ||
            tx.category === 'Cobro Tarjeta Compartida' ||
            tx.category === 'Reembolso' ||
            (tx.type === 'income' &&
              !tx.relatedLoanId &&
              !tx.relatedDebtId &&
              tx.category !== 'Cobro Préstamo' &&
              tx.category !== 'Desembolso Préstamo' &&
              Boolean(tx.relatedPersonName || tx.personName || tx.relatedPersonId));

          const revertByPersonFallback = (): void => {
            const targetPerson = resolveTargetPerson();
            if (targetPerson) {
              debtsStore.revertThirdPartyPersonAbono(
                targetPerson,
                tx.amount,
                remainingTransactions,
                tx.date
              );
            } else if (tx.relatedPersonId) {
              debtsStore.revertThirdPartyPersonAbono(
                tx.relatedPersonId,
                tx.amount,
                remainingTransactions,
                tx.date
              );
            }
          };

          if (tx.thirdPartyAllocations && tx.thirdPartyAllocations.length > 0) {
            const didRevert = debtsStore.revertThirdPartyAllocations(
              tx.thirdPartyAllocations,
              remainingTransactions,
              tx.date
            );
            if (!didRevert) {
              if (
                tx.relatedChargeId &&
                debtsStore.thirdPartyCharges.some((c) => isSameId(c.id, tx.relatedChargeId))
              ) {
                debtsStore.revertThirdPartyChargeAbono(
                  tx.relatedChargeId,
                  tx.amount,
                  remainingTransactions,
                  tx.date
                );
              } else {
                revertByPersonFallback();
              }
            }
          } else if (tx.relatedChargeId && tx.type !== 'expense' && tx.type !== 'card_payment') {
            if (typeof debtsStore.revertThirdPartyChargeAbono === 'function') {
              debtsStore.revertThirdPartyChargeAbono(
                tx.relatedChargeId,
                tx.amount,
                remainingTransactions,
                tx.date
              );
            } else {
              debtsStore.revertThirdPartyChargeCollection(
                tx.relatedChargeId,
                tx.amount,
                remainingTransactions,
                tx.date
              );
            }
          } else if (isThirdPartyReimbursement) {
            revertByPersonFallback();
          }

          if (tx.relatedLoanId && tx.type === 'income') {
            useDebtsStore.getState().revertFriendLoanCollection(tx.relatedLoanId, tx.amount);
          } else if (tx.type === 'income' && tx.category === 'Cobro Préstamo') {
            const loans = useDebtsStore.getState().friendLoans;
            const match =
              loans.find(
                (l) =>
                  (Boolean(tx.personName) && (l.friendName ?? '').toLowerCase().trim() === (tx.personName ?? '').toLowerCase().trim()) ||
                  (Boolean(l.friendName) && (tx.title ?? '').toLowerCase().includes((l.friendName ?? '').toLowerCase().trim()))
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
                  (Boolean(d.title) && (tx.title ?? '').toLowerCase().includes((d.title ?? '').toLowerCase().trim())) ||
                  (Boolean(tx.title) && (d.title ?? '').toLowerCase().includes((tx.title ?? '').toLowerCase().trim()))
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
          .transactions.filter((t) => t.type === 'income' || t.type === 'reimbursement')
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
            if (t.type !== 'income' && t.type !== 'reimbursement') {
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

        const total = get().transactions.reduce((sum, t): number => {
          if (t.type !== 'expense') {
            return sum;
          }
          const txDate = new Date(t.date);
          if (isNaN(txDate.getTime())) {
            return sum;
          }

          if (t.paymentMethod === 'credit_card') {
            const card = cards.find(
              (c) =>
                c.id === t.cardId ||
                (Boolean(t.cardName) && (c.name ?? '').toLowerCase().trim() === (t.cardName ?? '').toLowerCase().trim())
            );
            const closingDay = card?.closingDay ?? card?.cutOffDay ?? 20;
            const d = txDate.getDate();
            const m = txDate.getMonth();
            const y = txDate.getFullYear();

            const maxDaysInMonth = new Date(y, m + 1, 0).getDate();
            const effectiveClosingDay = Math.min(Math.max(1, closingDay), maxDaysInMonth);

            let firstBillMonth = m;
            let firstBillYear = y;
            if (d >= effectiveClosingDay) {
              firstBillMonth = m + 1;
              if (firstBillMonth > 11) {
                firstBillMonth = 0;
                firstBillYear = y + 1;
              }
            }

            const monthsDiff = (currentYear - firstBillYear) * 12 + (currentMonth - firstBillMonth);

            if (t.installmentsCount && t.installmentsCount > 1) {
              if (monthsDiff >= 0 && monthsDiff < t.installmentsCount) {
                const monthlyQuota = Math.round(((t.amount ?? 0) / t.installmentsCount) * 100) / 100;
                return sum + monthlyQuota;
              }
              return sum;
            }

            if (monthsDiff === 0) {
              return sum + (t.amount ?? 0);
            }

            return sum;
          }

          if (
            txDate.getMonth() === currentMonth &&
            txDate.getFullYear() === currentYear
          ) {
            return sum + (t.amount ?? 0);
          }

          return sum;
        }, 0);

        return Math.round(total * 100) / 100;
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
    if (!isSameBankId(tx.bankId, bankId)) {
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
        (c) => (c.name ?? '').toLowerCase().trim() === (name ?? '').toLowerCase().trim()
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
    if (!isSameBankId(tx.bankId, bankId)) {
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
        const norm = (uid ?? '').toLowerCase().trim();
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

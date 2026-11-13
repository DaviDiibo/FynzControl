import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Ionicons } from '@expo/vector-icons';
import { toDeterministicUuid } from '../lib/sync-adapters';
import { safeStorage } from './safe-storage';

export type DebtSyncHandlers = {
  onDebtAddedOrUpdated?: () => void;
  onPersonalDebtDeleted?: (id: string) => void;
  onFriendLoanDeleted?: (id: string) => void;
  onThirdPartyChargeDeleted?: (id: string) => void;
  onPersonDeleted?: (id: string) => void;
};

let debtSyncHandlers: DebtSyncHandlers = {};

export const setDebtSyncHandlers = (handlers: DebtSyncHandlers): void => {
  debtSyncHandlers = handlers;
};

export type DebtCategory = 'credit_card' | 'loan' | 'mortgage' | 'other';
export type DebtType = 'credit_card' | 'installment_loan';
export type DebtDirection = 'i_owe' | 'they_owe_me'; // 'i_owe' = Deuda propia; 'they_owe_me' = Préstamo dado a tercero

export interface PersonalDebt {
  id: string;
  title: string;
  entity: string; // ej: 'Banco Santander', 'BBVA'
  category: DebtCategory;
  debtType?: DebtType;
  cardPaymentType?: 'full_statement' | 'installments';
  cardId?: string; // Si está vinculada a una CreditCard de useCardsStore
  creditCardId?: string; // Alias para vinculación a tarjeta de crédito
  bankId?: string; // ID de banco vinculado opcional
  principalAmount?: number; // Capital original desembolsado por el banco
  isPreexisting?: boolean; // Si fue registrada como deuda antigua/preexistente
  totalAmount: number;
  remainingAmount: number;
  dueDay?: number; // Día de corte mensual 1-31
  dueDate: string; // Formato amigable ej: 'Día 20 de cada mes'
  interestRate?: number; // % anual o tasa mensual
  monthlyPayment?: number; // Cuota sugerida
  totalInstallments?: number; // Para préstamos: total de cuotas pactadas (ej: 24)
  paidInstallments?: number; // Cuotas ya pagadas (ej: 0)
  initialPaidInstallments?: number; // Cuotas históricas previas antes de registrar en la app
  prepaidLastInstallments?: number; // Cantidad de últimas cuotas adelantadas desde el final
  totalDiscountSaved?: number; // Total de dinero ahorrado por descuentos en cuotas
  totalActualPaid?: number; // Total realmente desembolsado del bolsillo del usuario
  settled?: boolean;
  settledAt?: string;
  lastPaymentDate?: string; // ISO 8601
  icon: keyof typeof Ionicons.glyphMap;
  createdAt: string; // ISO 8601
  deletedAt?: string;
}

export interface PersonContact {
  id: string;
  name: string;
  createdAt: string;
  deletedAt?: string;
}

export interface ThirdPartyCardCharge {
  id: string;
  personName: string;
  personId?: string;
  cardName: string;
  cardId?: string;
  concept: string;
  amount: number;             // Total original
  totalAmount: number;        // Total original
  remainingAmount: number;     // Saldo total pendiente acumulado
  installmentsCount: number;  // 1 para mes actual, o N cuotas
  monthlyInstallmentAmount: number; // amount / installmentsCount
  currentPeriodPaidAmount: number;  // Lo abonado en el ciclo del mes actual
  paidInstallmentsCount: number;    // Cuántas cuotas van cubiertas
  initialPaidInstallments?: number; // Cuotas pagadas preexistentes antes de registrar
  isPreexisting?: boolean;          // Si fue registrada como compra preexistente
  lastPaymentDate?: string;
  date: string;
  settled: boolean;
  settledAt?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface ThirdPartyChargeAllocation {
  chargeId: string;
  appliedAmount: number;
  previousRemaining: number;
  previousPaidInstallments: number;
  previousCurrentPeriodPaid: number;
  wasSettled: boolean;
  previousLastPaymentDate?: string;
  previousSettledAt?: string;
}

export interface ReconcileTransactionRef {
  id: string;
  type: 'income' | 'expense' | 'reimbursement' | 'card_payment';
  amount: number;
  date: string;
  createdAt?: string;
  title?: string;
  notes?: string;
  category?: string;
  personName?: string;
  relatedPersonName?: string;
  relatedPersonId?: string;
  relatedChargeId?: string;
  cardId?: string;
  cardName?: string;
  thirdPartyAllocations?: ThirdPartyChargeAllocation[];
  deletedAt?: string;
}

export interface FriendLoan {
  id: string;
  friendName: string; // ej: 'Andrés Gómez'
  principalAmount: number; // Capital prestado, ej: 500
  interestRate: number; // ej: 5 (%)
  totalToCollect: number; // Principal + interés ganado, ej: 525
  totalAmount?: number; // Monto total opcional / alias de totalToCollect
  paidAmount?: number; // Monto abonado acumulado opcional
  initialPaidAmount?: number; // Monto abonado antes de registrar en modo deuda antigua
  isPreexisting?: boolean; // Si fue registrado como préstamo antiguo/preexistente
  status?: 'active' | 'partial' | 'paid';
  notes?: string;
  remainingAmount: number; // Saldo por cobrar
  dueDate: string;
  settled: boolean;
  settledAt?: string;
  createdAt: string; // ISO 8601
  deletedAt?: string;
}

export interface ThirdPartyPersonMonthlySummary {
  personId?: string;
  personName: string;
  cardId?: string;
  cardName: string;
  monthlyDueAmount: number;     // Suma de cuotas exigibles este mes
  monthlyPaidAmount: number;    // Suma de abonos recibidos en el período actual
  monthlyPendingAmount: number; // Math.max(0, monthlyDueAmount - monthlyPaidAmount)
  isMonthSettled: boolean;      // monthlyPendingAmount <= 0
  totalRemainingDebt: number;   // Deuda total global acumulada a futuro
  chargesCount: number;         // Número de compras activas
  charges: ThirdPartyCardCharge[]; // Compras detalladas
}

export interface DebtsState {
  personalDebts: PersonalDebt[];
  thirdPartyCharges: ThirdPartyCardCharge[];
  friendLoans: FriendLoan[];
  people: PersonContact[];
  addPerson: (name: string) => PersonContact;
  deletePerson: (id: string) => void;
  addPersonalDebt: (
    debt: Omit<PersonalDebt, 'id' | 'createdAt'> & { createdAt?: string }
  ) => PersonalDebt;
  deletePersonalDebt: (id: string) => boolean;
  payPersonalDebt: (
    id: string,
    amount: number,
    options?: {
      mode?: 'next' | 'last';
      installmentsCount?: number;
      nominalAmountExtinguished?: number;
      discountSaved?: number;
    }
  ) => void;
  revertPersonalDebtPayment: (
    debtId: string,
    amount: number,
    options?: {
      mode?: 'next' | 'last';
      installmentsCount?: number;
      nominalAmountExtinguished?: number;
      discountSaved?: number;
      previousPaymentDate?: string | null;
    }
  ) => void;
  addThirdPartyCharge: (charge: {
    personName: string;
    personId?: string;
    cardName: string;
    cardId?: string;
    concept: string;
    amount: number;
    installmentsCount?: number;
    monthlyInstallmentAmount?: number;
    paidInstallmentsCount?: number;
    initialPaidInstallments?: number;
    isPreexisting?: boolean;
    remainingAmount?: number;
    date?: string;
  }) => void;
  deleteThirdPartyCharge: (chargeId: string) => void;
  recordThirdPartyInstallmentAbono: (chargeId: string, amount: number) => void;
  recordMonthlyPersonAbono: (
    personName: string,
    amount: number,
    cardId?: string,
    personId?: string
  ) => { updatedCharges: { id: string; appliedAmount: number }[]; allocations: ThirdPartyChargeAllocation[] };
  revertThirdPartyAllocations: (
    allocations: ThirdPartyChargeAllocation[],
    remainingTransactions?: ReconcileTransactionRef[],
    revertedTxDate?: string
  ) => boolean;
  revertThirdPartyChargeCollection: (
    chargeId: string,
    amount: number,
    remainingTransactions?: ReconcileTransactionRef[],
    revertedTxDate?: string
  ) => void;
  revertThirdPartyChargeAbono: (
    chargeId: string,
    amount: number,
    remainingTransactions?: ReconcileTransactionRef[],
    revertedTxDate?: string
  ) => void;
  revertThirdPartyPersonAbono: (
    personName: string,
    amount: number,
    remainingTransactions?: ReconcileTransactionRef[],
    revertedTxDate?: string
  ) => boolean;
  reconcileThirdPartyCurrentPeriod: (
    activeTransactions: ReconcileTransactionRef[],
    referenceDate?: Date
  ) => void;
  settleThirdPartyCharge: (id: string) => void;
  settleThirdPartyChargeByPerson: (personName: string, cardName?: string) => void;
  getThirdPartyMonthlyBillingSummary: (referenceDate?: Date) => ThirdPartyPersonMonthlySummary[];
  addFriendLoan: (data: {
    friendName: string;
    principalAmount: number;
    interestRate?: number;
    dueDate: string;
    notes?: string;
    initialPaidAmount?: number;
    isPreexisting?: boolean;
    createdAt?: string;
  }) => FriendLoan;
  deleteFriendLoan: (id: string) => boolean;
  collectFriendLoan: (id: string, amount: number) => void;
  revertFriendLoanCollection: (loanId: string, amount: number) => void;
  getTotalPersonalDebt: () => number;
  getTotalThirdPartyReceivable: () => number;
  getTotalFriendLoansReceivable: () => number;
  clearAllDebts: () => void;
  resetDebtsStore: () => void;
}

const normalizeStr = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const safeToDeterministicUuid = (id: string): string => {
  try {
    return toDeterministicUuid(id);
  } catch {
    return id;
  }
};

const isSameEntityId = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  return safeToDeterministicUuid(a) === safeToDeterministicUuid(b);
};

const getYearMonth = (
  dateValue?: string | Date | null
): { year: number; month: number } | null => {
  if (!dateValue) return null;
  const dt = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(dt.getTime())) return null;
  return { year: dt.getFullYear(), month: dt.getMonth() };
};

const isSameYearAndMonth = (
  a?: string | Date | null,
  b?: string | Date | null
): boolean => {
  const ymA = getYearMonth(a);
  const ymB = getYearMonth(b);
  if (!ymA || !ymB) return false;
  return ymA.year === ymB.year && ymA.month === ymB.month;
};

const getThirdPartyChargeBounds = (
  charge: ThirdPartyCardCharge
): {
  chargeTotal: number;
  installmentsCount: number;
  monthlyAmount: number;
  initialPaid: number;
  maxInitialRemaining: number;
} => {
  const chargeTotal = Number((charge.totalAmount ?? charge.amount ?? 0).toFixed(2));
  const installmentsCount =
    charge.installmentsCount && charge.installmentsCount > 0 ? charge.installmentsCount : 1;
  const monthlyAmount =
    charge.monthlyInstallmentAmount && charge.monthlyInstallmentAmount > 0
      ? charge.monthlyInstallmentAmount
      : Math.round((chargeTotal / installmentsCount) * 100) / 100;
  const initialPaid = Math.min(
    installmentsCount,
    Math.max(0, charge.initialPaidInstallments ?? 0)
  );
  const maxInitialRemaining =
    initialPaid >= installmentsCount
      ? 0
      : Number(Math.max(0, chargeTotal - initialPaid * monthlyAmount).toFixed(2));

  return {
    chargeTotal,
    installmentsCount,
    monthlyAmount,
    initialPaid,
    maxInitialRemaining,
  };
};

const doesTxMatchPersonForCharge = (
  tx: ReconcileTransactionRef,
  charge: ThirdPartyCardCharge,
  people: PersonContact[]
): boolean => {
  if (tx.relatedPersonId && charge.personId && isSameEntityId(tx.relatedPersonId, charge.personId)) {
    return true;
  }

  const chargePersonNorm = normalizeStr(charge.personName || '');
  const txPersonNorm = normalizeStr(tx.relatedPersonName || tx.personName || '');

  if (txPersonNorm && chargePersonNorm) {
    if (
      txPersonNorm === chargePersonNorm ||
      txPersonNorm.includes(chargePersonNorm) ||
      chargePersonNorm.includes(txPersonNorm)
    ) {
      return true;
    }
  }

  if (txPersonNorm) {
    const linkedPerson = people.find(
      (p) =>
        (charge.personId && isSameEntityId(p.id, charge.personId)) ||
        normalizeStr(p.name) === chargePersonNorm
    );
    if (linkedPerson) {
      const linkedNorm = normalizeStr(linkedPerson.name);
      if (
        linkedNorm === txPersonNorm ||
        txPersonNorm.includes(linkedNorm) ||
        linkedNorm.includes(txPersonNorm)
      ) {
        return true;
      }
    }
  }

  if (tx.relatedPersonId && chargePersonNorm) {
    const personById = people.find((p) => isSameEntityId(p.id, tx.relatedPersonId));
    if (personById) {
      const pNorm = normalizeStr(personById.name);
      if (
        pNorm === chargePersonNorm ||
        pNorm.includes(chargePersonNorm) ||
        chargePersonNorm.includes(pNorm)
      ) {
        return true;
      }
    }
  }

  if (!txPersonNorm && !tx.relatedPersonId && chargePersonNorm) {
    const titleNorm = normalizeStr(tx.title || '');
    const notesNorm = normalizeStr(tx.notes || '');
    if (
      (titleNorm && titleNorm.includes(chargePersonNorm)) ||
      (notesNorm && notesNorm.includes(chargePersonNorm))
    ) {
      return true;
    }
  }

  return false;
};

const getTxTimestamp = (tx: ReconcileTransactionRef): number => {
  const raw = tx.date || tx.createdAt || '';
  const ts = new Date(raw).getTime();
  return isNaN(ts) ? 0 : ts;
};

const isTxCoveringChargeInCycle = (
  tx: ReconcileTransactionRef,
  charge: ThirdPartyCardCharge,
  people: PersonContact[],
  cycleDate: Date
): boolean => {
  if (tx.type !== 'reimbursement') return false;
  if (!isSameYearAndMonth(tx.date || tx.createdAt, cycleDate)) return false;

  if (
    isSameEntityId(tx.relatedChargeId, charge.id) ||
    Boolean(tx.thirdPartyAllocations?.some((a) => isSameEntityId(a.chargeId, charge.id)))
  ) {
    return true;
  }

  const hasExplicitLinks =
    Boolean(tx.relatedChargeId) ||
    Boolean(tx.thirdPartyAllocations && tx.thirdPartyAllocations.length > 0);
  if (!hasExplicitLinks) {
    return doesTxMatchPersonForCharge(tx, charge, people);
  }

  return false;
};

const findLatestPaymentDateForCharge = (
  charge: ThirdPartyCardCharge,
  remainingTransactions: ReconcileTransactionRef[],
  people: PersonContact[]
): string | undefined => {
  const reimbursements = remainingTransactions.filter((t) => t.type === 'reimbursement');
  if (reimbursements.length === 0) return undefined;

  const directMatches = reimbursements.filter(
    (t) =>
      isSameEntityId(t.relatedChargeId, charge.id) ||
      Boolean(t.thirdPartyAllocations?.some((a) => isSameEntityId(a.chargeId, charge.id)))
  );

  if (directMatches.length > 0) {
    const sorted = [...directMatches].sort((a, b) => getTxTimestamp(b) - getTxTimestamp(a));
    return sorted[0].date || sorted[0].createdAt || undefined;
  }

  const legacyPersonMatches = reimbursements.filter((t) => {
    const hasExplicitLinks =
      Boolean(t.relatedChargeId) ||
      Boolean(t.thirdPartyAllocations && t.thirdPartyAllocations.length > 0);
    if (hasExplicitLinks) return false;
    return doesTxMatchPersonForCharge(t, charge, people);
  });

  if (legacyPersonMatches.length > 0) {
    const sorted = [...legacyPersonMatches].sort((a, b) => getTxTimestamp(b) - getTxTimestamp(a));
    return sorted[0].date || sorted[0].createdAt || undefined;
  }

  return undefined;
};

const applyThirdPartyChargeRevertDelta = (
  charge: ThirdPartyCardCharge,
  revertAmount: number,
  options?: {
    remainingTransactions?: ReconcileTransactionRef[];
    revertedTxDate?: string;
    fallbackPreviousLastPaymentDate?: string;
    people?: PersonContact[];
    maxRemainingOverride?: number;
  }
): ThirdPartyCardCharge => {
  const { installmentsCount, monthlyAmount, initialPaid, maxInitialRemaining } =
    getThirdPartyChargeBounds(charge);

  const effectiveMaxRemaining =
    options?.maxRemainingOverride !== undefined
      ? Math.min(maxInitialRemaining, Math.max(0, options.maxRemainingOverride))
      : maxInitialRemaining;

  const delta = Number(Math.max(0, revertAmount).toFixed(2));
  const currentRem =
    charge.remainingAmount !== undefined ? charge.remainingAmount : maxInitialRemaining;

  let newRemaining = Math.min(
    effectiveMaxRemaining,
    Math.max(0, Number((currentRem + delta).toFixed(2)))
  );
  if (newRemaining < 0.01) {
    newRemaining = 0;
  }

  // Si el abono eliminado pertenece a un mes estrictamente anterior al de lastPaymentDate
  // y existe un abono activo en ese mes posterior, preservar currentPeriodPaidAmount del mes vigente.
  let shouldDeductCurrentPeriod = true;
  if (options?.revertedTxDate && charge.lastPaymentDate && options?.remainingTransactions) {
    const revYM = getYearMonth(options.revertedTxDate);
    const lastYM = getYearMonth(charge.lastPaymentDate);
    if (revYM && lastYM) {
      const revTotalMonths = revYM.year * 12 + revYM.month;
      const lastTotalMonths = lastYM.year * 12 + lastYM.month;
      if (revTotalMonths < lastTotalMonths) {
        const lastPaymentRefDate = new Date(charge.lastPaymentDate);
        const hasActiveTxInLastMonth = options.remainingTransactions.some((t) =>
          isTxCoveringChargeInCycle(t, charge, options.people ?? [], lastPaymentRefDate)
        );
        if (hasActiveTxInLastMonth) {
          shouldDeductCurrentPeriod = false;
        }
      }
    }
  }

  const currentPeriodPaid = charge.currentPeriodPaidAmount || 0;
  let newPeriodPaid = shouldDeductCurrentPeriod
    ? Math.max(0, Number((currentPeriodPaid - delta).toFixed(2)))
    : currentPeriodPaid;
  if (newPeriodPaid < 0.01) {
    newPeriodPaid = 0;
  }

  const latestRemainingPaymentDate =
    options?.remainingTransactions !== undefined
      ? findLatestPaymentDateForCharge(charge, options.remainingTransactions, options.people ?? [])
      : undefined;

  // Limpiar residuo de tolerancia de liquidación (<= 0.05) cuando no quedan pagos activos
  if (
    options?.remainingTransactions !== undefined &&
    !latestRemainingPaymentDate &&
    newPeriodPaid === 0 &&
    effectiveMaxRemaining > 0.05 &&
    effectiveMaxRemaining - newRemaining <= 0.05
  ) {
    newRemaining = effectiveMaxRemaining;
  }

  const isSettled =
    newRemaining <= 0.05 && (newRemaining === 0 || maxInitialRemaining > 0.05);
  if (isSettled) {
    newRemaining = 0;
  }

  const appCoveredAmount = Math.max(0, Number((maxInitialRemaining - newRemaining).toFixed(2)));
  const newPaidInstallments = isSettled
    ? installmentsCount
    : monthlyAmount > 0
    ? Math.min(
        installmentsCount,
        initialPaid + Math.floor(parseFloat((appCoveredAmount / monthlyAmount).toFixed(4)))
      )
    : initialPaid;

  const isRestoredToInitial =
    !isSettled &&
    newPeriodPaid === 0 &&
    newRemaining >= maxInitialRemaining - 0.009;

  let newLastPaymentDate: string | undefined;
  if (isRestoredToInitial) {
    newLastPaymentDate = undefined;
  } else if (options?.remainingTransactions !== undefined) {
    newLastPaymentDate = latestRemainingPaymentDate;
  } else {
    newLastPaymentDate = options?.fallbackPreviousLastPaymentDate ?? charge.lastPaymentDate;
  }

  return {
    ...charge,
    remainingAmount: newRemaining,
    currentPeriodPaidAmount: newPeriodPaid,
    paidInstallmentsCount: newPaidInstallments,
    settled: isSettled,
    settledAt: isSettled ? (charge.settledAt ?? new Date().toISOString()) : undefined,
    lastPaymentDate: newLastPaymentDate,
  };
};

const INITIAL_PEOPLE: PersonContact[] = [];

const INITIAL_PERSONAL_DEBTS: PersonalDebt[] = [];
const INITIAL_THIRD_PARTY_CHARGES: ThirdPartyCardCharge[] = [];
const INITIAL_FRIEND_LOANS: FriendLoan[] = [];

export const useDebtsStore = create<DebtsState>()(
  persist(
    (set, get) => ({
      personalDebts: INITIAL_PERSONAL_DEBTS,
      thirdPartyCharges: INITIAL_THIRD_PARTY_CHARGES,
      friendLoans: INITIAL_FRIEND_LOANS,
      people: INITIAL_PEOPLE,

      addPerson: (name: string): PersonContact => {
        const trimmed = name.trim();
        const existing = get().people.find(
          (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) {
          return existing;
        }
        const newPerson: PersonContact = {
          id: Date.now().toString(),
          name: trimmed,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          people: [...state.people, newPerson],
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
        return newPerson;
      },

      deletePerson: (id: string): void => {
        set((state) => ({
          people: state.people.filter((p) => p.id !== id),
        }));
        debtSyncHandlers.onPersonDeleted?.(id);
      },

      addPersonalDebt: (
        debt: Omit<PersonalDebt, 'id' | 'createdAt'> & { createdAt?: string }
      ): PersonalDebt => {
        const remaining = debt.remainingAmount ?? debt.totalAmount;
        const isSettled = remaining <= 0;
        const paidInstallments = debt.paidInstallments ?? 0;
        const initialPaidInstallments =
          debt.initialPaidInstallments !== undefined
            ? debt.initialPaidInstallments
            : debt.isPreexisting
            ? paidInstallments
            : 0;
        const resolvedCardId = debt.cardId ?? debt.creditCardId;
        const newDebt: PersonalDebt = {
          ...debt,
          id: `debt-${Date.now()}`,
          cardId: resolvedCardId,
          creditCardId: resolvedCardId,
          paidInstallments,
          initialPaidInstallments,
          lastPaymentDate:
            debt.lastPaymentDate !== undefined
              ? debt.lastPaymentDate
              : !debt.isPreexisting && paidInstallments > 0
              ? new Date().toISOString()
              : undefined,
          remainingAmount: remaining,
          dueDay: debt.dueDay,
          interestRate: debt.interestRate !== undefined ? Number(debt.interestRate) : undefined,
          settled: isSettled,
          settledAt: isSettled ? new Date().toISOString() : undefined,
          createdAt: debt.createdAt ?? new Date().toISOString(),
        };
        set((state) => ({
          personalDebts: [...state.personalDebts, newDebt],
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
        return newDebt;
      },

      deletePersonalDebt: (id: string): boolean => {
        const target = get().personalDebts.find((d) => d.id === id);
        if (!target) return false;
        const initialPaid =
          target.initialPaidInstallments ??
          (target.isPreexisting ? (target.paidInstallments ?? 0) : 0);
        const currentPaid = target.paidInstallments ?? 0;
        const hasPayments = target.totalInstallments
          ? (target.totalActualPaid || 0) > 0 || currentPaid > initialPaid
          : target.isPreexisting
          ? (target.totalActualPaid || 0) > 0
          : (target.totalActualPaid || 0) > 0 || target.remainingAmount < target.totalAmount;
        if (hasPayments) {
          return false;
        }
        set((state) => ({
          personalDebts: state.personalDebts.filter((d) => d.id !== id),
        }));
        debtSyncHandlers.onPersonalDebtDeleted?.(id);
        return true;
      },

      payPersonalDebt: (id, amount, options): void => {
        set((state) => ({
          personalDebts: state.personalDebts.map((debt) => {
            if (debt.id !== id) return debt;
            const count = Math.max(1, options?.installmentsCount || 1);
            const mode = options?.mode || 'next';
            const isInstallmentLoan =
              debt.debtType === 'installment_loan' || Boolean(debt.totalInstallments);

            // Valor integral de la(s) cuota(s) que se descuenta del saldo pendiente de la deuda
            const defaultNominal =
              debt.monthlyPayment && debt.monthlyPayment > 0
                ? debt.monthlyPayment * count
                : amount;
            const nominalExtinguished =
              options?.nominalAmountExtinguished !== undefined && options.nominalAmountExtinguished > 0
                ? options.nominalAmountExtinguished
                : Math.max(amount, defaultNominal);

            const discountSaved =
              options?.discountSaved !== undefined
                ? Math.max(0, options.discountSaved)
                : Math.max(0, nominalExtinguished - amount);

            const calculatedRemaining = Math.max(
              0,
              Number((debt.remainingAmount - nominalExtinguished).toFixed(2))
            );
            const newTotalDiscountSaved = Number(
              ((debt.totalDiscountSaved || 0) + discountSaved).toFixed(2)
            );
            const newTotalActualPaid = Number(
              ((debt.totalActualPaid || 0) + amount).toFixed(2)
            );

            if (isInstallmentLoan && debt.totalInstallments) {
              const newPaid = Math.min(
                 debt.totalInstallments,
                (debt.paidInstallments || 0) + count
              );
              const newPrepaidLast =
                mode === 'last'
                  ? (debt.prepaidLastInstallments || 0) + count
                  : debt.prepaidLastInstallments || 0;

              const isSettled = calculatedRemaining <= 0.001 || newPaid >= debt.totalInstallments;
              const finalRemaining = isSettled ? 0 : calculatedRemaining;

              return {
                ...debt,
                remainingAmount: finalRemaining,
                paidInstallments: newPaid,
                prepaidLastInstallments: newPrepaidLast,
                totalDiscountSaved: newTotalDiscountSaved,
                totalActualPaid: newTotalActualPaid,
                settled: isSettled,
                settledAt: isSettled ? (debt.settledAt ?? new Date().toISOString()) : undefined,
                lastPaymentDate: new Date().toISOString(),
              };
            }

            const isSettled = calculatedRemaining <= 0.001;
            const finalRemaining = isSettled ? 0 : calculatedRemaining;

            return {
              ...debt,
              remainingAmount: finalRemaining,
              totalDiscountSaved: newTotalDiscountSaved,
              totalActualPaid: newTotalActualPaid,
              settled: isSettled,
              settledAt: isSettled ? (debt.settledAt ?? new Date().toISOString()) : undefined,
              lastPaymentDate: new Date().toISOString(),
            };
          }),
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      revertPersonalDebtPayment: (debtId, amount, options): void => {
        set((state) => ({
          personalDebts: state.personalDebts.map((debt) => {
            if (debt.id !== debtId) return debt;
            const count = Math.max(1, options?.installmentsCount || 1);
            const mode = options?.mode || 'next';
            const nominalRestore =
              options?.nominalAmountExtinguished !== undefined && options.nominalAmountExtinguished > 0
                ? options.nominalAmountExtinguished
                : debt.monthlyPayment && debt.monthlyPayment > 0
                ? debt.monthlyPayment * count
                : amount;
            const discountRestore =
              options?.discountSaved !== undefined
                ? Math.max(0, options.discountSaved)
                : Math.max(0, nominalRestore - amount);

            let newRemaining = debt.remainingAmount + nominalRestore;
            if (debt.totalAmount) {
              newRemaining = Math.min(newRemaining, debt.totalAmount);
            }
            newRemaining = Number(newRemaining.toFixed(2));

            const newTotalDiscountSaved = Math.max(
              0,
              Number(((debt.totalDiscountSaved || 0) - discountRestore).toFixed(2))
            );
            const newTotalActualPaid = Math.max(
              0,
              Number(((debt.totalActualPaid || 0) - amount).toFixed(2))
            );

            const isInstallmentLoan =
              debt.debtType === 'installment_loan' || Boolean(debt.totalInstallments);

            const newPaid =
              isInstallmentLoan && debt.paidInstallments !== undefined
                ? Math.max(0, (debt.paidInstallments || 0) - count)
                : debt.paidInstallments;

            const hasRemainingPayments =
              (isInstallmentLoan &&
                ((newPaid !== undefined && newPaid > 0) ||
                  (debt.initialPaidInstallments ?? 0) > 0)) ||
              newTotalActualPaid > 0 ||
              (debt.totalAmount ? newRemaining < debt.totalAmount : false);

            // Determinar lastPaymentDate revertido
            let newLastPaymentDate: string | undefined;
            if (options?.previousPaymentDate !== undefined) {
              newLastPaymentDate = options.previousPaymentDate || undefined;
            } else if (hasRemainingPayments) {
              newLastPaymentDate = debt.lastPaymentDate;
            } else {
              newLastPaymentDate = undefined;
            }

            if (isInstallmentLoan && debt.paidInstallments !== undefined) {
              const newPrepaidLast =
                mode === 'last'
                  ? Math.max(0, (debt.prepaidLastInstallments || 0) - count)
                  : debt.prepaidLastInstallments || 0;

              const isSettled =
                newRemaining <= 0.001 ||
                (debt.totalInstallments ? (newPaid ?? 0) >= debt.totalInstallments : false);

              return {
                ...debt,
                remainingAmount: newRemaining,
                paidInstallments: newPaid,
                prepaidLastInstallments: newPrepaidLast,
                totalDiscountSaved: newTotalDiscountSaved,
                totalActualPaid: newTotalActualPaid,
                settled: isSettled,
                settledAt: isSettled ? (debt.settledAt ?? new Date().toISOString()) : undefined,
                lastPaymentDate: newLastPaymentDate,
              };
            }

            const isSettled = newRemaining <= 0.001;

            return {
              ...debt,
              remainingAmount: newRemaining,
              totalDiscountSaved: newTotalDiscountSaved,
              totalActualPaid: newTotalActualPaid,
              settled: isSettled,
              settledAt: isSettled ? (debt.settledAt ?? new Date().toISOString()) : undefined,
              lastPaymentDate: newLastPaymentDate,
            };
          }),
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      addThirdPartyCharge: (charge: {
        personName: string;
        personId?: string;
        cardName: string;
        cardId?: string;
        concept: string;
        amount: number;
        installmentsCount?: number;
        monthlyInstallmentAmount?: number;
        paidInstallmentsCount?: number;
        initialPaidInstallments?: number;
        isPreexisting?: boolean;
        remainingAmount?: number;
        date?: string;
      }): void => {
        let targetPersonId = charge.personId;
        const trimmedPersonName = charge.personName.trim();
        const existingPerson = get().people.find(
          (p) =>
            (Boolean(targetPersonId) && p.id === targetPersonId) ||
            normalizeStr(p.name) === normalizeStr(trimmedPersonName)
        );

        let updatedPeople = get().people;
        if (!existingPerson) {
          const newPerson: PersonContact = {
            id: targetPersonId || `person-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: trimmedPersonName,
            createdAt: new Date().toISOString(),
          };
          targetPersonId = newPerson.id;
          updatedPeople = [...updatedPeople, newPerson];
        } else if (!targetPersonId) {
          targetPersonId = existingPerson.id;
        }

        const installments = Math.max(1, charge.installmentsCount || 1);
        const monthlyAmount =
          charge.monthlyInstallmentAmount !== undefined && charge.monthlyInstallmentAmount > 0
            ? charge.monthlyInstallmentAmount
            : Math.round((charge.amount / installments) * 100) / 100;
        const explicitPaid =
          charge.initialPaidInstallments !== undefined
            ? charge.initialPaidInstallments
            : charge.paidInstallmentsCount;
        const derivedPaidFromRemaining =
          charge.remainingAmount !== undefined && monthlyAmount > 0
            ? Math.min(
                installments,
                Math.max(
                  0,
                  Math.round(
                    parseFloat(
                      ((charge.amount - charge.remainingAmount) / monthlyAmount).toFixed(4)
                    )
                  )
                )
              )
            : 0;
        const prePaidInstallments =
          installments > 1
            ? Math.min(
                installments,
                Math.max(
                  0,
                  explicitPaid !== undefined ? explicitPaid : derivedPaidFromRemaining
                )
              )
            : 0;
        const initialPaid =
          charge.initialPaidInstallments !== undefined
            ? charge.initialPaidInstallments
            : prePaidInstallments;
        const isPreexisting = charge.isPreexisting ?? (initialPaid > 0);
        const calculatedRemaining =
          charge.remainingAmount !== undefined
            ? charge.remainingAmount
            : Number(Math.max(0, charge.amount - prePaidInstallments * monthlyAmount).toFixed(2));

        const newCharge: ThirdPartyCardCharge = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          personName: trimmedPersonName,
          personId: targetPersonId,
          cardName: charge.cardName.trim(),
          cardId: charge.cardId,
          concept: charge.concept.trim(),
          amount: charge.amount,
          totalAmount: charge.amount,
          remainingAmount: calculatedRemaining,
          installmentsCount: installments,
          monthlyInstallmentAmount: monthlyAmount,
          currentPeriodPaidAmount: 0,
          paidInstallmentsCount: prePaidInstallments,
          initialPaidInstallments: initialPaid,
          isPreexisting: isPreexisting,
          date: charge.date || new Date().toISOString(),
          settled: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          people: updatedPeople,
          thirdPartyCharges: [...state.thirdPartyCharges, newCharge],
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      deleteThirdPartyCharge: (chargeId: string): void => {
        set((state) => ({
          thirdPartyCharges: state.thirdPartyCharges.filter((c) => c.id !== chargeId),
        }));
        debtSyncHandlers.onThirdPartyChargeDeleted?.(chargeId);
      },

      recordThirdPartyInstallmentAbono: (chargeId: string, amount: number): void => {
        set((state) => ({
          thirdPartyCharges: state.thirdPartyCharges.map((charge) => {
            if (charge.id !== chargeId) return charge;
            let newRemaining = Math.max(0, charge.remainingAmount - amount);
            const newPeriodPaid = (charge.currentPeriodPaidAmount || 0) + amount;
            let newPaidInstallments = charge.monthlyInstallmentAmount > 0
              ? Math.min(
                  charge.installmentsCount,
                  Math.max(
                    charge.initialPaidInstallments ?? 0,
                    Math.floor(
                      parseFloat(
                        (((charge.totalAmount ?? charge.amount) - newRemaining) / charge.monthlyInstallmentAmount).toFixed(4)
                      )
                    )
                  )
                )
              : charge.paidInstallmentsCount;

            const isFullySettled = newRemaining <= 0.05;

            if (isFullySettled) {
              newRemaining = 0;
              newPaidInstallments = charge.installmentsCount;
            }

            return {
              ...charge,
              remainingAmount: Number(newRemaining.toFixed(2)),
              currentPeriodPaidAmount: Number(newPeriodPaid.toFixed(2)),
              paidInstallmentsCount: newPaidInstallments,
              settled: isFullySettled,
              settledAt: isFullySettled ? new Date().toISOString() : undefined,
              lastPaymentDate: new Date().toISOString(),
            };
          }),
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      recordMonthlyPersonAbono: (
        personName: string,
        amount: number,
        cardId?: string,
        personId?: string
      ): { updatedCharges: { id: string; appliedAmount: number }[]; allocations: ThirdPartyChargeAllocation[] } => {
        const targetNameNorm = normalizeStr(personName);

        // Obtener todos los cargos activos no saldados de la persona
        const allPersonCharges = get().thirdPartyCharges.filter((c) => {
          if (c.settled || (c.remainingAmount !== undefined ? c.remainingAmount <= 0 : c.amount <= 0)) {
            return false;
          }

          const matchPerson =
            Boolean(personId && c.personId && c.personId === personId) ||
            normalizeStr(c.personName) === targetNameNorm ||
            get().people.some(
              (p) => normalizeStr(p.name) === targetNameNorm && c.personId === p.id
            ) ||
            normalizeStr(c.personName).includes(targetNameNorm) ||
            targetNameNorm.includes(normalizeStr(c.personName));

          return matchPerson;
        });

        if (allPersonCharges.length === 0) {
          return { updatedCharges: [], allocations: [] };
        }

        // Orden de amortización: método bola de nieve (menor deuda restante primero)
        const sortByRemainingAsc = (a: ThirdPartyCardCharge, b: ThirdPartyCardCharge): number => {
          const remA = a.remainingAmount !== undefined ? a.remainingAmount : a.amount;
          const remB = b.remainingAmount !== undefined ? b.remainingAmount : b.amount;
          if (Math.abs(remA - remB) > 0.0001) {
            return remA - remB;
          }
          const aTime = new Date(a.date || a.createdAt).getTime();
          const bTime = new Date(b.date || b.createdAt).getTime();
          return aTime - bTime;
        };

        // Si cardId está especificado, priorizamos los cargos de esa tarjeta; si no, todos los cargos están al mismo nivel
        const primaryCharges = cardId
          ? allPersonCharges.filter((c) => c.cardId === cardId)
          : allPersonCharges;
        const secondaryCharges = cardId
          ? allPersonCharges.filter((c) => c.cardId !== cardId)
          : [];

        let remainingToApply = amount;
        const appliedMap = new Map<string, number>();

        const applyToCharges = (chargesList: ThirdPartyCardCharge[]): void => {
          if (remainingToApply <= 0 || chargesList.length === 0) return;

          // Fase 1: Cubrir compromisos del mes actual (ordenados por remainingAmount ascendente)
          const sortedForPhase1 = [...chargesList].sort(sortByRemainingAsc);
          for (const cargo of sortedForPhase1) {
            if (remainingToApply <= 0) break;
            const alreadyApplied = appliedMap.get(cargo.id) || 0;
            const currentRem = parseFloat((cargo.remainingAmount - alreadyApplied).toFixed(2));
            if (currentRem <= 0) continue;

            const now = new Date();
            const paymentDate = cargo.lastPaymentDate ? new Date(cargo.lastPaymentDate) : null;
            const isSameCycleMonth = paymentDate
              ? paymentDate.getFullYear() === now.getFullYear() && paymentDate.getMonth() === now.getMonth()
              : false;
            const currentPaidThisCycle = isSameCycleMonth ? (cargo.currentPeriodPaidAmount || 0) : 0;

            const commitmentMes =
              cargo.installmentsCount <= 1
                ? currentRem
                : Math.max(
                    0,
                    parseFloat(
                      (
                        cargo.monthlyInstallmentAmount -
                        (currentPaidThisCycle + alreadyApplied)
                      ).toFixed(2)
                    )
                  );

            if (commitmentMes > 0) {
              const toApplyThisMonth = Math.min(remainingToApply, commitmentMes, currentRem);
              if (toApplyThisMonth > 0) {
                const applied = parseFloat(toApplyThisMonth.toFixed(2));
                appliedMap.set(cargo.id, (appliedMap.get(cargo.id) || 0) + applied);
                remainingToApply = parseFloat((remainingToApply - applied).toFixed(2));
              }
            }
          }

          // Fase 2: Excedente a capital diferido / cuotas futuras (ordenados por saldo remanente ascendente)
          if (remainingToApply > 0) {
            const sortedForPhase2 = [...chargesList].sort((a, b) => {
              const remA = (a.remainingAmount !== undefined ? a.remainingAmount : a.amount) - (appliedMap.get(a.id) || 0);
              const remB = (b.remainingAmount !== undefined ? b.remainingAmount : b.amount) - (appliedMap.get(b.id) || 0);
              if (Math.abs(remA - remB) > 0.0001) {
                return remA - remB;
              }
              const aTime = new Date(a.date || a.createdAt).getTime();
              const bTime = new Date(b.date || b.createdAt).getTime();
              return aTime - bTime;
            });

            for (const cargo of sortedForPhase2) {
              if (remainingToApply <= 0) break;
              const alreadyApplied = appliedMap.get(cargo.id) || 0;
              const remainingOfCargo = parseFloat((cargo.remainingAmount - alreadyApplied).toFixed(2));
              if (remainingOfCargo > 0) {
                const extraToApply = Math.min(remainingToApply, remainingOfCargo);
                if (extraToApply > 0) {
                  const applied = parseFloat(extraToApply.toFixed(2));
                  appliedMap.set(cargo.id, (appliedMap.get(cargo.id) || 0) + applied);
                  remainingToApply = parseFloat((remainingToApply - applied).toFixed(2));
                }
              }
            }
          }
        };

        // Ejecución en cascada: primero la tarjeta objetivo (si existe) y luego el resto de tarjetas si hay excedente
        applyToCharges(primaryCharges);
        if (remainingToApply > 0 && secondaryCharges.length > 0) {
          applyToCharges(secondaryCharges);
        }

        const updatedCharges: { id: string; appliedAmount: number }[] = [];
        const allocations: ThirdPartyChargeAllocation[] = [];

        for (const cargo of allPersonCharges) {
          const totalAppliedToCharge = appliedMap.get(cargo.id) || 0;
          if (totalAppliedToCharge > 0) {
            const now = new Date();
            const paymentDate = cargo.lastPaymentDate ? new Date(cargo.lastPaymentDate) : null;
            const isSameCycleMonth = paymentDate
              ? paymentDate.getFullYear() === now.getFullYear() && paymentDate.getMonth() === now.getMonth()
              : false;
            const currentPaidThisCycle = isSameCycleMonth ? (cargo.currentPeriodPaidAmount || 0) : 0;

            updatedCharges.push({ id: cargo.id, appliedAmount: totalAppliedToCharge });
            allocations.push({
              chargeId: cargo.id,
              appliedAmount: totalAppliedToCharge,
              previousRemaining: cargo.remainingAmount,
              previousPaidInstallments: cargo.paidInstallmentsCount ?? 0,
              previousCurrentPeriodPaid: currentPaidThisCycle,
              wasSettled: Boolean(cargo.settled),
              previousLastPaymentDate: cargo.lastPaymentDate,
              previousSettledAt: cargo.settledAt,
            });
          }
        }

        if (updatedCharges.length > 0) {
          const now = new Date();
          const nowIso = now.toISOString();
          const updatedMap = new Map<string, Partial<ThirdPartyCardCharge>>();

          for (const cargo of allPersonCharges) {
            const totalAppliedToCharge = appliedMap.get(cargo.id) || 0;
            if (totalAppliedToCharge <= 0) continue;

            const paymentDate = cargo.lastPaymentDate ? new Date(cargo.lastPaymentDate) : null;
            const isSameCycleMonth = paymentDate
              ? paymentDate.getFullYear() === now.getFullYear() && paymentDate.getMonth() === now.getMonth()
              : false;
            const basePeriodPaid = isSameCycleMonth ? (cargo.currentPeriodPaidAmount || 0) : 0;

            let newRemaining = Math.max(0, parseFloat((cargo.remainingAmount - totalAppliedToCharge).toFixed(2)));
            const newPeriodPaid = parseFloat((basePeriodPaid + totalAppliedToCharge).toFixed(2));
            let newPaidInstallments =
              cargo.monthlyInstallmentAmount > 0
                ? Math.min(
                    cargo.installmentsCount,
                    Math.max(
                      cargo.initialPaidInstallments ?? 0,
                      Math.floor(
                        parseFloat(
                          (((cargo.totalAmount ?? cargo.amount) - newRemaining) / cargo.monthlyInstallmentAmount).toFixed(4)
                        )
                      )
                    )
                  )
                : cargo.paidInstallmentsCount;

            const isFullySettled = newRemaining <= 0.05;

            if (isFullySettled) {
              newRemaining = 0;
              newPaidInstallments = cargo.installmentsCount;
            }

            updatedMap.set(cargo.id, {
              remainingAmount: isFullySettled ? 0 : newRemaining,
              currentPeriodPaidAmount: newPeriodPaid,
              paidInstallmentsCount: newPaidInstallments,
              settled: isFullySettled,
              settledAt: isFullySettled ? (cargo.settledAt ?? nowIso) : undefined,
              lastPaymentDate: nowIso,
            });
          }

          set((state) => ({
            thirdPartyCharges: state.thirdPartyCharges.map((charge) => {
              const update = updatedMap.get(charge.id);
              return update ? { ...charge, ...update } : charge;
            }),
          }));
          debtSyncHandlers.onDebtAddedOrUpdated?.();
        }

        return { updatedCharges, allocations };
      },

      revertThirdPartyAllocations: (
        allocations: ThirdPartyChargeAllocation[],
        remainingTransactions?: ReconcileTransactionRef[],
        revertedTxDate?: string
      ): boolean => {
        if (!allocations || allocations.length === 0) return false;

        const aggregatedByCharge = new Map<
          string,
          { totalApplied: number; fallbackPreviousLastPaymentDate?: string }
        >();

        for (const a of allocations) {
          if (!a || !a.chargeId || typeof a.appliedAmount !== 'number' || a.appliedAmount <= 0 || isNaN(a.appliedAmount)) {
            continue;
          }
          const key = safeToDeterministicUuid(a.chargeId);
          const existing = aggregatedByCharge.get(key);
          if (existing) {
            existing.totalApplied = Number((existing.totalApplied + a.appliedAmount).toFixed(2));
            if (a.previousLastPaymentDate !== undefined) {
              existing.fallbackPreviousLastPaymentDate = a.previousLastPaymentDate;
            }
          } else {
            aggregatedByCharge.set(key, {
              totalApplied: Number(a.appliedAmount.toFixed(2)),
              fallbackPreviousLastPaymentDate: a.previousLastPaymentDate,
            });
          }
        }

        if (aggregatedByCharge.size === 0) return false;

        let updatedAny = false;
        set((state) => ({
          thirdPartyCharges: state.thirdPartyCharges.map((charge) => {
            const entry = aggregatedByCharge.get(safeToDeterministicUuid(charge.id));
            if (!entry || entry.totalApplied <= 0) return charge;

            updatedAny = true;
            return applyThirdPartyChargeRevertDelta(charge, entry.totalApplied, {
              remainingTransactions,
              revertedTxDate,
              fallbackPreviousLastPaymentDate: entry.fallbackPreviousLastPaymentDate,
              people: state.people,
            });
          }),
        }));
        if (updatedAny) {
          debtSyncHandlers.onDebtAddedOrUpdated?.();
        }
        return updatedAny;
      },

      revertThirdPartyChargeCollection: (
        chargeId: string,
        amount: number,
        remainingTransactions?: ReconcileTransactionRef[],
        revertedTxDate?: string
      ): void => {
        if (!chargeId || amount <= 0 || isNaN(amount)) return;

        let updatedAny = false;
        set((state) => ({
          thirdPartyCharges: state.thirdPartyCharges.map((charge) => {
            if (!isSameEntityId(charge.id, chargeId)) return charge;
            updatedAny = true;
            return applyThirdPartyChargeRevertDelta(charge, amount, {
              remainingTransactions,
              revertedTxDate,
              people: state.people,
            });
          }),
        }));
        if (updatedAny) {
          debtSyncHandlers.onDebtAddedOrUpdated?.();
        }
      },

      revertThirdPartyChargeAbono: (
        chargeId: string,
        amount: number,
        remainingTransactions?: ReconcileTransactionRef[],
        revertedTxDate?: string
      ): void => {
        get().revertThirdPartyChargeCollection(
          chargeId,
          amount,
          remainingTransactions,
          revertedTxDate
        );
      },

      revertThirdPartyPersonAbono: (
        personName: string,
        amount: number,
        remainingTransactions?: ReconcileTransactionRef[],
        revertedTxDate?: string
      ): boolean => {
        if (!personName || amount <= 0 || isNaN(amount)) return false;

        const targetNorm = normalizeStr(personName);
        if (!targetNorm) return false;

        const currentPeople = get().people;
        const allCharges = get().thirdPartyCharges;

        const exactCandidates = allCharges.filter(
          (c) =>
            isSameEntityId(c.personId, personName) ||
            normalizeStr(c.personName) === targetNorm ||
            currentPeople.some(
              (p) =>
                normalizeStr(p.name) === targetNorm &&
                isSameEntityId(c.personId, p.id)
            )
        );

        const candidates =
          exactCandidates.length > 0
            ? [...exactCandidates]
            : allCharges.filter((c) => {
                const cNorm = normalizeStr(c.personName);
                return Boolean(cNorm) && (cNorm.includes(targetNorm) || targetNorm.includes(cNorm));
              });

        if (candidates.length === 0) return false;

        const sortByRecencyDesc = (a: ThirdPartyCardCharge, b: ThirdPartyCardCharge): number => {
          const aTime = new Date(a.lastPaymentDate || a.date || a.createdAt).getTime();
          const bTime = new Date(b.lastPaymentDate || b.date || b.createdAt).getTime();
          return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
        };

        const computeMaxCanRevert = (c: ThirdPartyCardCharge): number => {
          const { maxInitialRemaining } = getThirdPartyChargeBounds(c);
          const chargeRemaining = c.remainingAmount !== undefined ? c.remainingAmount : maxInitialRemaining;
          return Math.max(0, Number((maxInitialRemaining - chargeRemaining).toFixed(2)));
        };

        let remainingToRevert = Number(amount.toFixed(2));
        const revertMap = new Map<string, number>();

        // Fase 1: Priorizar cargos con saldo abonado en el ciclo actual (currentPeriodPaidAmount > 0),
        // limitando cada asignación al tope de su currentPeriodPaidAmount y su maxCanRevert (excluyendo cuotas preexistentes).
        const phase1Candidates = [...candidates]
          .filter((c) => (c.currentPeriodPaidAmount || 0) > 0)
          .sort(sortByRecencyDesc);

        for (const c of phase1Candidates) {
          if (remainingToRevert <= 0) break;
          const maxCanRevert = computeMaxCanRevert(c);
          const periodCap = Math.min(maxCanRevert, Math.max(0, c.currentPeriodPaidAmount || 0));
          if (periodCap <= 0 || isNaN(periodCap)) continue;
          const toRevert = Math.min(remainingToRevert, periodCap);
          if (toRevert > 0 && !isNaN(toRevert)) {
            const rounded = Number(toRevert.toFixed(2));
            revertMap.set(c.id, rounded);
            remainingToRevert = Number((remainingToRevert - rounded).toFixed(2));
          }
        }

        // Fase 2: Si aún queda monto por revertir, cubrir amortizaciones previas válidas dentro de la app
        // sin invadir jamás las cuotas preexistentes.
        if (remainingToRevert > 0.0001) {
          const phase2Candidates = [...candidates].sort(sortByRecencyDesc);
          for (const c of phase2Candidates) {
            if (remainingToRevert <= 0) break;
            const maxCanRevert = computeMaxCanRevert(c);
            const alreadyAllocated = revertMap.get(c.id) || 0;
            const remainingCanRevert = Math.max(0, Number((maxCanRevert - alreadyAllocated).toFixed(2)));
            if (remainingCanRevert <= 0 || isNaN(remainingCanRevert)) continue;
            const toRevert = Math.min(remainingToRevert, remainingCanRevert);
            if (toRevert > 0 && !isNaN(toRevert)) {
              const rounded = Number(toRevert.toFixed(2));
              revertMap.set(c.id, Number((alreadyAllocated + rounded).toFixed(2)));
              remainingToRevert = Number((remainingToRevert - rounded).toFixed(2));
            }
          }
        }

        if (revertMap.size > 0) {
          set((state) => ({
            thirdPartyCharges: state.thirdPartyCharges.map((charge) => {
              const revertAmt = revertMap.get(charge.id);
              if (!revertAmt || revertAmt <= 0) return charge;
              return applyThirdPartyChargeRevertDelta(charge, revertAmt, {
                remainingTransactions,
                revertedTxDate,
                people: state.people,
              });
            }),
          }));
          debtSyncHandlers.onDebtAddedOrUpdated?.();
          return true;
        }

        return false;
      },

      reconcileThirdPartyCurrentPeriod: (
        activeTransactions: ReconcileTransactionRef[],
        referenceDate: Date = new Date()
      ): void => {
        const refDate =
          referenceDate instanceof Date && !isNaN(referenceDate.getTime())
            ? referenceDate
            : new Date();
        const reimbursements = (activeTransactions || []).filter(
          (t) => t.type === 'reimbursement'
        );

        const statePeople = get().people;
        let updatedAny = false;

        const nextCharges = get().thirdPartyCharges.map((charge) => {
          const currentPeriodPaid = charge.currentPeriodPaidAmount || 0;

          const latestTxDateStr = findLatestPaymentDateForCharge(
            charge,
            reimbursements,
            statePeople
          );
          const parsedLatestTx = latestTxDateStr ? new Date(latestTxDateStr) : null;
          const parsedLastPay = charge.lastPaymentDate ? new Date(charge.lastPaymentDate) : null;
          const cycleDate =
            parsedLastPay && !isNaN(parsedLastPay.getTime())
              ? parsedLastPay
              : parsedLatestTx && !isNaN(parsedLatestTx.getTime())
              ? parsedLatestTx
              : refDate;

          const getAppliedToCharge = (tx: ReconcileTransactionRef): number => {
            if (tx.thirdPartyAllocations && tx.thirdPartyAllocations.length > 0) {
              const alloc = tx.thirdPartyAllocations.find((a) =>
                isSameEntityId(a.chargeId, charge.id)
              );
              return alloc ? alloc.appliedAmount || 0 : 0;
            }
            if (isSameEntityId(tx.relatedChargeId, charge.id)) {
              return tx.amount || 0;
            }
            const hasExplicitLinks =
              Boolean(tx.relatedChargeId) ||
              Boolean(tx.thirdPartyAllocations && tx.thirdPartyAllocations.length > 0);
            if (!hasExplicitLinks && doesTxMatchPersonForCharge(tx, charge, statePeople)) {
              return tx.amount || 0;
            }
            return 0;
          };

          const cycleAllocatedAmount = reimbursements.reduce((sum, tx) => {
            if (!isSameYearAndMonth(tx.date || tx.createdAt, cycleDate)) {
              return sum;
            }
            return sum + getAppliedToCharge(tx);
          }, 0);

          const totalActiveAllocatedAllTime = reimbursements.reduce(
            (sum, tx) => sum + getAppliedToCharge(tx),
            0
          );

          // Caso A: Autocuración reconstructiva
          // Si el cargo en memoria/sync tiene currentPeriodPaidAmount menor al monto
          // asignado según las transacciones activas del ciclo (incluyendo currentPeriodPaid <= 0),
          // reconstruir amortizaciones, cuotas y saldos correspondientes.
          if (cycleAllocatedAmount > 0 && currentPeriodPaid < cycleAllocatedAmount - 0.001) {
            const { installmentsCount, monthlyAmount, initialPaid, maxInitialRemaining } =
              getThirdPartyChargeBounds(charge);

            const newPeriodPaid = Number(cycleAllocatedAmount.toFixed(2));
            let newRemaining = Math.max(
              0,
              Number((maxInitialRemaining - totalActiveAllocatedAllTime).toFixed(2))
            );

            const isSettled =
              newRemaining <= 0.05 && (newRemaining === 0 || maxInitialRemaining > 0.05);
            if (isSettled) {
              newRemaining = 0;
            }

            const appCoveredAmount = Math.max(
              0,
              Number((maxInitialRemaining - newRemaining).toFixed(2))
            );
            const newPaidInstallments = isSettled
              ? installmentsCount
              : monthlyAmount > 0
              ? Math.min(
                  installmentsCount,
                  initialPaid + Math.floor(parseFloat((appCoveredAmount / monthlyAmount).toFixed(4)))
                )
              : initialPaid;

            const effectiveLastPaymentDate =
              latestTxDateStr ?? charge.lastPaymentDate ?? cycleDate.toISOString();

            updatedAny = true;
            return {
              ...charge,
              currentPeriodPaidAmount: newPeriodPaid,
              remainingAmount: newRemaining,
              paidInstallmentsCount: newPaidInstallments,
              settled: isSettled,
              settledAt: isSettled ? (charge.settledAt ?? effectiveLastPaymentDate) : undefined,
              lastPaymentDate: effectiveLastPaymentDate,
            };
          }

          // Caso B: Si hay cobertura activa en el ciclo y el cargo ya está consistente, respetar
          const hasActiveCoverageInCycle =
            cycleAllocatedAmount > 0 ||
            reimbursements.some((tx) =>
              isTxCoveringChargeInCycle(tx, charge, statePeople, cycleDate)
            );
          if (hasActiveCoverageInCycle) {
            return charge;
          }

          // Si currentPeriodPaid <= 0 y no hay cobertura en ciclo, no hay nada que limpiar
          if (currentPeriodPaid <= 0) {
            return charge;
          }

          // Caso C: Limpieza de saldo fantasma (cuando currentPeriodPaid > 0 pero 0 transacciones activas)
          updatedAny = true;

          const { maxInitialRemaining } = getThirdPartyChargeBounds(charge);
          const maxRemainingOverride = Math.max(
            0,
            Number((maxInitialRemaining - totalActiveAllocatedAllTime).toFixed(2))
          );

          return applyThirdPartyChargeRevertDelta(charge, currentPeriodPaid, {
            remainingTransactions: reimbursements,
            people: statePeople,
            maxRemainingOverride,
          });
        });

        if (updatedAny) {
          set({ thirdPartyCharges: nextCharges });
          debtSyncHandlers.onDebtAddedOrUpdated?.();
        }
      },

      settleThirdPartyCharge: (id: string): void => {
        set((state) => ({
          thirdPartyCharges: state.thirdPartyCharges.map((c) =>
            c.id === id
              ? {
                  ...c,
                  remainingAmount: 0,
                  paidInstallmentsCount: c.installmentsCount,
                  settled: true,
                  settledAt: new Date().toISOString(),
                  lastPaymentDate: new Date().toISOString(),
                }
              : c
          ),
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      settleThirdPartyChargeByPerson: (personName: string, cardName?: string): void => {
        let wasUpdated = false;
        set((state) => {
          const normPerson = personName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normCard = cardName ? cardName.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

          const target = state.thirdPartyCharges.find((c) => {
            if (c.settled) return false;
            const cPerson = c.personName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const personMatch =
              cPerson === normPerson ||
              cPerson.includes(normPerson) ||
              normPerson.includes(cPerson) ||
              cPerson.startsWith(normPerson.slice(0, 3));
            if (!personMatch) return false;

            if (normCard) {
              const cCard = c.cardName.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cCard === normCard || cCard.includes(normCard) || normCard.includes(cCard);
            }
            return true;
          });

          if (!target) return state;
          wasUpdated = true;

          return {
            thirdPartyCharges: state.thirdPartyCharges.map((c) =>
              c.id === target.id
                ? {
                    ...c,
                    remainingAmount: 0,
                    paidInstallmentsCount: c.installmentsCount,
                    settled: true,
                    settledAt: new Date().toISOString(),
                    lastPaymentDate: new Date().toISOString(),
                  }
                : c
            ),
          };
        });
        if (wasUpdated) {
          debtSyncHandlers.onDebtAddedOrUpdated?.();
        }
      },

      getThirdPartyMonthlyBillingSummary: (referenceDate: Date = new Date()): ThirdPartyPersonMonthlySummary[] => {
        const refDate =
          referenceDate instanceof Date && !isNaN(referenceDate.getTime())
            ? referenceDate
            : new Date();

        const activeCharges = get().thirdPartyCharges.filter((c) => {
          const remaining = c.remainingAmount !== undefined ? c.remainingAmount : c.amount;
          const paymentDate = c.lastPaymentDate ? new Date(c.lastPaymentDate) : null;
          const isSameCycleMonth = paymentDate
            ? paymentDate.getFullYear() === refDate.getFullYear() &&
              paymentDate.getMonth() === refDate.getMonth()
            : false;
          const effectivePaid = isSameCycleMonth ? (c.currentPeriodPaidAmount || 0) : 0;

          // Si una compra fue saldada en un mes anterior (c.settled y !isSameCycleMonth),
          // NO debe incluirse en el resumen activo del nuevo mes (pertenece al historial de liquidadas).
          if (c.settled && !isSameCycleMonth) {
            return false;
          }

          // Solo se retiene en el resumen activo si no está liquidada (!c.settled && remaining > 0)
          // o si fue saldada en el ciclo actual (c.settled && isSameCycleMonth)
          return (!c.settled && remaining > 0) || (c.settled && isSameCycleMonth) || effectivePaid > 0;
        });
        const summaryMap = new Map<string, ThirdPartyPersonMonthlySummary>();

        for (const rawCharge of activeCharges) {
          const remainingAmount =
            rawCharge.remainingAmount !== undefined ? rawCharge.remainingAmount : rawCharge.amount;
          const installmentsCount =
            rawCharge.installmentsCount && rawCharge.installmentsCount > 0 ? rawCharge.installmentsCount : 1;
          const monthlyInstallmentAmount =
            rawCharge.monthlyInstallmentAmount && rawCharge.monthlyInstallmentAmount > 0
              ? rawCharge.monthlyInstallmentAmount
              : Math.round((rawCharge.amount / (installmentsCount || 1)) * 100) / 100;

          const paymentDate = rawCharge.lastPaymentDate ? new Date(rawCharge.lastPaymentDate) : null;
          const isSameCycleMonth = paymentDate
            ? paymentDate.getFullYear() === refDate.getFullYear() &&
              paymentDate.getMonth() === refDate.getMonth()
            : false;
          const effectivePaid = isSameCycleMonth ? (rawCharge.currentPeriodPaidAmount || 0) : 0;

          const c: ThirdPartyCardCharge = {
            ...rawCharge,
            remainingAmount,
            installmentsCount,
            monthlyInstallmentAmount,
          };

          const person = get().people.find(
            (p) =>
              (Boolean(c.personId) && p.id === c.personId) ||
              normalizeStr(p.name) === normalizeStr(c.personName)
          );
          const personKey = normalizeStr(person?.name || c.personName);
          const groupKey = personKey;

          let summary = summaryMap.get(groupKey);
          if (!summary) {
            summary = {
              personId: person?.id || c.personId,
              personName: person?.name || c.personName,
              cardId: c.cardId,
              cardName: c.cardName || 'Tarjeta Principal',
              monthlyDueAmount: 0,
              monthlyPaidAmount: 0,
              monthlyPendingAmount: 0,
              isMonthSettled: false,
              totalRemainingDebt: 0,
              chargesCount: 0,
              charges: [],
            };
            summaryMap.set(groupKey, summary);
          } else {
            const currentCardLower = summary.cardName.toLowerCase();
            const newCardName = (c.cardName || '').trim();
            if (newCardName && !currentCardLower.includes(newCardName.toLowerCase())) {
              summary.cardName = `${summary.cardName} / ${newCardName}`;
            }
          }

          const due = c.installmentsCount <= 1
            ? parseFloat((c.remainingAmount + effectivePaid).toFixed(2))
            : Math.min(
                c.monthlyInstallmentAmount,
                parseFloat((c.remainingAmount + effectivePaid).toFixed(2))
              );

          summary.monthlyDueAmount = parseFloat((summary.monthlyDueAmount + due).toFixed(2));
          summary.monthlyPaidAmount = parseFloat((summary.monthlyPaidAmount + effectivePaid).toFixed(2));
          summary.totalRemainingDebt = parseFloat((summary.totalRemainingDebt + c.remainingAmount).toFixed(2));
          summary.charges.push(c);
        }

        const result: ThirdPartyPersonMonthlySummary[] = [];

        for (const summary of summaryMap.values()) {
          const monthlyPending = Math.max(
            0,
            parseFloat((summary.monthlyDueAmount - summary.monthlyPaidAmount).toFixed(2))
          );
          summary.monthlyPendingAmount = monthlyPending;
          summary.isMonthSettled = monthlyPending <= 0;
          summary.chargesCount = summary.charges.length;
          result.push(summary);
        }

        return result.sort((a, b) => b.monthlyPendingAmount - a.monthlyPendingAmount);
      },

      addFriendLoan: (data: {
        friendName: string;
        principalAmount: number;
        interestRate?: number;
        dueDate: string;
        notes?: string;
        initialPaidAmount?: number;
        isPreexisting?: boolean;
        createdAt?: string;
      }): FriendLoan => {
        const rate = Number(data.interestRate || 0);
        const totalAmount = Number((data.principalAmount * (1 + rate / 100)).toFixed(2));
        const paidInitially = Math.max(0, Math.min(totalAmount, data.initialPaidAmount || 0));
        const remaining = Number(Math.max(0, totalAmount - paidInitially).toFixed(2));
        const newLoan: FriendLoan = {
          id: `fl-${Date.now()}`,
          friendName: data.friendName,
          principalAmount: data.principalAmount,
          interestRate: rate,
          totalToCollect: totalAmount,
          totalAmount,
          paidAmount: paidInitially,
          initialPaidAmount: paidInitially,
          isPreexisting: data.isPreexisting,
          notes: data.notes,
          remainingAmount: remaining,
          dueDate: data.dueDate,
          status: remaining <= 0 ? 'paid' : paidInitially > 0 ? 'partial' : 'active',
          settled: remaining <= 0,
          createdAt: data.createdAt ?? new Date().toISOString(),
        };
        set((state) => ({
          friendLoans: [...state.friendLoans, newLoan],
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
        return newLoan;
      },

      deleteFriendLoan: (id: string): boolean => {
        const target = get().friendLoans.find((l) => l.id === id);
        if (!target) return false;
        const totalLoanAmount = target.totalAmount ?? target.totalToCollect;
        if (target.isPreexisting) {
          const initialPaid = target.initialPaidAmount ?? 0;
          const initialRemaining = Number(Math.max(0, totalLoanAmount - initialPaid).toFixed(2));
          const hasNewPayments = target.remainingAmount < initialRemaining - 0.001;
          if (hasNewPayments) {
            return false;
          }
        } else {
          const hasPayments =
            (target.paidAmount || 0) > 0 || target.remainingAmount < totalLoanAmount;
          if (hasPayments) {
            return false;
          }
        }
        set((state) => ({
          friendLoans: state.friendLoans.filter((l) => l.id !== id),
        }));
        debtSyncHandlers.onFriendLoanDeleted?.(id);
        return true;
      },

      collectFriendLoan: (id: string, amount: number): void => {
        set((state) => ({
          friendLoans: state.friendLoans.map((l) => {
            if (l.id !== id) return l;
            const newRemaining = Math.max(0, l.remainingAmount - amount);
            const isSettled = newRemaining <= 0.001;
            const newPaid = Number(((l.paidAmount || 0) + amount).toFixed(2));
            return {
              ...l,
              paidAmount: newPaid,
              remainingAmount: isSettled ? 0 : Number(newRemaining.toFixed(2)),
              status: isSettled ? 'paid' : newPaid > 0 ? 'partial' : 'active',
              settled: isSettled,
              ...(isSettled ? { settledAt: new Date().toISOString() } : {}),
            };
          }),
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      revertFriendLoanCollection: (loanId: string, amount: number): void => {
        set((state) => ({
          friendLoans: state.friendLoans.map((loan) => {
            if (loan.id !== loanId) return loan;
            let newRemaining = loan.remainingAmount + amount;
            if (loan.totalToCollect) {
              newRemaining = Math.min(newRemaining, loan.totalToCollect);
            }
            const newPaid = Math.max(0, Number(((loan.paidAmount || 0) - amount).toFixed(2)));
            return {
              ...loan,
              paidAmount: newPaid,
              remainingAmount: Number(newRemaining.toFixed(2)),
              status: newPaid > 0 ? 'partial' : 'active',
              settled: false,
              settledAt: undefined,
            };
          }),
        }));
        debtSyncHandlers.onDebtAddedOrUpdated?.();
      },

      getTotalPersonalDebt: (): number => {
        return parseFloat(
          get()
            .personalDebts.filter((d) => !d.settled)
            .reduce((sum, d) => sum + d.remainingAmount, 0)
            .toFixed(2)
        );
      },

      getTotalThirdPartyReceivable: (): number => {
        return parseFloat(
          get()
            .thirdPartyCharges.filter((c) => !c.settled)
            .reduce((sum, c) => sum + (c.remainingAmount !== undefined ? c.remainingAmount : c.amount), 0)
            .toFixed(2)
        );
      },

      getTotalFriendLoansReceivable: (): number => {
        return parseFloat(
          get()
            .friendLoans.filter((l) => !l.settled)
            .reduce((sum, l) => sum + l.remainingAmount, 0)
            .toFixed(2)
        );
      },

      clearAllDebts: (): void =>
        set({ personalDebts: [], thirdPartyCharges: [], friendLoans: [] }),

      resetDebtsStore: (): void =>
        set({ personalDebts: [], thirdPartyCharges: [], friendLoans: [], people: [] }),
    }),
    {
      name: 'controlfynz-debts-storage-v2',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

export const resetDebtsStore = (): void => {
  useDebtsStore.getState().resetDebtsStore();
};

/**
 * Agrupación de deudas personales por entidad bancaria / acreedor.
 * Cada grupo contiene sus préstamos ordenados de MENOR a MAYOR saldo restante.
 */
export interface PersonalDebtBankGroup {
  entityName: string;
  debts: PersonalDebt[];
  totalRemaining: number;
}

export const groupPersonalDebtsByBank = (
  debts: PersonalDebt[],
  banksMap?: Record<string, string>
): PersonalDebtBankGroup[] => {
  const groupMap = new Map<string, PersonalDebtBankGroup>();

  for (const debt of debts) {
    let entityName = (debt.entity || '').trim();
    if (debt.bankId && banksMap && banksMap[debt.bankId]) {
      entityName = banksMap[debt.bankId];
    }
    if (!entityName) {
      entityName = 'Otras Entidades';
    }

    let group = groupMap.get(entityName);
    if (!group) {
      group = {
        entityName,
        debts: [],
        totalRemaining: 0,
      };
      groupMap.set(entityName, group);
    }
    group.debts.push(debt);
    group.totalRemaining += debt.remainingAmount !== undefined ? debt.remainingAmount : debt.totalAmount;
  }

  const result: PersonalDebtBankGroup[] = [];
  for (const group of groupMap.values()) {
    group.debts.sort((a, b) => {
      const remA = a.remainingAmount !== undefined ? a.remainingAmount : a.totalAmount;
      const remB = b.remainingAmount !== undefined ? b.remainingAmount : b.totalAmount;
      return remA - remB;
    });
    result.push(group);
  }

  return result;
};

/**
 * Agrupación de cargos de terceros por Tarjeta / Banco emisor.
 * Cada tarjeta contiene sus compras ordenadas de MENOR a MAYOR saldo restante.
 */
export interface ThirdPartyCardChargesGroup {
  cardName: string;
  charges: ThirdPartyCardCharge[];
  totalRemaining: number;
  totalOriginal: number;
}

export const groupThirdPartyChargesByCard = (
  charges: ThirdPartyCardCharge[]
): ThirdPartyCardChargesGroup[] => {
  const cardMap = new Map<string, ThirdPartyCardChargesGroup>();

  for (const charge of charges) {
    const cardName = (charge.cardName || 'Tarjeta Principal').trim();
    let group = cardMap.get(cardName);
    if (!group) {
      group = {
        cardName,
        charges: [],
        totalRemaining: 0,
        totalOriginal: 0,
      };
      cardMap.set(cardName, group);
    }
    group.charges.push(charge);
    const orig = charge.totalAmount || charge.amount || 0;
    const rem = charge.remainingAmount !== undefined ? charge.remainingAmount : orig;
    group.totalRemaining = parseFloat((group.totalRemaining + rem).toFixed(2));
    group.totalOriginal = parseFloat((group.totalOriginal + orig).toFixed(2));
  }

  const result: ThirdPartyCardChargesGroup[] = [];
  for (const group of cardMap.values()) {
    group.charges.sort((a, b) => {
      const remA = a.remainingAmount !== undefined ? a.remainingAmount : (a.totalAmount || a.amount);
      const remB = b.remainingAmount !== undefined ? b.remainingAmount : (b.totalAmount || b.amount);
      return remA - remB;
    });
    result.push(group);
  }

  return result;
};

/**
 * Información de cobertura visual para compras de terceros.
 */
export type ThirdPartyChargeCoverageStatus = 'covered' | 'amortizing' | 'pending';

export interface ThirdPartyCoverageInfo {
  status: ThirdPartyChargeCoverageStatus;
  badgeLabel: 'CUBIERTO' | 'EN AMORTIZACIÓN' | 'POR CUBRIR';
  color: string;
  originalAmount: number;
  remainingAmount: number;
  amortizedAmount: number;
}

export const getThirdPartyCoverageInfo = (
  charge: ThirdPartyCardCharge
): ThirdPartyCoverageInfo => {
  const originalAmount = charge.totalAmount || charge.amount || 0;
  const remainingAmount =
    charge.remainingAmount !== undefined ? charge.remainingAmount : originalAmount;
  const amortizedAmount = Math.max(0, originalAmount - remainingAmount);

  if (charge.settled || remainingAmount <= 0) {
    return {
      status: 'covered',
      badgeLabel: 'CUBIERTO',
      color: '#00FFA3',
      originalAmount,
      remainingAmount: 0,
      amortizedAmount: originalAmount,
    };
  }

  if (remainingAmount < originalAmount && remainingAmount > 0) {
    return {
      status: 'amortizing',
      badgeLabel: 'EN AMORTIZACIÓN',
      color: '#FF9F0A',
      originalAmount,
      remainingAmount,
      amortizedAmount,
    };
  }

  return {
    status: 'pending',
    badgeLabel: 'POR CUBRIR',
    color: '#FF453A',
    originalAmount,
    remainingAmount,
    amortizedAmount: 0,
  };
};


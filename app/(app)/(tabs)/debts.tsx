import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { useIsWide } from '../../../src/hooks/use-responsive';
import DebtsSummaryCard from '../../../src/components/debts/debts-summary-card';
import { getDebtDueStatus } from '../../../src/utils/date-helpers';
import {
  useDebtsStore,
  type PersonalDebt,
  type FriendLoan,
  type ThirdPartyCardCharge,
  type ThirdPartyPersonMonthlySummary,
  type PersonalDebtBankGroup,
  type ThirdPartyCardChargesGroup,
  groupPersonalDebtsByBank,
  groupThirdPartyChargesByCard,
  getThirdPartyCoverageInfo,
} from '../../../src/store/debts-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useTransactionsStore } from '../../../src/store/transactions-store';
import { useCardsStore } from '../../../src/store/cards-store';

type FilterType = 'all' | 'personal' | 'receivables' | 'settled';

const MONTH_NAMES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const formatDate = (isoOrDateStr?: string): string => {
  if (!isoOrDateStr) return 'Reciente';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const day = d.getDate();
    const month = MONTH_NAMES_ES[d.getMonth()] ?? '';
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return isoOrDateStr;
  }
};

interface RecurringCutDateResult {
  effectiveDay: number;
  nextDueDateFormatted: string; // ej: "22 Oct"
  fullFormatted: string; // ej: "Próximo corte: 22 Oct"
  daysRemaining: number;
}

/**
 * Algoritmo de Cálculo de Vencimiento Recurrente con End-of-Month Clamping:
 * Si dueDay supera los días del mes (ej: 31 en febrero o abril), se ajusta automáticamente
 * al último día válido de ese mes (28/29 o 30).
 */
const calculateRecurringDueDate = (
  dueDay?: number,
  dueDateStr?: string
): RecurringCutDateResult => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 a 11
  const todayDate = today.getDate();

  let resolvedDueDay = dueDay;
  if (!resolvedDueDay && dueDateStr) {
    const match = dueDateStr.match(/(?:día|dia)\s*(\d{1,2})/i);
    if (match) {
      resolvedDueDay = parseInt(match[1], 10);
    } else {
      const parts = dueDateStr.split('-');
      if (parts.length === 3) {
        const parsedDay = parseInt(parts[2], 10);
        if (!isNaN(parsedDay)) resolvedDueDay = parsedDay;
      }
    }
  }

  if (resolvedDueDay && resolvedDueDay >= 1 && resolvedDueDay <= 31) {
    const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const effectiveDayThisMonth = Math.min(resolvedDueDay, lastDayThisMonth);

    let targetYear = currentYear;
    let targetMonth = currentMonth;
    let effectiveDay = effectiveDayThisMonth;

    if (todayDate > effectiveDayThisMonth) {
      // El corte de este mes ya transcurrió; proyectar al mes siguiente
      targetMonth = currentMonth + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
      const lastDayNextMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      effectiveDay = Math.min(resolvedDueDay, lastDayNextMonth);
    }

    const targetDate = new Date(targetYear, targetMonth, effectiveDay, 23, 59, 59);
    const msDiff = targetDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    const nombreMes = MONTH_NAMES_ES[targetMonth] ?? '';
    const nextDueDateFormatted = `${effectiveDay} ${nombreMes}`;

    return {
      effectiveDay,
      nextDueDateFormatted,
      fullFormatted: `Próximo corte: ${nextDueDateFormatted}`,
      daysRemaining,
    };
  }

  return {
    effectiveDay: 1,
    nextDueDateFormatted: dueDateStr ?? 'Pendiente',
    fullFormatted: `Próximo corte: ${dueDateStr ?? 'Pendiente'}`,
    daysRemaining: 0,
  };
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getUrgencyInfo = (
  daysRemaining: number
): { color: string; text: string; bg: string; border: string } => {
  if (daysRemaining <= 0) {
    return {
      color: colors.error,
      text: '¡Vencido!',
      bg: 'rgba(255, 69, 58, 0.12)',
      border: 'rgba(255, 69, 58, 0.35)',
    };
  }
  if (daysRemaining <= 5) {
    return {
      color: '#FF9F0A',
      text: `¡Por vencer! (${daysRemaining}d)`,
      bg: 'rgba(255, 159, 10, 0.12)',
      border: 'rgba(255, 159, 10, 0.35)',
    };
  }
  return {
    color: colors.primary,
    text: `En plazo (${daysRemaining}d)`,
    bg: 'rgba(0, 255, 163, 0.10)',
    border: 'rgba(0, 255, 163, 0.30)',
  };
};

interface FriendLoanDueDateInfo {
  formattedDate: string;
  statusText: string;
  daysRemaining: number;
  isOverdue: boolean;
  statusColor: string;
}

const getFriendLoanDueDateInfo = (dueDateStr?: string): FriendLoanDueDateInfo => {
  if (!dueDateStr || dueDateStr === 'Por definir') {
    return {
      formattedDate: 'Por definir',
      statusText: 'Sin fecha límite',
      daysRemaining: 0,
      isOverdue: false,
      statusColor: colors.textSecondary,
    };
  }

  let targetDate: Date | null = null;

  // Si viene en formato DD/MM/AAAA
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dueDateStr)) {
    const parts = dueDateStr.split('/');
    targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  } else if (/^\d{4}-\d{2}-\d{2}/.test(dueDateStr)) {
    const parts = dueDateStr.split('T')[0].split('-');
    targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    const parsed = new Date(dueDateStr);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return {
      formattedDate: dueDateStr,
      statusText: 'Fecha personalizada',
      daysRemaining: 0,
      isOverdue: false,
      statusColor: colors.textSecondary,
    };
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const msDiff = targetMidnight.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.round(msDiff / (1000 * 60 * 60 * 24));

  const day = targetDate.getDate();
  const monthName = MONTH_NAMES_ES[targetDate.getMonth()] ?? '';
  const year = targetDate.getFullYear();
  const formattedDate = `${day} ${monthName} ${year}`;

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      formattedDate,
      statusText: `¡Vencido hace ${overdueDays} ${overdueDays === 1 ? 'día' : 'días'}!`,
      daysRemaining,
      isOverdue: true,
      statusColor: colors.error,
    };
  }

  if (daysRemaining === 0) {
    return {
      formattedDate,
      statusText: '¡Vence hoy!',
      daysRemaining: 0,
      isOverdue: false,
      statusColor: '#FF9F0A',
    };
  }

  if (daysRemaining <= 5) {
    return {
      formattedDate,
      statusText: `En ${daysRemaining} días (¡Próximo!)`,
      daysRemaining,
      isOverdue: false,
      statusColor: '#FF9F0A',
    };
  }

  return {
    formattedDate,
    statusText: `En ${daysRemaining} días`,
    daysRemaining,
    isOverdue: false,
    statusColor: '#0A84FF',
  };
};

const DebtsScreen = (): JSX.Element => {
  const isWide = useIsWide(768);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoanForAbono, setSelectedLoanForAbono] = useState<FriendLoan | null>(null);
  const [customAbonoAmount, setCustomAbonoAmount] = useState<string>('');
  const [abonoError, setAbonoError] = useState<string | null>(null);

  // Estados para modal de abono de compra compartida (terceros)
  const [selectedSummaryForAbono, setSelectedSummaryForAbono] = useState<ThirdPartyPersonMonthlySummary | null>(null);
  const [thirdPartyAbonoAmount, setThirdPartyAbonoAmount] = useState<string>('');
  const [thirdPartyAbonoError, setThirdPartyAbonoError] = useState<string | null>(null);
  const [collapsedSummaries, setCollapsedSummaries] = useState<Record<string, boolean>>({});
  const [chargeToDelete, setChargeToDelete] = useState<ThirdPartyCardCharge | null>(null);
  const [personalDebtToDelete, setPersonalDebtToDelete] = useState<PersonalDebt | null>(null);
  const [friendLoanToDelete, setFriendLoanToDelete] = useState<FriendLoan | null>(null);


  // Estados para modal de pago de deuda personal
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<PersonalDebt | null>(null);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState<string>('');
  const [debtPaymentError, setDebtPaymentError] = useState<string | null>(null);
  const [debtPaymentMode, setDebtPaymentMode] = useState<'next' | 'last'>('next');
  const [lastInstallmentsCount, setLastInstallmentsCount] = useState<number>(1);

  const [focusRefreshKey, setFocusRefreshKey] = useState<number>(0);

  // Store data y acciones
  const banks = useCardsStore((state) => state.banks);
  const [selectedDestinationBankId, setSelectedDestinationBankId] = useState<string | null>(
    () => (banks.length > 0 ? banks[0].id : null)
  );
  const [selectedFriendLoanBankId, setSelectedFriendLoanBankId] = useState<string | null>(
    () => (banks.length > 0 ? banks[0].id : null)
  );
  const [selectedDebtPaymentBankId, setSelectedDebtPaymentBankId] = useState<string | null>(
    () => (banks.length > 0 ? banks[0].id : null)
  );
  const people = useDebtsStore((state) => state.people);
  const personalDebts = useDebtsStore((state) => state.personalDebts);
  const purePersonalDebts = useMemo(
    () => personalDebts.filter((d) => d.category !== 'credit_card' && !d.cardId),
    [personalDebts]
  );
  const friendLoans = useDebtsStore((state) => state.friendLoans);
  const thirdPartyCharges = useDebtsStore((state) => state.thirdPartyCharges);
  const totalPersonalDebt = useMemo((): number => {
    return purePersonalDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [purePersonalDebts, focusRefreshKey]);
  const totalThirdPartyChargesReceivable = useMemo((): number => {
    return thirdPartyCharges
      .filter((c) => !c.settled)
      .reduce((acc, c) => acc + (c.remainingAmount !== undefined ? c.remainingAmount : c.amount), 0);
  }, [thirdPartyCharges, focusRefreshKey]);
  const totalFriendLoansReceivable = useMemo((): number => {
    return friendLoans
      .filter((l) => !l.settled)
      .reduce((acc, l) => acc + l.remainingAmount, 0);
  }, [friendLoans, focusRefreshKey]);
  const totalThirdPartyReceivable = useMemo((): number => {
    const chargesTotal = thirdPartyCharges
      .filter((c) => !c.settled)
      .reduce((acc, c) => acc + (c.remainingAmount !== undefined ? c.remainingAmount : c.amount), 0);
    const loansTotal = friendLoans
      .filter((l) => !l.settled)
      .reduce((acc, l) => acc + l.remainingAmount, 0);
    return chargesTotal + loansTotal;
  }, [thirdPartyCharges, friendLoans, focusRefreshKey]);
  const payPersonalDebt = useDebtsStore((state) => state.payPersonalDebt);
  const deletePersonalDebt = useDebtsStore((state) => state.deletePersonalDebt);
  const collectFriendLoan = useDebtsStore((state) => state.collectFriendLoan);
  const deleteFriendLoan = useDebtsStore((state) => state.deleteFriendLoan);
  const recordMonthlyPersonAbono = useDebtsStore(
    (state) => state.recordMonthlyPersonAbono
  );
  const deleteThirdPartyCharge = useDebtsStore(
    (state) => state.deleteThirdPartyCharge
  );
  const addTransaction = useTransactionsStore((state) => state.addTransaction);
  const removeInitialLoanTransactions = useTransactionsStore(
    (state) => state.removeInitialLoanTransactions
  );

  const prevChargesCountRef = useRef<number>(thirdPartyCharges.length);

  useFocusEffect(
    useCallback(() => {
      setFocusRefreshKey((prev) => prev + 1);
      const latestCharges = useDebtsStore.getState().thirdPartyCharges;
      if (latestCharges.length > prevChargesCountRef.current) {
        setFilter('receivables');
        setCollapsedSummaries({});
        setSearchQuery('');
      }
      prevChargesCountRef.current = latestCharges.length;
    }, [])
  );

  const thirdPartyMonthlySummaries = useMemo((): ThirdPartyPersonMonthlySummary[] => {
    const normalizeStr = (str: string): string =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const activeCharges = thirdPartyCharges.filter((c) => {
      const remaining = c.remainingAmount !== undefined ? c.remainingAmount : c.amount;
      return (!c.settled && remaining > 0) || ((c.currentPeriodPaidAmount || 0) > 0);
    });

    const summaryMap = new Map<string, ThirdPartyPersonMonthlySummary>();

    for (const rawCharge of activeCharges) {
      const installmentsCount =
        rawCharge.installmentsCount && rawCharge.installmentsCount > 0
          ? rawCharge.installmentsCount
          : 1;
      const remainingAmount =
        rawCharge.remainingAmount !== undefined ? rawCharge.remainingAmount : rawCharge.amount;
      const monthlyInstallmentAmount =
        rawCharge.monthlyInstallmentAmount && rawCharge.monthlyInstallmentAmount > 0
          ? rawCharge.monthlyInstallmentAmount
          : Math.round((rawCharge.amount / installmentsCount) * 100) / 100;

      const c: ThirdPartyCardCharge = {
        ...rawCharge,
        remainingAmount,
        installmentsCount,
        monthlyInstallmentAmount,
      };

      const person = people.find(
        (p) =>
          (Boolean(c.personId) && p.id === c.personId) ||
          normalizeStr(p.name) === normalizeStr(c.personName)
      );
      const resolvedPersonName = (person?.name || c.personName || 'Tercero').trim();
      const resolvedPersonId = person?.id || c.personId;
      const groupKey = normalizeStr(resolvedPersonName);

      let summary = summaryMap.get(groupKey);
      if (!summary) {
        summary = {
          personName: resolvedPersonName,
          personId: resolvedPersonId,
          cardName: c.cardName || 'Tarjeta de Crédito',
          cardId: c.cardId,
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

      const chargeMonthlyDue =
        c.installmentsCount <= 1
          ? parseFloat((c.remainingAmount + (c.currentPeriodPaidAmount || 0)).toFixed(2))
          : Math.min(
              c.monthlyInstallmentAmount,
              parseFloat((c.remainingAmount + (c.currentPeriodPaidAmount || 0)).toFixed(2))
            );
      const chargeMonthlyPaid = c.currentPeriodPaidAmount || 0;

      summary.monthlyDueAmount = parseFloat(
        (summary.monthlyDueAmount + chargeMonthlyDue).toFixed(2)
      );
      summary.monthlyPaidAmount = parseFloat(
        (summary.monthlyPaidAmount + chargeMonthlyPaid).toFixed(2)
      );
      summary.totalRemainingDebt = parseFloat(
        (summary.totalRemainingDebt + c.remainingAmount).toFixed(2)
      );
      summary.charges.push(c);
    }

    const results: ThirdPartyPersonMonthlySummary[] = [];
    for (const summary of summaryMap.values()) {
      summary.monthlyPendingAmount = Math.max(
        0,
        parseFloat((summary.monthlyDueAmount - summary.monthlyPaidAmount).toFixed(2))
      );
      summary.isMonthSettled = summary.monthlyPendingAmount <= 0;
      summary.chargesCount = summary.charges.length;
      results.push(summary);
    }

    return results.sort((a, b) => b.monthlyPendingAmount - a.monthlyPendingAmount);
  }, [thirdPartyCharges, people, focusRefreshKey]);

  const totalReceivable = totalThirdPartyReceivable;
  const hasThirdPartyCharges =
    totalThirdPartyChargesReceivable > 0 ||
    thirdPartyCharges.length > 0 ||
    thirdPartyMonthlySummaries.length > 0;

  const currencyCode = useSettingsStore((state) => state.currency);
  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  // Cálculos agregados para DebtsSummaryCard
  const monthCommitment = useMemo(() => {
    return purePersonalDebts
      .filter((d) => (d.remainingAmount ?? d.totalAmount) > 0 && !d.settled)
      .reduce((sum, d) => sum + (d.monthlyPayment ?? 0), 0);
  }, [purePersonalDebts]);

  const totalOriginal = useMemo(() => {
    return purePersonalDebts.reduce((sum, d) => sum + d.totalAmount, 0);
  }, [purePersonalDebts]);

  // Filtros de búsqueda sobre la lista de deudas personales
  const filteredPersonalDebts = useMemo(() => {
    if (!searchQuery.trim()) return purePersonalDebts;
    const q = searchQuery.toLowerCase().trim();
    return purePersonalDebts.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.entity.toLowerCase().includes(q)
    );
  }, [purePersonalDebts, searchQuery]);

  // División de deudas personales activas vs liquidadas
  // Ordenadas de MENOR a MAYOR saldo por defecto
  const activePersonalDebts = useMemo(() => {
    return filteredPersonalDebts
      .filter((d) => (d.remainingAmount ?? d.totalAmount) > 0 && !d.settled)
      .sort((a, b) => (a.remainingAmount ?? a.totalAmount) - (b.remainingAmount ?? b.totalAmount));
  }, [filteredPersonalDebts]);

  // Agrupación visual por Entidad Bancaria / Acreedor
  const groupedPersonalDebts = useMemo((): PersonalDebtBankGroup[] => {
    const banksMap: Record<string, string> = {};
    for (const b of banks) {
      banksMap[b.id] = b.name;
    }
    return groupPersonalDebtsByBank(activePersonalDebts, banksMap);
  }, [activePersonalDebts, banks]);

  const settledPersonalDebts = useMemo(() => {
    return filteredPersonalDebts.filter(
      (d) => (d.remainingAmount ?? d.totalAmount) <= 0 || Boolean(d.settled)
    );
  }, [filteredPersonalDebts]);

  // Filtros de búsqueda sobre préstamos a amigos
  const filteredFriendLoans = useMemo(() => {
    if (!searchQuery.trim()) return friendLoans;
    const q = searchQuery.toLowerCase().trim();
    return friendLoans.filter((l) => l.friendName.toLowerCase().includes(q));
  }, [friendLoans, searchQuery]);

  // División de préstamos a amigos activos vs liquidados/cobrados
  const activeFriendLoans = useMemo(() => {
    return filteredFriendLoans.filter((l) => !l.settled && l.remainingAmount > 0);
  }, [filteredFriendLoans]);

  const settledFriendLoans = useMemo(() => {
    return filteredFriendLoans.filter((l) => Boolean(l.settled) || l.remainingAmount <= 0);
  }, [filteredFriendLoans]);

  // Compras de terceros saldadas / liquidadas
  const settledThirdPartyCharges = useMemo(() => {
    return thirdPartyCharges.filter(
      (c) => Boolean(c.settled) || (c.remainingAmount !== undefined && c.remainingAmount <= 0)
    );
  }, [thirdPartyCharges]);

  const filteredSettledThirdPartyCharges = useMemo(() => {
    if (!searchQuery.trim()) return settledThirdPartyCharges;
    const q = searchQuery.toLowerCase().trim();
    return settledThirdPartyCharges.filter(
      (c) =>
        c.personName.toLowerCase().includes(q) ||
        c.cardName.toLowerCase().includes(q) ||
        c.concept.toLowerCase().includes(q)
    );
  }, [settledThirdPartyCharges, searchQuery]);

  // Filtros de búsqueda sobre resúmenes de tarjetas de terceros
  const filteredThirdPartySummaries = useMemo(() => {
    if (!searchQuery.trim()) return thirdPartyMonthlySummaries;
    const q = searchQuery.toLowerCase().trim();
    return thirdPartyMonthlySummaries.filter(
      (s) =>
        s.personName.toLowerCase().includes(q) ||
        s.cardName.toLowerCase().includes(q) ||
        s.charges.some((c) => c.concept.toLowerCase().includes(q))
    );
  }, [thirdPartyMonthlySummaries, searchQuery]);

  const totalThirdPartyChargesCount = useMemo(() => {
    return filteredThirdPartySummaries.reduce((acc, s) => acc + s.charges.length, 0);
  }, [filteredThirdPartySummaries]);

  // Contadores para píldoras (reflejando compromisos y cuentas activas)
  const countPersonal = activePersonalDebts.length;
  const countReceivables =
    activeFriendLoans.length +
    filteredThirdPartySummaries.filter(
      (s) => !s.isMonthSettled || s.totalRemainingDebt > 0 || s.monthlyPaidAmount > 0
    ).length;
  const countAll = countPersonal + countReceivables;
  const countSettled =
    settledPersonalDebts.length +
    settledFriendLoans.length +
    filteredSettledThirdPartyCharges.length;

  const hasActivePersonal = activePersonalDebts.length > 0;
  const hasActiveFriendLoans = activeFriendLoans.length > 0;
  const hasActiveThirdParty = filteredThirdPartySummaries.length > 0;
  const hasActiveReceivables = hasActiveFriendLoans || hasActiveThirdParty;
  const hasAnyActive = hasActivePersonal || hasActiveReceivables;

  const handleOpenAbonoModal = (loan: FriendLoan): void => {
    setSelectedLoanForAbono(loan);
    setCustomAbonoAmount('');
    setAbonoError(null);
  };

  const handleCloseAbonoModal = (): void => {
    setSelectedLoanForAbono(null);
    setCustomAbonoAmount('');
    setAbonoError(null);
  };

  const handleAbonoAmountChange = (text: string): void => {
    let val = text.replace(',', '.');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setCustomAbonoAmount(val);

    if (!val.trim()) {
      setAbonoError(null);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setAbonoError('Ingresa un monto válido mayor a 0');
    } else if (selectedLoanForAbono && num > selectedLoanForAbono.remainingAmount) {
      setAbonoError(
        `El monto no puede superar ${currencySymbol}${formatAmount(selectedLoanForAbono.remainingAmount)} restantes`
      );
    } else {
      setAbonoError(null);
    }
  };

  const handleSetFiftyPercent = (): void => {
    if (!selectedLoanForAbono) return;
    const half = (selectedLoanForAbono.remainingAmount / 2).toFixed(2);
    setCustomAbonoAmount(half);
    setAbonoError(null);
  };

  const handleSetFullAmount = (): void => {
    if (!selectedLoanForAbono) return;
    const full = selectedLoanForAbono.remainingAmount.toFixed(2);
    setCustomAbonoAmount(full);
    setAbonoError(null);
  };

  const handleConfirmAbono = (): void => {
    if (!selectedLoanForAbono) return;
    const parsedAmount = parseFloat(customAbonoAmount);
    if (
      abonoError ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > selectedLoanForAbono.remainingAmount
    ) {
      return;
    }

    collectFriendLoan(selectedLoanForAbono.id, parsedAmount);
    addTransaction({
      title: `Abono de ${selectedLoanForAbono.friendName}`,
      amount: parsedAmount,
      type: 'income',
      category: 'Cobro Préstamo',
      relatedLoanId: selectedLoanForAbono.id,
      personName: selectedLoanForAbono.friendName,
      bankId: selectedFriendLoanBankId || undefined,
    });
    setSelectedLoanForAbono(null);
    setCustomAbonoAmount('');
    setAbonoError(null);
  };

  const parsedAbonoAmount = parseFloat(customAbonoAmount);
  const isConfirmDisabled =
    !selectedLoanForAbono ||
    Boolean(abonoError) ||
    isNaN(parsedAbonoAmount) ||
    parsedAbonoAmount <= 0 ||
    parsedAbonoAmount > (selectedLoanForAbono?.remainingAmount ?? 0);

  const maxRemainingInstallmentsForModal = useMemo((): number => {
    if (!selectedDebtForPayment) return 1;
    if (selectedDebtForPayment.totalInstallments && selectedDebtForPayment.totalInstallments > 0) {
      return Math.max(
        1,
        selectedDebtForPayment.totalInstallments - (selectedDebtForPayment.paidInstallments || 0)
      );
    }
    return 12;
  }, [selectedDebtForPayment]);

  const handleOpenDebtPaymentModal = (debt: PersonalDebt): void => {
    setSelectedDebtForPayment(debt);
    setDebtPaymentMode('next');
    setLastInstallmentsCount(1);
    if (debt.monthlyPayment && debt.monthlyPayment > 0) {
      setDebtPaymentAmount(Math.min(debt.monthlyPayment, debt.remainingAmount).toFixed(2));
    } else {
      setDebtPaymentAmount('');
    }
    setDebtPaymentError(null);
  };

  const handleCloseDebtPaymentModal = (): void => {
    setSelectedDebtForPayment(null);
    setDebtPaymentAmount('');
    setDebtPaymentError(null);
    setDebtPaymentMode('next');
    setLastInstallmentsCount(1);
  };

  const handleSelectDebtPaymentMode = (mode: 'next' | 'last'): void => {
    setDebtPaymentMode(mode);
    const targetCount = mode === 'last' ? lastInstallmentsCount : 1;
    if (selectedDebtForPayment?.monthlyPayment && selectedDebtForPayment.monthlyPayment > 0) {
      const nominal = Math.min(
        selectedDebtForPayment.monthlyPayment * targetCount,
        selectedDebtForPayment.remainingAmount
      );
      setDebtPaymentAmount(nominal.toFixed(2));
      setDebtPaymentError(null);
    }
  };

  const handleChangeLastInstallmentsCount = (delta: number): void => {
    const nextCount = Math.max(
      1,
      Math.min(maxRemainingInstallmentsForModal, lastInstallmentsCount + delta)
    );
    setLastInstallmentsCount(nextCount);
    if (selectedDebtForPayment?.monthlyPayment && selectedDebtForPayment.monthlyPayment > 0) {
      const nominal = Math.min(
        selectedDebtForPayment.monthlyPayment * nextCount,
        selectedDebtForPayment.remainingAmount
      );
      setDebtPaymentAmount(nominal.toFixed(2));
      setDebtPaymentError(null);
    }
  };

  const handleDebtPaymentAmountChange = (text: string): void => {
    let val = text.replace(',', '.');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setDebtPaymentAmount(val);

    if (!val.trim()) {
      setDebtPaymentError(null);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setDebtPaymentError('Ingresa un monto válido mayor a 0');
    } else if (selectedDebtForPayment && num > selectedDebtForPayment.remainingAmount) {
      setDebtPaymentError(
        `El monto no puede superar ${currencySymbol}${formatAmount(selectedDebtForPayment.remainingAmount)} restantes`
      );
    } else {
      setDebtPaymentError(null);
    }
  };

  const handleSetSuggestedInstallment = (): void => {
    if (!selectedDebtForPayment || !selectedDebtForPayment.monthlyPayment) return;
    const count = debtPaymentMode === 'last' ? lastInstallmentsCount : 1;
    const val = Math.min(
      selectedDebtForPayment.monthlyPayment * count,
      selectedDebtForPayment.remainingAmount
    ).toFixed(2);
    setDebtPaymentAmount(val);
    setDebtPaymentError(null);
  };

  const handleSetFullDebtPayment = (): void => {
    if (!selectedDebtForPayment) return;
    setDebtPaymentAmount(selectedDebtForPayment.remainingAmount.toFixed(2));
    setDebtPaymentError(null);
  };

  const handleConfirmDebtPayment = (): void => {
    if (!selectedDebtForPayment) return;
    const parsedAmount = parseFloat(debtPaymentAmount.replace(',', '.'));
    if (
      debtPaymentError ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > selectedDebtForPayment.remainingAmount
    ) {
      return;
    }

    const count = debtPaymentMode === 'last' ? lastInstallmentsCount : 1;
    const nominalQuotaValue =
      selectedDebtForPayment.monthlyPayment && selectedDebtForPayment.monthlyPayment > 0
        ? Math.min(
            selectedDebtForPayment.remainingAmount,
            Number((selectedDebtForPayment.monthlyPayment * count).toFixed(2))
          )
        : parsedAmount;
    const effectiveNominal = Math.max(parsedAmount, nominalQuotaValue);
    const discountSaved = Math.max(0, Number((effectiveNominal - parsedAmount).toFixed(2)));

    // 1. Ejecutar en debts store
    payPersonalDebt(selectedDebtForPayment.id, parsedAmount, {
      mode: debtPaymentMode,
      installmentsCount: count,
      nominalAmountExtinguished: effectiveNominal,
      discountSaved,
    });

    // 2. Ejecutar OBLIGATORIAMENTE en transactions store
    const titleSuffix =
      debtPaymentMode === 'last'
        ? ` (${count} ${count === 1 ? 'última cuota' : 'últimas cuotas'})`
        : '';
    addTransaction({
      title: `Pago de ${selectedDebtForPayment.title}${titleSuffix}`,
      amount: parsedAmount,
      type: 'expense',
      category: 'Pago Deudas',
      relatedDebtId: selectedDebtForPayment.id,
      debtPaymentMode,
      nominalDebtAmount: effectiveNominal,
      debtInstallmentsPaid: count,
      debtDiscountSaved: discountSaved,
      bankId: selectedDebtPaymentBankId || undefined,
    });

    // 3. Cerrar el modal
    setSelectedDebtForPayment(null);
    setDebtPaymentAmount('');
    setDebtPaymentError(null);
    setDebtPaymentMode('next');
    setLastInstallmentsCount(1);
  };

  const parsedDebtAmount = parseFloat(debtPaymentAmount);
  const isDebtPaymentDisabled =
    !selectedDebtForPayment ||
    Boolean(debtPaymentError) ||
    isNaN(parsedDebtAmount) ||
    parsedDebtAmount <= 0 ||
    parsedDebtAmount > (selectedDebtForPayment?.remainingAmount ?? 0);

  // Handlers para modal de abono de compras compartidas (terceros)
  const handleCloseThirdPartyAbonoModal = (): void => {
    setSelectedSummaryForAbono(null);
    setThirdPartyAbonoAmount('');
    setThirdPartyAbonoError(null);
  };

  const handleThirdPartyAbonoAmountChange = (text: string): void => {
    let val = text.replace(',', '.');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setThirdPartyAbonoAmount(val);

    if (!val.trim()) {
      setThirdPartyAbonoError(null);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setThirdPartyAbonoError('Ingresa un monto válido mayor a 0');
    } else if (
      selectedSummaryForAbono &&
      num > selectedSummaryForAbono.totalRemainingDebt
    ) {
      setThirdPartyAbonoError(
        `El abono no puede superar la deuda total de ${currencySymbol}${formatAmount(
          selectedSummaryForAbono.totalRemainingDebt
        )}`
      );
    } else {
      setThirdPartyAbonoError(null);
    }
  };

  // Atajo de teclado Escape en Web y Tauri para cerrar modales activos
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          handleCloseAbonoModal();
          handleCloseThirdPartyAbonoModal();
          handleCloseDebtPaymentModal();
          setChargeToDelete(null);
          setPersonalDebtToDelete(null);
          setFriendLoanToDelete(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  const handleSetThirdPartyCoverMonth = (): void => {
    if (!selectedSummaryForAbono) return;
    setThirdPartyAbonoAmount(
      selectedSummaryForAbono.monthlyPendingAmount > 0
        ? selectedSummaryForAbono.monthlyPendingAmount.toFixed(2)
        : selectedSummaryForAbono.totalRemainingDebt.toFixed(2)
    );
    setThirdPartyAbonoError(null);
  };

  const handleSetThirdPartyFullDebt = (): void => {
    if (!selectedSummaryForAbono) return;
    setThirdPartyAbonoAmount(selectedSummaryForAbono.totalRemainingDebt.toFixed(2));
    setThirdPartyAbonoError(null);
  };

  const handleConfirmThirdPartyAbono = (): void => {
    if (!selectedSummaryForAbono) return;
    const parsedAmount = parseFloat(thirdPartyAbonoAmount);
    if (
      thirdPartyAbonoError ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > selectedSummaryForAbono.totalRemainingDebt
    ) {
      return;
    }

    // 1. Ejecutar en debts store (sin limitar a una tarjeta para soporte multi-tarjeta global)
    const abonoResult = recordMonthlyPersonAbono(
      selectedSummaryForAbono.personName,
      parsedAmount,
      undefined,
      selectedSummaryForAbono.personId
    );

    // 2. Ejecutar en transactions store
    addTransaction({
      title: `Abono tarjeta de ${selectedSummaryForAbono.personName}`,
      amount: parsedAmount,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: selectedSummaryForAbono.personName,
      relatedPersonName: selectedSummaryForAbono.personName,
      cardName: selectedSummaryForAbono.cardName,
      bankId: selectedDestinationBankId || undefined,
      thirdPartyAllocations: abonoResult.allocations,
    });

    // 3. Cerrar el modal
    setSelectedSummaryForAbono(null);
    setThirdPartyAbonoAmount('');
    setThirdPartyAbonoError(null);
  };

  const renderPillsContent = (): JSX.Element => (
    <>
      <TouchableOpacity
        style={[styles.pill, filter === 'all' && styles.pillActive]}
        onPress={() => setFilter('all')}
        activeOpacity={0.7}
      >
        <Text style={[styles.pillText, filter === 'all' && styles.pillTextActive]}>
          Todas
        </Text>
        <View style={[styles.countBadge, filter === 'all' && styles.countBadgeActive]}>
          <Text style={[styles.countBadgeText, filter === 'all' && styles.countBadgeTextActive]}>
            {countAll}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, filter === 'personal' && styles.pillActive]}
        onPress={() => setFilter('personal')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="cash-outline"
          size={13}
          color={filter === 'personal' ? '#00FFA3' : colors.textSecondary}
        />
        <Text style={[styles.pillText, filter === 'personal' && { color: '#00FFA3', fontWeight: '700' }]}>
          Préstamos Bancarios
        </Text>
        <View style={[styles.countBadge, filter === 'personal' && { backgroundColor: 'rgba(0, 255, 163, 0.25)' }]}>
          <Text style={[styles.countBadgeText, filter === 'personal' && { color: '#00FFA3' }]}>
            {countPersonal}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, filter === 'receivables' && styles.pillActive]}
        onPress={() => setFilter('receivables')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-undo-outline"
          size={13}
          color={filter === 'receivables' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.pillText, filter === 'receivables' && styles.pillTextActive]}>
          Por Cobrar
        </Text>
        <View style={[styles.countBadge, filter === 'receivables' && styles.countBadgeActive]}>
          <Text style={[styles.countBadgeText, filter === 'receivables' && styles.countBadgeTextActive]}>
            {countReceivables}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, filter === 'settled' && styles.pillActive]}
        onPress={() => setFilter('settled')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="archive-outline"
          size={13}
          color={filter === 'settled' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.pillText, filter === 'settled' && styles.pillTextActive]}>
          Liquidadas
        </Text>
        <View style={[styles.countBadge, filter === 'settled' && styles.countBadgeActive]}>
          <Text style={[styles.countBadgeText, filter === 'settled' && styles.countBadgeTextActive]}>
            {countSettled}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );

  const parsedThirdPartyAmount = parseFloat(thirdPartyAbonoAmount);
  const isThirdPartyAbonoDisabled =
    !selectedSummaryForAbono ||
    Boolean(thirdPartyAbonoError) ||
    isNaN(parsedThirdPartyAmount) ||
    parsedThirdPartyAmount <= 0 ||
    parsedThirdPartyAmount > (selectedSummaryForAbono?.totalRemainingDebt ?? 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera estructurada según especificación */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.badgeContainer}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>RADAR DE PASIVOS Y COBROS</Text>
            </View>
            <TouchableOpacity
              style={styles.newDebtButton}
              onPress={() => router.push('/(app)/(modal)/new-debt')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#121212" />
              <Text style={styles.newDebtButtonText}>NUEVA DEUDA</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>GESTIÓN DE DEUDAS</Text>
        </View>

        {/* Tarjeta de Resumen Global de Deudas */}
        <DebtsSummaryCard
          totalDebt={totalPersonalDebt}
          personalDebt={totalPersonalDebt}
          thirdPartyDebt={totalReceivable}
          friendLoansTotal={totalFriendLoansReceivable}
          thirdPartyChargesTotal={totalThirdPartyChargesReceivable}
          monthCommitment={monthCommitment}
          totalOriginal={totalOriginal}
          currency={currencySymbol}
          onPressPersonal={() => setFilter('personal')}
          onPressThirdParty={() => setFilter('receivables')}
        />

        {/* Buscador de entidades y personas */}
        <View style={[styles.searchBar, isWide && styles.searchBarWide]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por acreedor, amigo o tarjeta..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros segmentados por píldoras */}
        {isWide ? (
          <View style={styles.pillsContainerWide}>
            {renderPillsContent()}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {renderPillsContent()}
          </ScrollView>
        )}

        {/* Empty state general cuando no hay ninguna deuda activa */}
        {filter === 'all' && !hasAnyActive && (
          <View style={styles.emptySectionCard}>
            <Ionicons name="shield-checkmark-outline" size={36} color={colors.primary} />
            <Text style={styles.emptySectionTitle}>Sin deudas activas</Text>
            <Text style={styles.emptySectionSubtitle}>
              {countSettled > 0
                ? '¡Estás al día! No tienes compromisos financieros pendientes. Puedes consultar tus deudas saldadas en la pestaña "Liquidadas".'
                : 'No tienes préstamos ni cuentas por cobrar registradas.'}
            </Text>
          </View>
        )}

        {/* SECCIÓN 1: MIS DEUDAS Y COMPROMISOS (PASIVOS) */}
        {(filter === 'personal' || (filter === 'all' && hasActivePersonal)) && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionBadgePersonal}>
                <Ionicons name="cash-outline" size={14} color="#00FFA3" />
                <Text style={styles.sectionBadgePersonalText}>PRÉSTAMOS BANCARIOS</Text>
              </View>
              <Text style={styles.sectionCountText}>
                {activePersonalDebts.length} {activePersonalDebts.length === 1 ? 'préstamo activo' : 'préstamos activos'}
              </Text>
            </View>

            {groupedPersonalDebts.length > 0 ? (
              groupedPersonalDebts.map((group) => {
                const showBankHeader = groupedPersonalDebts.length > 1 || group.debts.length > 1;
                return (
                  <View key={group.entityName} style={styles.bankGroupWrapper}>
                    {/* Encabezado de Entidad Bancaria / Acreedor */}
                    {showBankHeader && (
                      <View style={[styles.bankGroupHeaderCard, isWide && styles.bankGroupHeaderCardWide]}>
                        <View style={[styles.bankGroupHeaderLeft, isWide && styles.bankGroupHeaderLeftWide]}>
                          <View style={styles.bankGroupIconWrapper}>
                            <Ionicons name="business-outline" size={15} color="#00FFA3" />
                          </View>
                          <View style={styles.bankGroupInfoCol}>
                            <Text style={styles.bankGroupNameText} numberOfLines={1}>
                              {group.entityName}
                            </Text>
                            <Text style={styles.bankGroupSubtitleText} numberOfLines={1}>
                              {group.debts.length}{' '}
                              {group.debts.length === 1 ? 'préstamo activo' : 'préstamos activos'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.bankGroupTotalBadge}>
                          <Text style={styles.bankGroupTotalBadgeLabel}>SUBTOTAL</Text>
                          <Text style={styles.bankGroupTotalBadgeAmount}>
                            {currencySymbol}{formatAmount(group.totalRemaining)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Préstamos individuales ordenados de menor a mayor saldo */}
                    <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                      {group.debts.map((item) => {
                        const isSettled = (item.remainingAmount <= 0) || Boolean(item.settled);
                  const debtStatus = getDebtDueStatus(item.dueDay ?? 1, item.lastPaymentDate);
                  const isUpToDate = debtStatus.status === 'up_to_date' || debtStatus.isUpToDateThisMonth;
                  const dueInfo = calculateRecurringDueDate(item.dueDay, item.dueDate);
                  const urgency = getUrgencyInfo(dueInfo.daysRemaining);
                  const paid = Math.max(0, item.totalAmount - item.remainingAmount);
                  const pct =
                    item.totalAmount > 0
                      ? Math.min(100, Math.round((paid / item.totalAmount) * 100))
                      : 0;
                  const totalInstallments = item.totalInstallments || 0;
                  const paidInstallments = item.paidInstallments || 0;
                  const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);
                  const hasRecordedPayments = item.isPreexisting
                    ? (item.totalActualPaid || 0) > 0
                    : (item.paidInstallments || 0) > 0 ||
                      (item.totalActualPaid || 0) > 0 ||
                      item.remainingAmount < item.totalAmount;

                  return (
                    <View key={item.id} style={[styles.card, isWide && styles.cardWide]}>
                    {/* Cabecera de la tarjeta: Título + Entidad Bancaria + Urgencia / Liquidado */}
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.cardIconWrapperNeon,
                          (item.category === 'credit_card' || Boolean(item.cardId)) && styles.cardIconWrapperBlue,
                        ]}
                      >
                        <Ionicons
                          name={item.category === 'credit_card' || Boolean(item.cardId) ? 'card-outline' : 'cash-outline'}
                          size={18}
                          color={item.category === 'credit_card' || Boolean(item.cardId) ? '#0A84FF' : '#00FFA3'}
                        />
                      </View>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {item.category === 'credit_card' || Boolean(item.cardId) ? '💳' : '🏛️'} {item.entity}
                        </Text>
                      </View>
                      {isSettled ? (
                        <View style={styles.settledBadgeComplete}>
                          <Ionicons name="checkmark-done-circle" size={12} color="#00FFA3" />
                          <Text style={styles.settledBadgeCompleteText}>LIQUIDADO</Text>
                        </View>
                      ) : isUpToDate ? (
                        <View style={styles.upToDateBadgeNeon}>
                          <Ionicons name="checkmark-circle" size={12} color="#00FFA3" />
                          <Text style={styles.upToDateBadgeNeonText}>AL DÍA ESTE MES</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.urgencyBadge,
                            {
                              backgroundColor: urgency.bg,
                              borderColor: urgency.border,
                            },
                          ]}
                        >
                          <View
                            style={[styles.urgencyDot, { backgroundColor: urgency.color }]}
                          />
                          <Text style={[styles.urgencyText, { color: urgency.color }]}>
                            {urgency.text}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.loanDeleteButton,
                          hasRecordedPayments && styles.loanDeleteButtonProtected,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setPersonalDebtToDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar préstamo"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={hasRecordedPayments ? 'rgba(255, 159, 10, 0.75)' : '#FF453A'}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Badge de instrumento: Préstamo bancario */}
                    <View style={styles.instrumentBadgeRow}>
                      <View style={styles.bankLoanBadge}>
                        <Ionicons name="cash-outline" size={11} color="#00FFA3" />
                        <Text style={styles.bankLoanBadgeText}>PRÉSTAMO BANCARIO</Text>
                      </View>
                      {item.isPreexisting === true && (
                        <View style={styles.preexistingDebtAmberBadge}>
                          <Text style={styles.preexistingDebtAmberBadgeText}>
                            🕒 Preexistente
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Progreso de cuotas */}
                    {Boolean(item.totalInstallments) && (
                      <View style={styles.installmentsProgressContainer}>
                        <Ionicons
                          name="layers-outline"
                          size={13}
                          color="#00FFA3"
                        />
                        <Text style={styles.installmentsProgressTextNeon}>
                          {isSettled
                            ? `Cuota ${item.totalInstallments} de ${item.totalInstallments} • Saldada`
                            : isUpToDate
                            ? `Cuota ${Math.max(1, item.paidInstallments ?? 1)} de ${item.totalInstallments} • Cubierta · Restan ${(item.totalInstallments ?? 0) - (item.paidInstallments ?? 0)}`
                            : `Cuota ${Math.min(item.totalInstallments ?? 1, (item.paidInstallments ?? 0) + 1)} de ${item.totalInstallments} • Pendiente · Restan ${(item.totalInstallments ?? 0) - (item.paidInstallments ?? 0)}`}
                        </Text>
                      </View>
                    )}

                    {/* Fechas de registro y de débito mensual */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.metaText}>
                          Registrado el {formatDate(item.createdAt)}
                        </Text>
                      </View>
                      {!isSettled && (
                        <View style={styles.metaItem}>
                          <Ionicons
                            name="repeat-outline"
                            size={12}
                            color="#00FFA3"
                          />
                          <Text style={[styles.metaText, styles.paymentDayHighlightNeon]}>
                            {isUpToDate
                              ? `Próximo débito: ${debtStatus.nextDueDateFormatted} (Al día este mes)`
                              : `Día de débito: Día ${item.dueDay ?? dueInfo.effectiveDay} (${dueInfo.fullFormatted.replace('corte', 'débito')})`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Barra de progreso de amortización */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: pct === 100 ? '#00FFA3' : '#0A84FF',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressLabelsRow}>
                        <Text style={styles.progressPctText}>{pct}% amortizado</Text>
                        <Text style={styles.progressAmountsText}>
                          {currencySymbol}{formatAmount(paid)} de {currencySymbol}{formatAmount(item.totalAmount)}
                        </Text>
                      </View>
                    </View>

                    {/* Insignias de descuento ahorrado y últimas cuotas adelantadas */}
                    {((item.totalDiscountSaved || 0) > 0 || (item.prepaidLastInstallments || 0) > 0) && (
                      <View style={styles.debtExtraBadgesContainer}>
                        {(item.totalDiscountSaved || 0) > 0 && (
                          <View style={styles.debtDiscountSavedBadge}>
                            <Text style={styles.debtDiscountSavedBadgeText}>
                              ✨ Ahorrado por descuentos: {currencySymbol}{formatAmount(item.totalDiscountSaved || 0)} ({paid > 0 ? Math.round(((item.totalDiscountSaved || 0) / paid) * 100) : 0}% de ahorro)
                            </Text>
                          </View>
                        )}
                        {(item.prepaidLastInstallments || 0) > 0 && (
                          <View style={styles.debtPrepaidLastBadge}>
                            <Text style={styles.debtPrepaidLastBadgeText}>
                              ⏭️ {item.prepaidLastInstallments} última(s) cuota(s) adelantada(s) • Próxima cuota vigente
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Métricas financieras: Saldo pendiente + Cuota fija mensual destacada */}
                    <View style={styles.financialFooterRow}>
                      <View style={styles.financialCol}>
                        <Text style={styles.financialLabel}>Saldo Pendiente</Text>
                        <Text style={styles.remainingAmountValueNeon}>
                          {currencySymbol} {formatAmount(item.remainingAmount)}
                        </Text>
                      </View>

                      <View style={styles.financialCol}>
                        <Text style={styles.financialLabel}>Cuota Fija Mensual</Text>
                        <Text style={styles.monthlyPaymentValueNeon}>
                          Cuota mensual: {currencySymbol}{formatAmount(item.monthlyPayment || 0)}
                        </Text>
                        {item.interestRate !== undefined && item.interestRate > 0 && (
                          <View style={styles.loanInterestChipNeon}>
                            <Ionicons name="trending-up-outline" size={11} color="#FF9F0A" />
                            <Text style={styles.loanInterestChipTextOrange}>
                              +{item.interestRate.toFixed(1)}% interés total
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {!isSettled && item.remainingAmount > 0 && (
                      <TouchableOpacity
                        style={styles.payDebtButton}
                        activeOpacity={0.7}
                        onPress={() => handleOpenDebtPaymentModal(item)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#00FFA3" />
                        <Text style={styles.payDebtButtonText}>REGISTRAR PAGO DE CUOTA</Text>
                      </TouchableOpacity>
                    )}
                    </View>
                  );
                })}
                    </View>
              </View>
            );
          })
        ) : (
              <View style={styles.emptySectionCard}>
                <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
                <Text style={styles.emptySectionTitle}>Sin préstamos bancarios activos</Text>
                <Text style={styles.emptySectionSubtitle}>
                  {settledPersonalDebts.length > 0
                    ? 'Todos tus préstamos bancarios se encuentran liquidados al 100%.'
                    : 'No tienes pasivos pendientes. Toca "+ NUEVA DEUDA" para registrar uno.'}
                </Text>
              </View>
            )}


          </View>
        )}

        {/* SECCIÓN 2: CUENTAS POR COBRAR (AMIGOS & TARJETAS ACTIVAS) */}
        {(filter === 'receivables' || (filter === 'all' && hasActiveReceivables)) && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionBadgeReceivable}>
                <Ionicons name="arrow-undo-outline" size={14} color="#00FFA3" />
                <Text style={styles.sectionBadgeReceivableText}>POR COBRAR</Text>
              </View>
              <Text style={styles.sectionCountText}>
                Total: {currencySymbol}{formatAmount(totalReceivable)}
              </Text>
            </View>

            {/* Banner aclaratorio en la cabecera de la sección POR COBRAR */}
            <View style={styles.receivableBreakdownBanner}>
              <Text style={styles.receivableBreakdownBannerText}>
                💳 Tarjetas de Terceros: {currencySymbol}{formatAmount(totalThirdPartyChargesReceivable)} • 🤝 Préstamos a Amigos: {currencySymbol}{formatAmount(totalFriendLoansReceivable)}
              </Text>
            </View>

            {!hasActiveReceivables ? (
              <View style={styles.emptySectionCard}>
                <Ionicons name="wallet-outline" size={32} color="#0A84FF" />
                <Text style={styles.emptySectionTitle}>Sin cuentas por cobrar activas</Text>
                <Text style={styles.emptySectionSubtitle}>
                  {settledFriendLoans.length > 0
                    ? 'Todos tus préstamos a amigos se encuentran cobrados al 100%.'
                    : 'No tienes préstamos otorgados a amigos ni gastos de tarjeta pendientes de reembolso.'}
                </Text>
              </View>
            ) : (
              <>
                {/* Subsección B: Reembolsos de tarjetas compartidas */}
                {hasActiveThirdParty && (
                  <View style={styles.subSectionBlock}>
                    <View style={styles.subSectionHeader}>
                      <View style={styles.subSectionHeaderLeft}>
                        <Ionicons name="people-outline" size={15} color="#00FFA3" />
                        <Text style={styles.subSectionTitle}>REEMBOLSOS DE TARJETAS COMPARTIDAS</Text>
                      </View>
                      <View style={styles.subSectionCountPill}>
                        <Text style={styles.subSectionCountPillText}>
                          {filteredThirdPartySummaries.reduce((acc, s) => acc + s.charges.length, 0)}
                        </Text>
                      </View>
                    </View>

                    {filteredThirdPartySummaries.length > 0 ? (
                      <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                        {filteredThirdPartySummaries.map((summary, summaryIdx) => {
                          const summaryKey = `${summary.personId || summary.personName}-${summaryIdx}`;
                          const isExpanded = !collapsedSummaries[summaryKey];
                          const isCollapsed = !isExpanded;
                          const uniqueCardNames = Array.from(
                            new Set(
                              summary.charges
                                .map((c) => (c.cardName || '').trim())
                                .filter((name) => name.length > 0)
                            )
                          );
                          const cardsToDisplay = uniqueCardNames.length > 0 ? uniqueCardNames : ['Tarjeta'];

                          return (
                            <View
                              key={summaryKey}
                              style={[
                                styles.thirdPartySummaryCard,
                                isWide && styles.cardWide,
                                summary.totalRemainingDebt <= 0 && styles.thirdPartySummaryCardSettled,
                              ]}
                            >
                              {/* Fila superior (Header) */}
                              <View style={styles.summaryHeaderRow}>
                                <View style={styles.summaryHeaderLeft}>
                                  <View style={styles.personNameAccentBar} />
                                  <View style={styles.summaryHeaderTextCol}>
                                    <Text style={styles.summaryPersonName} numberOfLines={1} ellipsizeMode="tail">
                                      {summary.personName}
                                    </Text>
                                    <View style={styles.summaryCardPillsRow}>
                                      {cardsToDisplay.map((cardItemName) => (
                                        <View key={cardItemName} style={styles.summaryCardPill}>
                                          <Text style={styles.summaryCardPillText} numberOfLines={1} ellipsizeMode="tail">
                                            💳 {cardItemName}
                                          </Text>
                                        </View>
                                      ))}
                                      <View style={styles.summaryCountPill}>
                                        <Text style={styles.summaryCountPillText}>
                                          {summary.chargesCount === 1 ? '1 compra' : `${summary.chargesCount} compras`}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                </View>
                                {summary.totalRemainingDebt <= 0 ? (
                                  <View style={styles.cycleSettledBadge}>
                                    <Ionicons name="trophy" size={12} color="#00FFA3" />
                                    <Text style={styles.cycleSettledBadgeText}>
                                      🏆 SALDADO ESTE CICLO ($0.00 PENDIENTE)
                                    </Text>
                                  </View>
                                ) : summary.isMonthSettled ? (
                                  <View style={styles.monthSettledBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color="#00FFA3" />
                                    <Text style={styles.monthSettledBadgeText}>AL DÍA ESTE MES</Text>
                                  </View>
                                ) : (
                                  <View style={styles.monthPendingBadge}>
                                    <Ionicons name="time-outline" size={12} color="#FF9F0A" />
                                    <Text style={styles.monthPendingBadgeText}>CUOTA PENDIENTE</Text>
                                  </View>
                                )}
                              </View>

                            {/* Fila central (Compromiso del Mes vs Deuda Global) */}
                            <View style={[styles.summaryCommitmentBox, summary.totalRemainingDebt <= 0 && styles.summaryCommitmentBoxSettled]}>
                              {/* Fila 1 */}
                              <View style={styles.commitmentRowTop}>
                                <Text style={styles.commitmentLabel}>
                                  {summary.totalRemainingDebt <= 0 ? 'ESTADO DEL CICLO' : 'EXIGIBLE ESTE MES (CORTE TARJETA)'}
                                </Text>
                                <Text style={[styles.commitmentMonthlyDue, summary.totalRemainingDebt <= 0 && styles.commitmentMonthlyDueSettled]}>
                                  {summary.totalRemainingDebt <= 0
                                    ? `${currencySymbol}0.00 PENDIENTE`
                                    : `${currencySymbol}${formatAmount(summary.monthlyDueAmount)}`}
                                </Text>
                              </View>
                              {/* Fila 2 */}
                              <View style={styles.commitmentRowMiddle}>
                                <Text style={styles.commitmentPaidText}>
                                  Abonado este ciclo: {currencySymbol}{formatAmount(summary.monthlyPaidAmount)}
                                </Text>
                                <Text style={[styles.commitmentPendingHighlight, summary.totalRemainingDebt <= 0 && styles.commitmentPendingHighlightSettled]}>
                                  Resta por transferir: {currencySymbol}{formatAmount(summary.monthlyPendingAmount)}
                                </Text>
                              </View>
                              {/* Fila 3 (sutil) */}
                              <View style={styles.commitmentRowBottom}>
                                <Text style={styles.commitmentGlobalDebtText}>
                                  {summary.totalRemainingDebt <= 0
                                    ? `Abonado este ciclo: ${currencySymbol}{formatAmount(summary.monthlyPaidAmount)} • Resta por transferir: ${currencySymbol}0,00`
                                    : `Deuda total global a futuro: ${currencySymbol}${formatAmount(summary.totalRemainingDebt)} • ${summary.chargesCount} ${summary.chargesCount === 1 ? 'compra activa' : 'compras activas'}`}
                                </Text>
                              </View>
                            </View>

                            {/* Botón de acción: Desplegable en línea */}
                            <TouchableOpacity
                              style={styles.toggleBreakdownButton}
                              activeOpacity={0.7}
                              onPress={() =>
                                setCollapsedSummaries((prev) => ({
                                  ...prev,
                                  [summaryKey]: !prev[summaryKey],
                                }))
                              }
                            >
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={13}
                                color="#64D2FF"
                              />
                              <Text style={styles.toggleBreakdownButtonText}>
                                {isExpanded ? 'Ocultar compras' : 'Ver compras agrupadas'}
                              </Text>
                            </TouchableOpacity>

                            {/* Lista de compras agrupadas por Tarjeta/Banco emisor y ordenadas de menor a mayor saldo */}
                            {isExpanded && (
                              <View style={styles.chargesBreakdownContainer}>
                                {groupThirdPartyChargesByCard(summary.charges).map((cGroup) => {
                                  return (
                                    <View key={cGroup.cardName} style={styles.thirdPartyCardGroupWrapper}>
                                      {/* Cabecera de Tarjeta emisora */}
                                      <View style={styles.thirdPartyCardGroupHeader}>
                                        <View style={styles.thirdPartyCardGroupHeaderLeft}>
                                          <Ionicons name="card-outline" size={14} color="#64D2FF" />
                                          <Text style={styles.thirdPartyCardGroupNameText} numberOfLines={1} ellipsizeMode="tail">
                                            {cGroup.cardName}
                                          </Text>
                                        </View>
                                        <View style={styles.thirdPartyCardGroupBadge}>
                                          <Text style={styles.thirdPartyCardGroupBadgeText}>
                                            {cGroup.charges.length} {cGroup.charges.length === 1 ? 'compra' : 'compras'} • {currencySymbol}{formatAmount(cGroup.totalRemaining)}
                                          </Text>
                                        </View>
                                      </View>

                                      {/* Compras dentro de la tarjeta ordenadas de menor a mayor saldo */}
                                      {cGroup.charges.map((charge, chargeIdx) => {
                                        const originalAmount = charge.totalAmount || charge.amount;
                                        const amortizedAmount = Math.max(0, originalAmount - charge.remainingAmount);
                                        const progressRatio =
                                          originalAmount > 0
                                            ? Math.min(1, Math.max(0, amortizedAmount / originalAmount))
                                            : 1;
                                        const progressPercent = Math.round(progressRatio * 100);

                                        const pendingThisMonth =
                                          charge.remainingAmount <= 0
                                            ? 0
                                            : charge.installmentsCount <= 1
                                            ? charge.remainingAmount
                                            : Math.max(
                                                0,
                                                Math.min(
                                                  charge.remainingAmount,
                                                  parseFloat(
                                                    (
                                                      charge.monthlyInstallmentAmount -
                                                      (charge.currentPeriodPaidAmount || 0)
                                                    ).toFixed(2)
                                                  )
                                                )
                                              );

                                                            const isFullyCovered =
                                          Boolean(charge.settled) || charge.remainingAmount <= 0;
                                        const isMonthCovered =
                                          isFullyCovered || pendingThisMonth <= 0;
                                        const isSingle = charge.installmentsCount <= 1;

                                        const quotaText = isFullyCovered
                                          ? `Cuota ${charge.installmentsCount} de ${charge.installmentsCount} • Saldada`
                                          : isMonthCovered
                                          ? `Cuota ${Math.max(1, charge.paidInstallmentsCount || 1)} de ${charge.installmentsCount} • Cubierta`
                                          : `Cuota ${Math.min(charge.installmentsCount, (charge.paidInstallmentsCount || 0) + 1)} de ${charge.installmentsCount} • Pendiente`;

                                        const covInfo = getThirdPartyCoverageInfo(charge);

                                        return (
                                          <View key={charge.id || `charge-${chargeIdx}`} style={styles.chargeBreakdownCard}>
                                            {/* Cabecera: Concepto, fecha y botón de papelera */}
                                            <View style={styles.chargeCardTopRow}>
                                              <View style={styles.chargeConceptCol}>
                                                <Text style={styles.chargeConceptText} numberOfLines={1}>
                                                  {charge.concept}
                                                </Text>
                                                <Text style={styles.chargeDateText}>
                                                  Registrada el {formatDate(charge.date || charge.createdAt)}
                                                </Text>
                                              </View>
                                              <TouchableOpacity
                                                style={styles.chargeDeleteButton}
                                                activeOpacity={0.7}
                                                onPress={() => setChargeToDelete(charge)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                accessibilityRole="button"
                                                accessibilityLabel="Eliminar compra"
                                              >
                                                <Ionicons name="trash-outline" size={18} color="#FF453A" />
                                              </TouchableOpacity>
                                            </View>

                                            {/* Régimen de cuotas y montos */}
                                            <View style={styles.chargePlanRow}>
                                              {isSingle ? (
                                                <View style={styles.chargeSingleBadge}>
                                                  <Ionicons name="card-outline" size={12} color="#00FFA3" />
                                                  <Text style={styles.chargeSingleBadgeText}>
                                                    1 cuota (Cierre de tarjeta)
                                                  </Text>
                                                </View>
                                              ) : (
                                                <View style={styles.chargeInstallmentsBadge}>
                                                  <Ionicons name="repeat-outline" size={12} color="#64D2FF" />
                                                  <Text style={styles.chargeInstallmentsBadgeText}>
                                                  {quotaText}
                                                </Text>
                                                </View>
                                              )}
                                              <Text style={styles.chargeMonthlyAmountText}>
                                                {isSingle
                                                  ? `Este mes: ${currencySymbol}${formatAmount(charge.remainingAmount)}`
                                                  : `${currencySymbol}${formatAmount(charge.monthlyInstallmentAmount)} / mes`}
                                              </Text>
                                            </View>

                                            {/* Barra de progreso delgada (4px) */}
                                            <View style={styles.compactChargeProgressTrack}>
                                              <View
                                                style={[
                                                  styles.compactChargeProgressFill,
                                                  {
                                                    width: `${progressPercent}%`,
                                                    backgroundColor:
                                                      progressPercent >= 100
                                                        ? '#00FFA3'
                                                        : progressPercent > 0
                                                        ? '#FF9F0A'
                                                        : '#48484A',
                                                  },
                                                ]}
                                              />
                                            </View>

                                            {/* Fila secundaria limpia: Amortizado vs Saldo + Badge % */}
                                            <View style={styles.compactChargeInfoRow}>
                                              <Text style={styles.compactChargeInfoText} numberOfLines={1}>
                                                Amortizado: {currencySymbol}{formatAmount(amortizedAmount)} de {currencySymbol}{formatAmount(originalAmount)} • Saldo: {currencySymbol}{formatAmount(charge.remainingAmount)}
                                              </Text>
                                              <View
                                                style={[
                                                  styles.compactChargeMiniBadge,
                                                  progressPercent >= 100
                                                    ? styles.compactChargeMiniBadgeCovered
                                                    : progressPercent > 0
                                                    ? styles.compactChargeMiniBadgeAmortizing
                                                    : styles.compactChargeMiniBadgePending,
                                                ]}
                                              >
                                                <Text
                                                  style={[
                                                    styles.compactChargeMiniBadgeText,
                                                    progressPercent >= 100
                                                      ? styles.compactChargeMiniBadgeTextCovered
                                                      : progressPercent > 0
                                                      ? styles.compactChargeMiniBadgeTextAmortizing
                                                      : styles.compactChargeMiniBadgeTextPending,
                                                  ]}
                                                  numberOfLines={1}
                                                >
                                                  {progressPercent >= 100 ? '100% CUBIERTO' : `${progressPercent}%`}
                                                </Text>
                                              </View>
                                            </View>

                                            {/* Línea de estado mensual compacta */}
                                            <View style={styles.compactChargeMonthlyStatusRow}>
                                              <Text
                                                style={[
                                                  styles.compactChargeMonthlyStatusText,
                                                  isMonthCovered
                                                    ? styles.compactChargeMonthlyStatusTextCovered
                                                    : styles.compactChargeMonthlyStatusTextPending,
                                                ]}
                                                numberOfLines={1}
                                              >
                                                {isMonthCovered
                                                  ? '✅ Cuota del mes cubierta'
                                                  : `⏳ Falta este mes: ${currencySymbol}${formatAmount(pendingThisMonth)}`}
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      })}
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {/* Botón de acción rápida o Banner de éxito */}
                            {summary.totalRemainingDebt > 0 ? (
                              <TouchableOpacity
                                style={styles.recordThirdPartyAbonoButton}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setSelectedSummaryForAbono(summary);
                                  setThirdPartyAbonoAmount(
                                    summary.monthlyPendingAmount > 0
                                      ? summary.monthlyPendingAmount.toFixed(2)
                                      : summary.totalRemainingDebt.toFixed(2)
                                  );
                                  setThirdPartyAbonoError(null);
                                }}
                              >
                                <Ionicons name="cash-outline" size={15} color="#00FFA3" />
                                <Text style={styles.recordThirdPartyAbonoButtonText}>
                                  💵 REGISTRAR ABONO DE {summary.personName.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.settledCycleSuccessBanner}>
                                <Ionicons name="checkmark-circle" size={16} color="#00FFA3" />
                                <Text style={styles.settledCycleSuccessBannerText}>
                                  AL DÍA • SALDADO ESTE CICLO ({currencySymbol}0.00 PENDIENTE)
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                      </View>
                    ) : (
                      <View style={styles.emptySectionCard}>
                        <Ionicons name="card-outline" size={32} color="#00FFA3" />
                        <Text style={styles.emptySectionTitle}>
                          {searchQuery.trim()
                            ? 'Sin resultados en tarjetas compartidas'
                            : 'Compras en tarjetas registradas'}
                        </Text>
                        <Text style={styles.emptySectionSubtitle}>
                          {searchQuery.trim()
                            ? `No hay compras que coincidan con "${searchQuery}".`
                            : `Tienes compras asumidas por terceros pendientes de liquidar.`}
                        </Text>
                      </View>
                    )}

                    {/* Banner informativo al pie */}
                    <View style={styles.reversalNoticeBanner}>
                      <Ionicons name="information-circle-outline" size={18} color="#64D2FF" />
                      <Text style={styles.reversalNoticeBannerText}>
                        💡 Si ingresaste un abono por error, puedes revertirlo o eliminarlo con un toque en la pestaña de Movimientos para restaurar los balances.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Subsección A: Préstamos a amigos */}
                {hasActiveFriendLoans && (
                  <View style={styles.subSectionBlock}>
                    <View style={styles.subSectionHeader}>
                      <View style={styles.subSectionHeaderLeft}>
                        <Ionicons name="cash-outline" size={15} color="#0A84FF" />
                        <Text style={styles.subSectionTitle}>PRÉSTAMOS A AMIGOS</Text>
                      </View>
                      <View style={styles.subSectionCountPill}>
                        <Text style={styles.subSectionCountPillText}>{activeFriendLoans.length}</Text>
                      </View>
                    </View>

                    <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                      {activeFriendLoans.map((loan) => {
                        const dueInfo = getFriendLoanDueDateInfo(loan.dueDate);
                        const hasLoanPayments = loan.isPreexisting
                          ? (loan.paidAmount || 0) > (loan.initialPaidAmount || 0)
                          : (loan.paidAmount || 0) > 0 ||
                            loan.remainingAmount < (loan.totalAmount ?? loan.totalToCollect);
                        return (
                          <View key={loan.id} style={[styles.card, isWide && styles.cardWide]}>
                          <View style={styles.cardHeader}>
                            <View style={styles.cardIconWrapperBlue}>
                              <Ionicons name="cash-outline" size={18} color="#0A84FF" />
                            </View>
                            <View style={styles.cardTitleCol}>
                              <Text style={styles.cardTitle}>{loan.friendName}</Text>
                              <Text style={styles.metaText}>
                                Registrado el {formatDate(loan.createdAt)}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.settledBadge,
                                loan.settled ? styles.settledBadgeGreen : styles.settledBadgePending,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.settledBadgeText,
                                  loan.settled ? styles.settledTextGreen : styles.settledTextPending,
                                ]}
                              >
                                {loan.settled ? 'Cobrado' : 'Pendiente'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.loanDeleteButton,
                                hasLoanPayments && styles.loanDeleteButtonProtected,
                              ]}
                              activeOpacity={0.7}
                              onPress={() => setFriendLoanToDelete(loan)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel="Eliminar préstamo"
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color={hasLoanPayments ? 'rgba(255, 159, 10, 0.75)' : '#FF453A'}
                              />
                            </TouchableOpacity>
                          </View>

                          {loan.isPreexisting === true && (
                            <View style={styles.instrumentBadgeRow}>
                              <View style={styles.preexistingDebtBadge}>
                                <Text style={styles.preexistingDebtBadgeText}>
                                  🕒 Deuda Preexistente
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Banner de fecha de cobro acordada y días restantes */}
                          <View
                            style={[
                              styles.loanDueDateBanner,
                              dueInfo.isOverdue && !loan.settled && styles.loanDueDateBannerOverdue,
                            ]}
                          >
                            <Ionicons
                              name={
                                loan.settled
                                  ? 'checkmark-circle-outline'
                                  : dueInfo.isOverdue
                                  ? 'alert-circle-outline'
                                  : 'calendar-outline'
                              }
                              size={13}
                              color={loan.settled ? colors.primary : dueInfo.statusColor}
                            />
                            <Text
                              style={[
                                styles.loanDueDateBannerText,
                                {
                                  color: loan.settled ? colors.primary : dueInfo.statusColor,
                                },
                              ]}
                            >
                              {loan.settled
                                ? `Cobro acordado: ${dueInfo.formattedDate} • Liquidado`
                                : `📅 Cobro acordado: ${dueInfo.formattedDate} • ${dueInfo.statusText}`}
                            </Text>
                          </View>

                          {/* Desglose de Préstamo */}
                          <View style={styles.breakdownGrid}>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>Capital</Text>
                              <Text style={styles.gridValue}>
                                {currencySymbol}{formatAmount(loan.principalAmount)}
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>Tasa Pactada</Text>
                              <Text style={[styles.gridValue, { color: '#0A84FF' }]}>
                                +{loan.interestRate.toFixed(2)}%
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>Total con Interés</Text>
                              <Text style={styles.gridValue}>
                                {currencySymbol}{formatAmount(loan.totalToCollect)}
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>Saldo Restante</Text>
                              <Text
                                style={[
                                  styles.gridValue,
                                  {
                                    color: loan.settled ? colors.textSecondary : '#00FFA3',
                                    fontWeight: '800',
                                  },
                                ]}
                              >
                                {currencySymbol}{formatAmount(loan.remainingAmount)}
                              </Text>
                            </View>
                          </View>

                          {/* Acción de abono / liquidación */}
                          {!loan.settled ? (
                            <TouchableOpacity
                              style={styles.collectButton}
                              activeOpacity={0.7}
                              onPress={() => handleOpenAbonoModal(loan)}
                            >
                              <Ionicons name="cash-outline" size={15} color="#FFFFFF" />
                              <Text style={styles.collectButtonText}>💵 REGISTRAR ABONO</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.settledCompleteCardRow}>
                              <View style={styles.settledBadgeComplete}>
                                <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                                <Text style={styles.settledBadgeCompleteText}>LIQUIDADO COMPLETO</Text>
                              </View>
                              {loan.settledAt && (
                                <Text style={styles.settledDateText}>
                                  Liquidado el {formatDate(loan.settledAt)}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* SECCIÓN 3: HISTORIAL DE LIQUIDADAS */}
        {filter === 'settled' && (
          <View style={styles.sectionContainer}>
            {settledPersonalDebts.length === 0 &&
            settledFriendLoans.length === 0 &&
            filteredSettledThirdPartyCharges.length === 0 ? (
              <View style={styles.emptySectionCard}>
                <Ionicons name="archive-outline" size={36} color={colors.primary} />
                <Text style={styles.emptySectionTitle}>Sin historial liquidado</Text>
                <Text style={styles.emptySectionSubtitle}>
                  No tienes compromisos liquidados en el historial.
                </Text>
              </View>
            ) : (
              <>
                {/* Subsección: Préstamos Bancarios Liquidados */}
                {settledPersonalDebts.length > 0 && (
                  <View style={styles.subSectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionBadgePersonal}>
                        <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                        <Text style={styles.sectionBadgePersonalText}>PRÉSTAMOS BANCARIOS LIQUIDADOS</Text>
                      </View>
                      <Text style={styles.sectionCountText}>
                        {settledPersonalDebts.length} {settledPersonalDebts.length === 1 ? 'préstamo' : 'préstamos'}
                      </Text>
                    </View>

                    <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                      {settledPersonalDebts.map((item) => {
                        const paid = item.totalAmount;
                        const totalInstallments = item.totalInstallments || 0;
                        const paidInstallments = item.paidInstallments || totalInstallments;

                        return (
                          <View key={`settled-${item.id}`} style={[styles.card, styles.settledCardMuted, isWide && styles.cardWide]}>
                          <View style={styles.cardHeader}>
                            <View style={styles.cardIconWrapperNeon}>
                              <Ionicons name="checkmark-done" size={18} color="#00FFA3" />
                            </View>
                            <View style={styles.cardTitleCol}>
                              <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text style={styles.cardSubtitle} numberOfLines={1}>
                                🏛️ {item.entity}
                              </Text>
                            </View>
                            <View style={styles.settledBadgeComplete}>
                              <Ionicons name="checkmark-done-circle" size={12} color="#00FFA3" />
                              <Text style={styles.settledBadgeCompleteText}>LIQUIDADO</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.loanDeleteButtonProtected}
                              activeOpacity={0.7}
                              onPress={() => setPersonalDebtToDelete(item)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel="Eliminar préstamo"
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color="rgba(255, 159, 10, 0.75)"
                              />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.instrumentBadgeRow}>
                            <View style={styles.bankLoanBadge}>
                              <Ionicons name="cash-outline" size={11} color="#00FFA3" />
                              <Text style={styles.bankLoanBadgeText}>PRÉSTAMO BANCARIO</Text>
                            </View>
                            {item.isPreexisting === true && (
                              <View style={styles.preexistingDebtAmberBadge}>
                                <Text style={styles.preexistingDebtAmberBadgeText}>
                                  🕒 Preexistente
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.installmentsProgressContainer}>
                            <Ionicons name="checkmark-circle-outline" size={13} color="#00FFA3" />
                            <Text style={styles.installmentsProgressTextNeon}>
                              {totalInstallments > 0
                                ? `Todas las cuotas cubiertas (${paidInstallments} de ${totalInstallments})`
                                : 'Totalmente pagado'}
                            </Text>
                          </View>

                          <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                              <Ionicons
                                name="calendar-outline"
                                size={12}
                                color={colors.textSecondary}
                              />
                              <Text style={styles.metaText}>
                                Registrado el {formatDate(item.createdAt)}
                              </Text>
                            </View>
                          </View>

                          {/* Barra de progreso de amortización al 100% */}
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBarTrack}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: '100%',
                                    backgroundColor: '#00FFA3',
                                  },
                                ]}
                              />
                            </View>
                            <View style={styles.progressLabelsRow}>
                              <Text style={styles.progressPctText}>100% amortizado</Text>
                              <Text style={styles.progressAmountsText}>
                                {currencySymbol}{formatAmount(paid)} de {currencySymbol}{formatAmount(item.totalAmount)}
                              </Text>
                            </View>
                          </View>

                          {/* Footer de liquidación completa */}
                          <View style={styles.settledCompleteCardRow}>
                            <View style={styles.settledBadgeComplete}>
                              <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                              <Text style={styles.settledBadgeCompleteText}>LIQUIDADO</Text>
                            </View>
                            {item.settledAt && (
                              <Text style={styles.settledDateText}>
                                Liquidado el {formatDate(item.settledAt)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                    </View>
                  </View>
                )}

                {/* Subsección: Préstamos a Amigos Cobrados */}
                {settledFriendLoans.length > 0 && (
                  <View style={styles.subSectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionBadgeReceivable}>
                        <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                        <Text style={styles.sectionBadgeReceivableText}>PRÉSTAMOS A AMIGOS COBRADOS</Text>
                      </View>
                      <Text style={styles.sectionCountText}>
                        {settledFriendLoans.length} {settledFriendLoans.length === 1 ? 'préstamo' : 'préstamos'}
                      </Text>
                    </View>

                    <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                      {settledFriendLoans.map((loan) => {
                        return (
                          <View key={`settled-loan-${loan.id}`} style={[styles.card, styles.settledCardMuted, isWide && styles.cardWide]}>
                          <View style={styles.cardHeader}>
                            <View style={styles.cardIconWrapperNeon}>
                              <Ionicons name="checkmark-done" size={18} color="#00FFA3" />
                            </View>
                            <View style={styles.cardTitleCol}>
                              <Text style={styles.cardTitle}>{loan.friendName}</Text>
                              <Text style={styles.metaText}>
                                Registrado el {formatDate(loan.createdAt)}
                              </Text>
                            </View>
                            <View style={styles.settledBadgeComplete}>
                              <Ionicons name="checkmark-done-circle" size={12} color="#00FFA3" />
                              <Text style={styles.settledBadgeCompleteText}>COBRADO</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.loanDeleteButtonProtected}
                              activeOpacity={0.7}
                              onPress={() => setFriendLoanToDelete(loan)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel="Eliminar préstamo"
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color="rgba(255, 159, 10, 0.75)"
                              />
                            </TouchableOpacity>
                          </View>

                          {loan.isPreexisting === true && (
                            <View style={styles.instrumentBadgeRow}>
                              <View style={styles.preexistingDebtBadge}>
                                <Text style={styles.preexistingDebtBadgeText}>
                                  🕒 Deuda Preexistente
                                </Text>
                              </View>
                            </View>
                          )}

                          <View style={styles.breakdownGrid}>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>Capital</Text>
                              <Text style={styles.gridValue}>
                                {currencySymbol}{formatAmount(loan.principalAmount)}
                              </Text>
                            </View>
                            <View style={styles.gridCol}>
                              <Text style={styles.gridLabel}>Total Cobrado</Text>
                              <Text style={[styles.gridValue, { color: '#00FFA3' }]}>
                                {currencySymbol}{formatAmount(loan.totalToCollect)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.settledCompleteCardRow}>
                            <View style={styles.settledBadgeComplete}>
                              <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                              <Text style={styles.settledBadgeCompleteText}>COBRADO</Text>
                            </View>
                            {loan.settledAt && (
                              <Text style={styles.settledDateText}>
                                Cobrado el {formatDate(loan.settledAt)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                    </View>
                  </View>
                )}

                {/* Subsección: Compras en Tarjetas Liquidadas (Terceros) */}
                {filteredSettledThirdPartyCharges.length > 0 && (
                  <View style={styles.subSectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionBadgeReceivable}>
                        <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                        <Text style={styles.sectionBadgeReceivableText}>
                          COMPRAS EN TARJETAS LIQUIDADAS (TERCEROS)
                        </Text>
                      </View>
                      <Text style={styles.sectionCountText}>
                        {filteredSettledThirdPartyCharges.length}{' '}
                        {filteredSettledThirdPartyCharges.length === 1 ? 'compra' : 'compras'}
                      </Text>
                    </View>

                    <View style={[styles.cardsGrid, isWide && styles.cardsGridWide]}>
                      {filteredSettledThirdPartyCharges.map((charge) => {
                        const originalAmount = charge.totalAmount || charge.amount;
                        const isSingle = charge.installmentsCount <= 1;
                        const totalInstallments = charge.installmentsCount || 1;
                        const paidInstallments = charge.paidInstallmentsCount || totalInstallments;

                        return (
                          <View
                            key={`settled-charge-${charge.id}`}
                            style={[styles.card, styles.settledCardMuted, isWide && styles.cardWide]}
                          >
                          <View style={styles.cardHeader}>
                            <View style={styles.cardIconWrapperNeon}>
                              <Ionicons name="card" size={18} color="#00FFA3" />
                            </View>
                            <View style={styles.cardTitleCol}>
                              <Text style={styles.cardTitle} numberOfLines={1}>
                                {charge.concept}
                              </Text>
                              <Text style={styles.cardSubtitle} numberOfLines={1}>
                                👤 {charge.personName} • 💳 {charge.cardName}
                              </Text>
                            </View>
                            <View style={styles.settledBadgeComplete}>
                              <Ionicons name="checkmark-done-circle" size={12} color="#00FFA3" />
                              <Text style={styles.settledBadgeCompleteText}>LIQUIDADO</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.loanDeleteButtonProtected}
                              activeOpacity={0.7}
                              onPress={() => setChargeToDelete(charge)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel="Eliminar compra"
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color="rgba(255, 159, 10, 0.75)"
                              />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.instrumentBadgeRow}>
                            <View style={styles.cardShareBadge}>
                              <Ionicons name="card-outline" size={11} color="#00FFA3" />
                              <Text style={styles.cardShareBadgeText}>TARJETA COMPARTIDA</Text>
                            </View>
                            {charge.isPreexisting === true && (
                              <View style={styles.preexistingDebtAmberBadge}>
                                <Text style={styles.preexistingDebtAmberBadgeText}>
                                  🕒 Preexistente
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.installmentsProgressContainer}>
                            <Ionicons name="checkmark-circle-outline" size={13} color="#00FFA3" />
                            <Text style={styles.installmentsProgressTextNeon}>
                              {!isSingle
                                ? `Todas las cuotas cubiertas (${paidInstallments} de ${totalInstallments})`
                                : 'Totalmente pagado (1 de 1)'}
                            </Text>
                          </View>

                          <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                              <Ionicons
                                name="calendar-outline"
                                size={12}
                                color={colors.textSecondary}
                              />
                              <Text style={styles.metaText}>
                                Registrada el {formatDate(charge.date || charge.createdAt)}
                              </Text>
                            </View>
                          </View>

                          {/* Barra de progreso de amortización al 100% */}
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBarTrack}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: '100%',
                                    backgroundColor: '#00FFA3',
                                  },
                                ]}
                              />
                            </View>
                            <View style={styles.progressLabelsRow}>
                              <Text style={styles.progressPctText}>100% amortizado</Text>
                              <Text style={styles.progressAmountsText}>
                                {currencySymbol}{formatAmount(originalAmount)} de {currencySymbol}{formatAmount(originalAmount)}
                              </Text>
                            </View>
                          </View>

                          {/* Footer de liquidación completa */}
                          <View style={styles.settledCompleteCardRow}>
                            <View style={styles.settledBadgeComplete}>
                              <Ionicons name="checkmark-done-circle" size={14} color="#00FFA3" />
                              <Text style={styles.settledBadgeCompleteText}>LIQUIDADO</Text>
                            </View>
                            {(charge.settledAt || charge.lastPaymentDate) && (
                              <Text style={styles.settledDateText}>
                                Liquidado el {formatDate(charge.settledAt || charge.lastPaymentDate)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de Registro de Abono */}
      <Modal
        visible={!!selectedLoanForAbono}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseAbonoModal}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleCloseAbonoModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.abonoCard}
              onPress={(e) => {
                e.stopPropagation?.();
              }}
            >
              {/* Cabecera */}
              <View style={styles.abonoHeader}>
                <View style={styles.abonoBadge}>
                  <Ionicons name="cash-outline" size={16} color="#00FFA3" />
                  <Text style={styles.abonoBadgeText}>REGISTRAR ABONO</Text>
                </View>
                <TouchableOpacity
                  style={styles.abonoCloseButton}
                  onPress={handleCloseAbonoModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Subtítulo informativo */}
              <View style={styles.abonoInfoContainer}>
                <Text style={styles.abonoFriendName}>
                  {selectedLoanForAbono?.friendName}
                </Text>
                <Text style={styles.abonoRemainingText}>
                  Resta por cobrar: {currencySymbol}{formatAmount(selectedLoanForAbono?.remainingAmount ?? 0)}
                </Text>
              </View>

              {/* Campo de entrada */}
              <View
                style={[
                  styles.abonoInputContainer,
                  Boolean(abonoError) && styles.abonoInputContainerError,
                ]}
              >
                <Text style={styles.abonoCurrencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.abonoInput}
                  value={customAbonoAmount}
                  onChangeText={handleAbonoAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Error si aplica */}
              {Boolean(abonoError) && (
                <View style={styles.abonoErrorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#FF453A" />
                  <Text style={styles.abonoErrorText}>{abonoError}</Text>
                </View>
              )}

              {/* Píldoras de monto rápido */}
              <View style={styles.abonoPillsRow}>
                <TouchableOpacity
                  style={styles.abonoPill}
                  activeOpacity={0.7}
                  onPress={handleSetFiftyPercent}
                >
                  <Text style={styles.abonoPillText}>
                    50% ({currencySymbol}{formatAmount((selectedLoanForAbono?.remainingAmount ?? 0) / 2)})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.abonoPill}
                  activeOpacity={0.7}
                  onPress={handleSetFullAmount}
                >
                  <Text style={styles.abonoPillText}>
                    Liquidar Total ({currencySymbol}{formatAmount(selectedLoanForAbono?.remainingAmount ?? 0)})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selector de cuenta bancaria */}
              <View style={styles.modalBankSelectorSection}>
                <Text style={styles.modalBankSelectorLabel}>¿A QUÉ CUENTA INGRESÓ EL PAGO?</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalBankPillsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.modalBankPill,
                      selectedFriendLoanBankId === null && styles.modalBankPillActive,
                    ]}
                    onPress={() => setSelectedFriendLoanBankId(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={13}
                      color={selectedFriendLoanBankId === null ? '#00FFA3' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalBankPillText,
                        selectedFriendLoanBankId === null && styles.modalBankPillTextActive,
                      ]}
                    >
                      Efectivo en mano
                    </Text>
                  </TouchableOpacity>
                  {banks.map((b) => {
                    const isSelected = selectedFriendLoanBankId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.modalBankPill,
                          isSelected && styles.modalBankPillActive,
                        ]}
                        onPress={() => setSelectedFriendLoanBankId(b.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="business-outline"
                          size={13}
                          color={isSelected ? '#00FFA3' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.modalBankPillText,
                            isSelected && styles.modalBankPillTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Botón confirmar */}
              <TouchableOpacity
                style={[
                  styles.abonoConfirmButton,
                  { backgroundColor: isConfirmDisabled ? '#2C2C2E' : colors.primary },
                ]}
                activeOpacity={0.8}
                disabled={isConfirmDisabled}
                onPress={handleConfirmAbono}
              >
                <Text
                  style={[
                    styles.abonoConfirmButtonText,
                    { color: isConfirmDisabled ? '#8E8E93' : '#121212' },
                  ]}
                >
                  CONFIRMAR ABONO
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Pago de Deuda Personal */}
      <Modal
        visible={!!selectedDebtForPayment}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseDebtPaymentModal}
      >
        <TouchableOpacity
          style={styles.debtModalBackdrop}
          activeOpacity={1}
          onPress={handleCloseDebtPaymentModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.debtPaymentCard}
              onPress={(e) => {
                e.stopPropagation?.();
              }}
            >
              {/* Cabecera */}
              <View style={styles.debtPaymentHeader}>
                <View style={styles.debtPaymentBadge}>
                  <Ionicons name="card-outline" size={16} color="#00FFA3" />
                  <Text style={styles.debtPaymentBadgeText}>REGISTRAR PAGO DE DEUDA</Text>
                </View>
                <TouchableOpacity
                  style={styles.debtPaymentCloseButton}
                  onPress={handleCloseDebtPaymentModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Subtítulo */}
              <View style={styles.debtPaymentInfoContainer}>
                <Text style={styles.debtPaymentTitle} numberOfLines={1}>
                  {selectedDebtForPayment?.title}
                  {selectedDebtForPayment?.entity ? ` (${selectedDebtForPayment.entity})` : ''}
                </Text>
                <Text style={styles.debtPaymentRemainingText}>
                  Resta por pagar: {currencySymbol}{formatAmount(selectedDebtForPayment?.remainingAmount ?? 0)}
                </Text>
              </View>

              {/* Selector de Modalidad de Pago */}
              <View style={styles.debtModeTabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.debtModeTab,
                    debtPaymentMode === 'next' && styles.debtModeTabActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDebtPaymentMode('next')}
                >
                  <Text
                    style={[
                      styles.debtModeTabText,
                      debtPaymentMode === 'next' && styles.debtModeTabTextActive,
                    ]}
                  >
                    📅 Próxima Cuota
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.debtModeTab,
                    debtPaymentMode === 'last' && styles.debtModeTabActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDebtPaymentMode('last')}
                >
                  <Text
                    style={[
                      styles.debtModeTabText,
                      debtPaymentMode === 'last' && styles.debtModeTabTextActive,
                    ]}
                  >
                    ⏭️ Última(s) Cuota(s)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selector de cantidad de últimas cuotas si debtPaymentMode === 'last' */}
              {debtPaymentMode === 'last' && (
                <View style={styles.lastInstallmentsSelectorBox}>
                  <View style={styles.lastInstallmentsCounterRow}>
                    <Text style={styles.lastInstallmentsLabel}>Cantidad de últimas cuotas:</Text>
                    <View style={styles.lastInstallmentsControls}>
                      <TouchableOpacity
                        style={[
                          styles.lastInstallmentStepBtn,
                          lastInstallmentsCount <= 1 && styles.lastInstallmentStepBtnDisabled,
                        ]}
                        activeOpacity={0.7}
                        disabled={lastInstallmentsCount <= 1}
                        onPress={() => handleChangeLastInstallmentsCount(-1)}
                      >
                        <Ionicons
                          name="remove"
                          size={16}
                          color={lastInstallmentsCount <= 1 ? '#555' : '#00FFA3'}
                        />
                      </TouchableOpacity>
                      <Text style={styles.lastInstallmentsCountValue}>{lastInstallmentsCount}</Text>
                      <TouchableOpacity
                        style={[
                          styles.lastInstallmentStepBtn,
                          lastInstallmentsCount >= maxRemainingInstallmentsForModal &&
                            styles.lastInstallmentStepBtnDisabled,
                        ]}
                        activeOpacity={0.7}
                        disabled={lastInstallmentsCount >= maxRemainingInstallmentsForModal}
                        onPress={() => handleChangeLastInstallmentsCount(1)}
                      >
                        <Ionicons
                          name="add"
                          size={16}
                          color={
                            lastInstallmentsCount >= maxRemainingInstallmentsForModal
                              ? '#555'
                              : '#00FFA3'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.lastInstallmentsSummaryText}>
                    Liquidando las últimas {lastInstallmentsCount} cuota(s) (del final hacia adelante)
                  </Text>
                  <Text style={styles.lastInstallmentsNoteText}>
                    📌 Tu próxima cuota del mes sigue pendiente en su fecha habitual.
                  </Text>
                </View>
              )}

              {/* Input de monto */}
              <View
                style={[
                  styles.debtPaymentInputContainer,
                  Boolean(debtPaymentError) && styles.debtPaymentInputContainerError,
                ]}
              >
                <Text style={styles.debtPaymentCurrencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.debtPaymentInput}
                  value={debtPaymentAmount}
                  onChangeText={handleDebtPaymentAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus={true}
                />
              </View>

              {/* Mensaje de error si aplica */}
              {Boolean(debtPaymentError) && (
                <View style={styles.debtPaymentErrorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#FF453A" />
                  <Text style={styles.debtPaymentErrorText}>{debtPaymentError}</Text>
                </View>
              )}

              {/* Desglose en Vivo de Descuento y % de Ahorro */}
              {(() => {
                const countForCalc = debtPaymentMode === 'last' ? lastInstallmentsCount : 1;
                const nominalQuotaValue = selectedDebtForPayment?.monthlyPayment
                  ? Math.min(
                      selectedDebtForPayment.remainingAmount,
                      Number((selectedDebtForPayment.monthlyPayment * countForCalc).toFixed(2))
                    )
                  : 0;
                const enteredPaidVal = parseFloat(debtPaymentAmount.replace(',', '.')) || 0;
                if (nominalQuotaValue > 0 && enteredPaidVal > 0) {
                  const savedAmount = Math.max(
                    0,
                    Number((nominalQuotaValue - enteredPaidVal).toFixed(2))
                  );
                  const savedPct =
                    nominalQuotaValue > 0
                      ? Number(((savedAmount / nominalQuotaValue) * 100).toFixed(1))
                      : 0;
                  return (
                    <View style={styles.debtLiveDiscountBox}>
                      <Text style={styles.debtLiveDiscountLine}>
                        Valor integral que baja de tu deuda ({countForCalc}{' '}
                        {countForCalc === 1 ? 'cuota' : 'cuotas'}):{' '}
                        <Text style={styles.debtLiveDiscountBold}>
                          {currencySymbol}{formatAmount(nominalQuotaValue)}
                        </Text>
                      </Text>
                      <Text style={styles.debtLiveDiscountLine}>
                        Pago real que sale de tu cuenta:{' '}
                        <Text style={styles.debtLiveDiscountBold}>
                          {currencySymbol}{formatAmount(enteredPaidVal)}
                        </Text>
                      </Text>
                      {savedAmount > 0 && (
                        <Text style={styles.debtLiveDiscountHighlightNeon}>
                          ✨ Descuento / Ahorro: {currencySymbol}{formatAmount(savedAmount)} ({savedPct}% de ahorro)
                        </Text>
                      )}
                    </View>
                  );
                }
                return null;
              })()}

              {/* Píldoras de selección rápida */}
              <View style={styles.debtPaymentPillsRow}>
                {selectedDebtForPayment?.monthlyPayment && selectedDebtForPayment.monthlyPayment > 0 ? (
                  <TouchableOpacity
                    style={styles.debtPaymentPill}
                    activeOpacity={0.7}
                    onPress={handleSetSuggestedInstallment}
                  >
                    <Text style={styles.debtPaymentPillText}>
                      {debtPaymentMode === 'last' && lastInstallmentsCount > 1
                        ? `${lastInstallmentsCount} cuotas (${currencySymbol}${formatAmount(
                            Math.min(
                              selectedDebtForPayment.monthlyPayment * lastInstallmentsCount,
                              selectedDebtForPayment.remainingAmount
                            )
                          )})`
                        : `Cuota sugerida (${currencySymbol}${formatAmount(
                            Math.min(
                              selectedDebtForPayment.monthlyPayment,
                              selectedDebtForPayment.remainingAmount
                            )
                          )})`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.debtPaymentPill}
                  activeOpacity={0.7}
                  onPress={handleSetFullDebtPayment}
                >
                  <Text style={styles.debtPaymentPillText}>
                    Liquidar Total ({currencySymbol}{formatAmount(selectedDebtForPayment?.remainingAmount ?? 0)})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selector de cuenta bancaria */}
              <View style={styles.modalBankSelectorSection}>
                <Text style={styles.modalBankSelectorLabel}>¿DE QUÉ CUENTA BANCARIA SE DEBITÓ EL PAGO?</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalBankPillsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.modalBankPill,
                      selectedDebtPaymentBankId === null && styles.modalBankPillActive,
                    ]}
                    onPress={() => setSelectedDebtPaymentBankId(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={13}
                      color={selectedDebtPaymentBankId === null ? '#00FFA3' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalBankPillText,
                        selectedDebtPaymentBankId === null && styles.modalBankPillTextActive,
                      ]}
                    >
                      Efectivo en mano
                    </Text>
                  </TouchableOpacity>
                  {banks.map((b) => {
                    const isSelected = selectedDebtPaymentBankId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.modalBankPill,
                          isSelected && styles.modalBankPillActive,
                        ]}
                        onPress={() => setSelectedDebtPaymentBankId(b.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="business-outline"
                          size={13}
                          color={isSelected ? '#00FFA3' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.modalBankPillText,
                            isSelected && styles.modalBankPillTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Mensaje informativo sutil */}
              <View style={styles.debtPaymentHintContainer}>
                <Text style={styles.debtPaymentHintText}>
                  💡 Este pago se registrará como gasto en tu historial de Movimientos. Si fue un error, puedes eliminarlo allí para restaurar el saldo de tu deuda automáticamente.
                </Text>
              </View>

              {/* Botón confirmar */}
              <TouchableOpacity
                style={[
                  styles.debtPaymentConfirmButton,
                  { backgroundColor: isDebtPaymentDisabled ? '#2C2C2E' : '#00FFA3' },
                ]}
                activeOpacity={0.8}
                disabled={isDebtPaymentDisabled}
                onPress={handleConfirmDebtPayment}
              >
                <Text
                  style={[
                    styles.debtPaymentConfirmButtonText,
                    { color: isDebtPaymentDisabled ? '#8E8E93' : '#121212' },
                  ]}
                >
                  CONFIRMAR PAGO
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal Interactivo de Abono de Terceros */}
      <Modal
        visible={!!selectedSummaryForAbono}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseThirdPartyAbonoModal}
      >
        <TouchableOpacity
          style={styles.thirdPartyModalBackdrop}
          activeOpacity={1}
          onPress={handleCloseThirdPartyAbonoModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.thirdPartyAbonoCard}
              onPress={(e) => {
                e.stopPropagation?.();
              }}
            >
              {/* Header */}
              <View style={styles.thirdPartyAbonoHeader}>
                <View style={styles.thirdPartyAbonoBadge}>
                  <Ionicons name="cash-outline" size={16} color="#00FFA3" />
                  <Text style={styles.thirdPartyAbonoBadgeText}>
                    ABONO DE COMPRA COMPARTIDA
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.thirdPartyAbonoCloseButton}
                  onPress={handleCloseThirdPartyAbonoModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Subtítulo */}
              <View style={styles.thirdPartyAbonoInfoContainer}>
                <Text style={styles.thirdPartyAbonoPersonName}>
                  {selectedSummaryForAbono?.personName} • {selectedSummaryForAbono?.cardName}
                </Text>
                <View style={styles.thirdPartyAbonoMetricsRow}>
                  <Text style={styles.thirdPartyAbonoMonthlyPendingText}>
                    Resta este mes: {currencySymbol}{formatAmount(selectedSummaryForAbono?.monthlyPendingAmount || 0)}
                  </Text>
                  <Text style={styles.thirdPartyAbonoTotalDebtText}>
                    Total pendiente global: {currencySymbol}{formatAmount(selectedSummaryForAbono?.totalRemainingDebt || 0)}
                  </Text>
                </View>
              </View>

              {/* Campo de entrada de monto */}
              <View
                style={[
                  styles.thirdPartyAbonoInputContainer,
                  Boolean(thirdPartyAbonoError) && styles.thirdPartyAbonoInputContainerError,
                ]}
              >
                <Text style={styles.thirdPartyAbonoCurrencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.thirdPartyAbonoInput}
                  value={thirdPartyAbonoAmount}
                  onChangeText={handleThirdPartyAbonoAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus={true}
                />
              </View>

              {/* Mensaje de error si aplica */}
              {Boolean(thirdPartyAbonoError) && (
                <View style={styles.thirdPartyAbonoErrorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#FF453A" />
                  <Text style={styles.thirdPartyAbonoErrorText}>{thirdPartyAbonoError}</Text>
                </View>
              )}

              {/* Píldoras de monto rápido */}
              <View style={styles.thirdPartyAbonoPillsRow}>
                {(selectedSummaryForAbono?.monthlyPendingAmount ?? 0) > 0 && (
                  <TouchableOpacity
                    style={styles.thirdPartyAbonoPill}
                    activeOpacity={0.7}
                    onPress={handleSetThirdPartyCoverMonth}
                  >
                    <Text style={styles.thirdPartyAbonoPillText}>
                      Cubrir resto del mes ({currencySymbol}{formatAmount(selectedSummaryForAbono?.monthlyPendingAmount ?? 0)})
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.thirdPartyAbonoPill}
                  activeOpacity={0.7}
                  onPress={handleSetThirdPartyFullDebt}
                >
                  <Text style={styles.thirdPartyAbonoPillText}>
                    Liquidar deuda total ({currencySymbol}{formatAmount(selectedSummaryForAbono?.totalRemainingDebt ?? 0)})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selector de cuenta bancaria */}
              <View style={styles.modalBankSelectorSection}>
                <Text style={styles.modalBankSelectorLabel}>¿A QUÉ CUENTA BANCARIA DEPOSITÓ EL TERCERO?</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalBankPillsRow}
                >
                  <TouchableOpacity
                    style={[
                      styles.modalBankPill,
                      selectedDestinationBankId === null && styles.modalBankPillActive,
                    ]}
                    onPress={() => setSelectedDestinationBankId(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={13}
                      color={selectedDestinationBankId === null ? '#00FFA3' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.modalBankPillText,
                        selectedDestinationBankId === null && styles.modalBankPillTextActive,
                      ]}
                    >
                      Efectivo en mano / Sin banco
                    </Text>
                  </TouchableOpacity>
                  {banks.map((b) => {
                    const isSelected = selectedDestinationBankId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.modalBankPill,
                          isSelected && styles.modalBankPillActive,
                        ]}
                        onPress={() => setSelectedDestinationBankId(b.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="business-outline"
                          size={13}
                          color={isSelected ? '#00FFA3' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.modalBankPillText,
                            isSelected && styles.modalBankPillTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Nota sutil contable */}
              <View style={styles.thirdPartyAbonoHintContainer}>
                <Text style={styles.thirdPartyAbonoHintText}>
                  💡 Este abono se registrará como Reembolso para cubrir el extracto de tu tarjeta sin alterar tus ingresos salariales ni tus estadísticas personales.
                </Text>
              </View>

              {/* Botón confirmar */}
              <TouchableOpacity
                style={[
                  styles.thirdPartyAbonoConfirmButton,
                  { backgroundColor: isThirdPartyAbonoDisabled ? '#2C2C2E' : '#00FFA3' },
                ]}
                activeOpacity={0.8}
                disabled={isThirdPartyAbonoDisabled}
                onPress={handleConfirmThirdPartyAbono}
              >
                <Text
                  style={[
                    styles.thirdPartyAbonoConfirmButtonText,
                    { color: isThirdPartyAbonoDisabled ? '#8E8E93' : '#121212' },
                  ]}
                >
                  CONFIRMAR ABONO
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal de confirmación para eliminar compra compartida */}
      <Modal
        visible={!!chargeToDelete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setChargeToDelete(null)}
      >
        <TouchableOpacity
          style={styles.deleteModalBackdrop}
          activeOpacity={1}
          onPress={() => setChargeToDelete(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.deleteModalCard}
              onPress={(e) => {
                e.stopPropagation?.();
              }}
            >
              <View style={styles.deleteModalHeader}>
                <View style={styles.deleteModalBadge}>
                  <Ionicons name="trash-outline" size={16} color="#FF453A" />
                  <Text style={styles.deleteModalBadgeText}>ELIMINAR COMPRA</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteModalCloseButton}
                  onPress={() => setChargeToDelete(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.deleteModalContent}>
                <Text style={styles.deleteModalQuestion}>
                  ¿Deseas eliminar "{chargeToDelete?.concept}" registrada a nombre de {chargeToDelete?.personName}?
                </Text>

                {chargeToDelete &&
                  ((chargeToDelete.totalAmount || chargeToDelete.amount) - chargeToDelete.remainingAmount > 0 ||
                    (chargeToDelete.currentPeriodPaidAmount || 0) > 0) && (
                    <View style={styles.deleteModalWarningBox}>
                      <Ionicons name="warning-outline" size={16} color="#FF9F0A" />
                      <Text style={styles.deleteModalWarningText}>
                        Atención: Esta compra ya cuenta con abonos parciales aplicados ({currencySymbol}
                        {formatAmount(
                          (chargeToDelete.totalAmount || chargeToDelete.amount) -
                            chargeToDelete.remainingAmount
                        )}{' '}
                        amortizados). Al eliminarla, se removerá el saldo restante de la deuda.
                      </Text>
                    </View>
                  )}
              </View>

              <View style={styles.deleteModalActionsRow}>
                <TouchableOpacity
                  style={styles.deleteModalCancelButton}
                  activeOpacity={0.7}
                  onPress={() => setChargeToDelete(null)}
                >
                  <Text style={styles.deleteModalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteModalConfirmButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (chargeToDelete) {
                      deleteThirdPartyCharge(chargeToDelete.id);
                      setChargeToDelete(null);
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.deleteModalConfirmButtonText}>ELIMINAR COMPRA</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal Cyberpunk de Eliminación / Protección Contable de Préstamo */}
      <Modal
        visible={Boolean(personalDebtToDelete || friendLoanToDelete)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setPersonalDebtToDelete(null);
          setFriendLoanToDelete(null);
        }}
      >
        <TouchableOpacity
          style={styles.deleteModalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setPersonalDebtToDelete(null);
            setFriendLoanToDelete(null);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.deleteModalCard}
              onPress={(e) => {
                e.stopPropagation?.();
              }}
            >
              {(() => {
                const hasPayments = personalDebtToDelete
                  ? personalDebtToDelete.totalInstallments
                    ? (personalDebtToDelete.totalActualPaid || 0) > 0 ||
                      (personalDebtToDelete.paidInstallments || 0) >
                        (personalDebtToDelete.initialPaidInstallments ??
                          (personalDebtToDelete.isPreexisting
                            ? personalDebtToDelete.paidInstallments ?? 0
                            : 0))
                    : personalDebtToDelete.isPreexisting
                    ? (personalDebtToDelete.totalActualPaid || 0) > 0
                    : (personalDebtToDelete.totalActualPaid || 0) > 0 ||
                      personalDebtToDelete.remainingAmount < personalDebtToDelete.totalAmount
                  : friendLoanToDelete
                  ? friendLoanToDelete.isPreexisting
                    ? (friendLoanToDelete.paidAmount || 0) >
                      (friendLoanToDelete.initialPaidAmount || 0)
                    : (friendLoanToDelete.paidAmount || 0) > 0 ||
                      friendLoanToDelete.remainingAmount <
                        (friendLoanToDelete.totalAmount ?? friendLoanToDelete.totalToCollect)
                  : false;

                const targetTitle = personalDebtToDelete
                  ? personalDebtToDelete.title
                  : friendLoanToDelete
                  ? `Préstamo a ${friendLoanToDelete.friendName}`
                  : '';

                const targetTotal = personalDebtToDelete
                  ? personalDebtToDelete.totalAmount
                  : friendLoanToDelete
                  ? friendLoanToDelete.totalAmount ?? friendLoanToDelete.totalToCollect
                  : 0;

                const closeLoanDeleteModal = (): void => {
                  setPersonalDebtToDelete(null);
                  setFriendLoanToDelete(null);
                };

                if (hasPayments) {
                  return (
                    <>
                      <View style={styles.deleteModalHeader}>
                        <View style={styles.protectedModalBadge}>
                          <Ionicons name="lock-closed-outline" size={16} color="#FF9F0A" />
                          <Text style={styles.protectedModalBadgeText}>ELIMINACIÓN PROTEGIDA</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteModalCloseButton}
                          onPress={closeLoanDeleteModal}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityRole="button"
                          accessibilityLabel="Cerrar modal"
                        >
                          <Ionicons name="close" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.deleteModalContent}>
                        <View style={styles.protectedIconCircle}>
                          <Ionicons name="lock-closed-outline" size={28} color="#FF9F0A" />
                        </View>
                        <Text style={styles.deleteModalQuestion}>
                          {`No es posible eliminar "${targetTitle}" porque ya tiene pagos o abonos de cuota registrados. Para mantener tus cuentas cuadradas, solo se pueden eliminar préstamos sin abonos (o primero debes anular el pago en la pestaña Movimientos).`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.protectedModalUnderstoodButton}
                        activeOpacity={0.8}
                        onPress={closeLoanDeleteModal}
                      >
                        <Text style={styles.protectedModalUnderstoodButtonText}>ENTENDIDO</Text>
                      </TouchableOpacity>
                    </>
                  );
                }

                return (
                  <>
                    <View style={styles.deleteModalHeader}>
                      <View style={styles.deleteModalBadge}>
                        <Ionicons name="trash-outline" size={16} color="#FF453A" />
                        <Text style={styles.deleteModalBadgeText}>¿ELIMINAR PRÉSTAMO?</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteModalCloseButton}
                        onPress={closeLoanDeleteModal}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar modal"
                      >
                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.deleteModalContent}>
                      <Text style={styles.deleteModalQuestion}>
                        {`¿Deseas eliminar "${targetTitle}" por ${currencySymbol}${formatAmount(targetTotal)}? Como aún no tiene ningún pago registrado, se eliminará limpiamente.`}
                      </Text>
                    </View>

                    <View style={styles.deleteModalActionsRow}>
                      <TouchableOpacity
                        style={styles.deleteModalCancelButton}
                        activeOpacity={0.7}
                        onPress={closeLoanDeleteModal}
                      >
                        <Text style={styles.deleteModalCancelButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteModalConfirmButton}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (personalDebtToDelete) {
                            const deleted = deletePersonalDebt(personalDebtToDelete.id);
                            if (deleted) {
                              removeInitialLoanTransactions({ debtId: personalDebtToDelete.id });
                            }
                          } else if (friendLoanToDelete) {
                            const deleted = deleteFriendLoan(friendLoanToDelete.id);
                            if (deleted) {
                              removeInitialLoanTransactions({ loanId: friendLoanToDelete.id });
                            }
                          }
                          closeLoanDeleteModal();
                        }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.deleteModalConfirmButtonText}>ELIMINAR PRÉSTAMO</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 18,
  },
  scrollContentWide: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  cardsGrid: {
    width: '100%',
    gap: 12,
  },
  cardsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWide: {
    width: '48.5%',
    flexGrow: 0,
    flexShrink: 0,
  },
  header: {
    gap: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  newDebtButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newDebtButtonText: {
    color: '#121212',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  searchBarWide: {
    maxWidth: 420,
  },
  pillsContainerWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    padding: 0,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.25)',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  countBadgeTextActive: {
    color: colors.primary,
  },
  sectionContainer: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionBadgePersonal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.10)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sectionBadgePersonalText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionBadgeReceivable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.10)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sectionBadgeReceivableText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  receivableBreakdownBanner: {
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 2,
    marginBottom: 4,
  },
  receivableBreakdownBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrapperNeon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLoanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.10)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bankLoanBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardShareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(191, 90, 242, 0.10)',
    borderColor: 'rgba(191, 90, 242, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardShareBadgeText: {
    color: '#BF5AF2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  preexistingDebtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 210, 255, 0.10)',
    borderColor: 'rgba(100, 210, 255, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  preexistingDebtBadgeText: {
    color: '#64D2FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  preexistingDebtAmberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  preexistingDebtAmberBadgeText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  installmentsProgressTextNeon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
  },
  paymentDayHighlightNeon: {
    color: '#00FFA3',
    fontWeight: '600',
  },
  remainingAmountValueNeon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00FFA3',
  },
  monthlyPaymentValueNeon: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64D2FF',
  },
  loanInterestChipNeon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  loanInterestChipTextOrange: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  cardIconWrapperPersonal: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapperLoan: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  cardIconWrapperCardInstallment: {
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
  },
  cardIconWrapperCardStatement: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  instrumentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
  },
  loanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 132, 255, 0.10)',
    borderColor: 'rgba(10, 132, 255, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loanBadgeText: {
    color: '#0A84FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  creditCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 159, 10, 0.10)',
    borderColor: 'rgba(255, 159, 10, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  creditCardBadgeText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardInstallmentsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
    borderColor: 'rgba(191, 90, 242, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardInstallmentsBadgeText: {
    color: '#BF5AF2',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardFullStatementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.10)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardFullStatementBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardInstallmentsProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(191, 90, 242, 0.08)',
    borderColor: 'rgba(191, 90, 242, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardInstallmentsProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D18BFA',
  },
  installmentsProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  installmentsProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64D2FF',
  },
  cardIconWrapperBlue: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapperGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: '#18181A',
    padding: 8,
    borderRadius: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cutDayHighlight: {
    color: '#FF9F0A',
    fontWeight: '600',
  },
  paymentDayHighlight: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  cardInstallmentHighlight: {
    color: '#BF5AF2',
    fontWeight: '600',
  },
  statementCutHighlight: {
    color: '#00FFA3',
    fontWeight: '600',
  },
  progressContainer: {
    gap: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#26262A',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPctText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  progressAmountsText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  financialFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  financialCol: {
    gap: 2,
  },
  financialColRight: {
    gap: 2,
    alignItems: 'flex-end',
  },
  financialLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  remainingAmountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  monthlyPaymentValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64D2FF',
  },
  monthlyPaymentInstallmentValue: {
    color: '#D18BFA',
  },
  interestValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cardInterestChipOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cardInterestChipTextOrange: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  cardInterestChipGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cardInterestChipTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00FFA3',
  },
  payDebtButton: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 4,
  },
  payDebtButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  subSectionBlock: {
    gap: 10,
    marginTop: 4,
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  subSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  subSectionCountPill: {
    backgroundColor: '#26262A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subSectionCountPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  settledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  settledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  settledBadgeGreen: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.4)',
  },
  settledBadgePending: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.4)',
  },
  settledTextGreen: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  settledTextPending: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '700',
  },
  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#18181A',
    padding: 10,
    borderRadius: 10,
  },
  gridCol: {
    gap: 2,
  },
  gridLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  collectButton: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    paddingVertical: 9,
  },
  collectButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  loanDueDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loanDueDateBannerOverdue: {
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  loanDueDateBannerText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  settledCompleteCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  settledBadgeComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  settledBadgeCompleteText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  upToDateBadgeNeon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upToDateBadgeNeonText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  settledDateText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  chargeRightCol: {
    alignItems: 'flex-end',
  },
  chargeAmountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  settleChargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
  },
  settleChargeButtonText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  emptySectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  emptySectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subEmptyCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#141416',
    alignItems: 'center',
  },
  subEmptyText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboardAvoiding: {
    width: '100%',
    alignItems: 'center',
  },
  abonoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  abonoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  abonoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  abonoBadgeText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  abonoCloseButton: {
    padding: 4,
  },
  abonoInfoContainer: {
    gap: 4,
  },
  abonoFriendName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  abonoRemainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64D2FF',
  },
  abonoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  abonoInputContainerError: {
    borderColor: '#FF453A',
  },
  abonoCurrencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00FFA3',
  },
  abonoInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    padding: 0,
  },
  abonoErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  abonoErrorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  abonoPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  abonoPill: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abonoPillText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  abonoConfirmButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  abonoConfirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  debtModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debtPaymentCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  debtPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  debtPaymentBadgeText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  debtPaymentCloseButton: {
    padding: 4,
  },
  debtPaymentInfoContainer: {
    gap: 4,
  },
  debtPaymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  debtPaymentRemainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6482',
  },
  debtPaymentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  debtPaymentInputContainerError: {
    borderColor: '#FF453A',
  },
  debtPaymentCurrencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00FFA3',
  },
  debtPaymentInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
  },
  debtPaymentErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  debtPaymentErrorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  debtPaymentPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  debtPaymentPill: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtPaymentPillText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  debtPaymentHintContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  debtPaymentHintText: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
  },
  debtPaymentConfirmButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  debtPaymentConfirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  debtExtraBadgesContainer: {
    gap: 6,
    marginTop: 2,
  },
  debtDiscountSavedBadge: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debtDiscountSavedBadgeText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
  },
  debtPrepaidLastBadge: {
    backgroundColor: 'rgba(100, 210, 255, 0.12)',
    borderColor: 'rgba(100, 210, 255, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debtPrepaidLastBadgeText: {
    color: '#64D2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  debtModeTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#141416',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  debtModeTab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtModeTabActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.4)',
  },
  debtModeTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  debtModeTabTextActive: {
    color: '#00FFA3',
    fontWeight: '800',
  },
  lastInstallmentsSelectorBox: {
    backgroundColor: 'rgba(100, 210, 255, 0.06)',
    borderColor: 'rgba(100, 210, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  lastInstallmentsCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastInstallmentsLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lastInstallmentsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lastInstallmentStepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastInstallmentStepBtnDisabled: {
    backgroundColor: '#242426',
    borderColor: '#333336',
  },
  lastInstallmentsCountValue: {
    color: '#00FFA3',
    fontSize: 15,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  lastInstallmentsSummaryText: {
    color: '#64D2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  lastInstallmentsNoteText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  debtLiveDiscountBox: {
    backgroundColor: 'rgba(0, 255, 163, 0.06)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  debtLiveDiscountLine: {
    color: '#D0D0D5',
    fontSize: 12,
  },
  debtLiveDiscountBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  debtLiveDiscountHighlightNeon: {
    color: '#00FFA3',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  // Estilos de la sección moderna de Reembolsos de Tarjetas Compartidas
  thirdPartySummaryCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  personNameAccentBar: {
    width: 4,
    height: 18,
    marginTop: 2,
    borderRadius: 2,
    backgroundColor: '#00FFA3',
  },
  summaryHeaderTextCol: {
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  summaryPersonName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCardPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  summaryCardPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 160,
    flexShrink: 1,
  },
  summaryCardPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryCountPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summaryCountPillText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
  },
  monthSettledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  monthSettledBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  monthPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  monthPendingBadgeText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryCommitmentBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  commitmentRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commitmentLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  commitmentMonthlyDue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  commitmentRowMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commitmentPaidText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  commitmentPendingHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
  },
  commitmentRowBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
  },
  commitmentGlobalDebtText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  toggleBreakdownButton: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  toggleBreakdownButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64D2FF',
  },
  chargesBreakdownContainer: {
    backgroundColor: '#161618',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chargeBreakdownCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  chargeCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  chargeConceptCol: {
    flex: 1,
    gap: 2,
  },
  chargeCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 210, 255, 0.08)',
    borderColor: 'rgba(100, 210, 255, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  chargeCardBadgeText: {
    color: '#64D2FF',
    fontSize: 10,
    fontWeight: '700',
  },
  chargeConceptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chargeDateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chargeDeleteButton: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  chargePlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chargeSingleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chargeSingleBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
  },
  chargeInstallmentsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 210, 255, 0.1)',
    borderColor: 'rgba(100, 210, 255, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chargeInstallmentsBadgeText: {
    color: '#64D2FF',
    fontSize: 10,
    fontWeight: '700',
  },
  chargeMonthlyAmountText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chargeProgressContainer: {
    marginVertical: 2,
  },
  chargeProgressBarTrack: {
    height: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chargeProgressBarFill: {
    height: '100%',
    backgroundColor: '#00FFA3',
    borderRadius: 3,
  },
  chargeAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chargeRemainingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chargeRemainingHighlight: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  chargeOriginalAmountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  chargeStatusChipRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  chargeStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chargeStatusChipCovered: {
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
  },
  chargeStatusChipPending: {
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderColor: 'rgba(255, 159, 10, 0.25)',
  },
  chargeStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chargeStatusTextCovered: {
    color: '#00FFA3',
  },
  chargeStatusTextPending: {
    color: '#FF9F0A',
  },
  reversalNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(100, 210, 255, 0.08)',
    borderColor: 'rgba(100, 210, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  reversalNoticeBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#D0D0D5',
    lineHeight: 16,
  },
  // Modal de confirmación para eliminar compra compartida
  deleteModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteModalBadgeText: {
    color: '#FF453A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  deleteModalCloseButton: {
    padding: 4,
  },
  deleteModalContent: {
    gap: 12,
  },
  deleteModalQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  deleteModalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  deleteModalWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#FF9F0A',
    lineHeight: 17,
  },
  deleteModalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteModalConfirmButton: {
    flex: 1.3,
    backgroundColor: '#FF453A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  deleteModalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recordThirdPartyAbonoButton: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: '#00FFA3',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 2,
  },
  recordThirdPartyAbonoButtonText: {
    color: '#00FFA3',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  // Estilos del Modal Interactivo de Abono de Terceros
  thirdPartyModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  thirdPartyAbonoCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  thirdPartyAbonoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thirdPartyAbonoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  thirdPartyAbonoBadgeText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  thirdPartyAbonoCloseButton: {
    padding: 4,
  },
  thirdPartyAbonoInfoContainer: {
    gap: 4,
  },
  thirdPartyAbonoPersonName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  thirdPartyAbonoMetricsRow: {
    gap: 2,
    marginTop: 2,
  },
  thirdPartyAbonoMonthlyPendingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00FFA3',
  },
  thirdPartyAbonoTotalDebtText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  thirdPartyAbonoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  thirdPartyAbonoInputContainerError: {
    borderColor: '#FF453A',
  },
  thirdPartyAbonoCurrencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00FFA3',
  },
  thirdPartyAbonoInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
  },
  thirdPartyAbonoErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  thirdPartyAbonoErrorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  thirdPartyAbonoPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thirdPartyAbonoPill: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thirdPartyAbonoPillText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  thirdPartyAbonoHintContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  thirdPartyAbonoHintText: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
  },
  thirdPartyAbonoConfirmButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  thirdPartyAbonoConfirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  loanDeleteButton: {
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  loanDeleteButtonProtected: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderColor: 'rgba(255, 159, 10, 0.25)',
  },
  protectedModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  protectedModalBadgeText: {
    color: '#FF9F0A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  protectedIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  protectedModalUnderstoodButton: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    borderColor: 'rgba(255, 159, 10, 0.45)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  protectedModalUnderstoodButtonText: {
    color: '#FF9F0A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  // Estilos del Acordeón y Tarjetas de Deudas y Préstamos Liquidados
  settledAccordionContainer: {
    marginTop: 8,
    backgroundColor: '#161618',
    borderColor: '#26262A',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  settledAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 255, 163, 0.04)',
  },
  settledAccordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settledAccordionHeaderEmoji: {
    fontSize: 15,
  },
  settledAccordionHeaderText: {
    color: '#00FFA3',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  settledAccordionContent: {
    padding: 12,
    gap: 12,
    backgroundColor: '#121214',
    borderTopWidth: 1,
    borderTopColor: '#222226',
  },
  settledCardMuted: {
    opacity: 0.92,
    borderColor: 'rgba(0, 255, 163, 0.2)',
    backgroundColor: '#19191D',
  },
  modalBankSelectorSection: {
    marginTop: 12,
    marginBottom: 6,
  },
  modalBankSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalBankPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  modalBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 6,
  },
  modalBankPillActive: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  modalBankPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalBankPillTextActive: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  // Estilos de agrupación bancaria y acreedores
  bankGroupWrapper: {
    marginBottom: 16,
  },
  bankGroupHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#19191D',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  bankGroupHeaderCardWide: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#252529',
    borderRadius: 0,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
  },
  bankGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  bankGroupHeaderLeftWide: {
    flex: 1,
    minWidth: 0,
  },
  bankGroupIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
  },
  bankGroupInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  bankGroupNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  bankGroupSubtitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bankGroupTotalBadge: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  bankGroupTotalBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64D2FF',
    letterSpacing: 0.8,
  },
  bankGroupTotalBadgeAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00FFA3',
  },
  thirdPartyCardGroupWrapper: {
    marginBottom: 12,
  },
  thirdPartyCardGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181C',
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  thirdPartyCardGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  thirdPartyCardGroupNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64D2FF',
    flexShrink: 1,
  },
  thirdPartyCardGroupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexShrink: 0,
  },
  thirdPartyCardGroupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // Indicadores de Cobertura Visual
  coverageIndicatorContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  coverageBadgeRowCovered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  coveragePillCovered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coveragePillTextCovered: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00FFA3',
    letterSpacing: 0.6,
  },
  coverageDetailCovered: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00FFA3',
  },
  coverageBadgeRowAmortizing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  coveragePillAmortizing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coveragePillTextAmortizing: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9F0A',
    letterSpacing: 0.6,
  },
  coverageDetailAmortizing: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  coverageBadgeRowPending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  coveragePillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coveragePillTextPending: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF453A',
    letterSpacing: 0.6,
  },
  coverageDetailPending: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF453A',
  },
  // Estilos de Tarjeta Saldada en el Ciclo
  thirdPartySummaryCardSettled: {
    borderColor: '#00FFA3',
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 255, 163, 0.04)',
  },
  cycleSettledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00FFA3',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  cycleSettledBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00FFA3',
    letterSpacing: 0.5,
  },
  summaryCommitmentBoxSettled: {
    backgroundColor: 'rgba(0, 255, 163, 0.04)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
  },
  commitmentMonthlyDueSettled: {
    color: '#00FFA3',
  },
  commitmentPendingHighlightSettled: {
    color: '#00FFA3',
  },
  settledCycleSuccessBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
  },
  settledCycleSuccessBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
    letterSpacing: 0.5,
  },
  // Estructura Compacta y Responsive de Compras de Terceros
  compactChargeProgressTrack: {
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 6,
    width: '100%',
  },
  compactChargeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactChargeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  compactChargeInfoText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    flexShrink: 1,
  },
  compactChargeMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  compactChargeMiniBadgeCovered: {
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.4)',
  },
  compactChargeMiniBadgeAmortizing: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderColor: 'rgba(255, 159, 10, 0.4)',
  },
  compactChargeMiniBadgePending: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.4)',
  },
  compactChargeMiniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  compactChargeMiniBadgeTextCovered: {
    color: '#00FFA3',
  },
  compactChargeMiniBadgeTextAmortizing: {
    color: '#FF9F0A',
  },
  compactChargeMiniBadgeTextPending: {
    color: '#FF453A',
  },
  compactChargeMonthlyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  compactChargeMonthlyStatusText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  compactChargeMonthlyStatusTextCovered: {
    color: '#00FFA3',
  },
  compactChargeMonthlyStatusTextPending: {
    color: '#FF9F0A',
  },
});

export default DebtsScreen;

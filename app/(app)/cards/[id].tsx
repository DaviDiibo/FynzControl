import React, { useState, useMemo, useEffect } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { useCardsStore } from '../../../src/store/cards-store';
import { useTransactionsStore, type Transaction } from '../../../src/store/transactions-store';
import {
  useDebtsStore,
  type PersonalDebt,
  type ThirdPartyCardCharge,
} from '../../../src/store/debts-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { CardPaymentModal } from '../../../src/components/cards/card-payment-modal';
import {
  calculateRecurringDueDate,
  getUrgencyStatus,
  getCardBillingCycleDates,
  getInstallmentProgressInfo,
  getProjectedCardBillingPeriod,
  isOneTimeExpenseInPeriod,
  getProjectedInstallmentInfo,
  getDebtDueStatus,
  getEffectivePaidInstallments,
  type ProjectedInstallmentInfo,
} from '../../../src/utils/date-helpers';
import { useIsWide } from '../../../src/hooks/use-responsive';

type FilterTab = 'all' | 'cycle' | 'installments' | 'third_party';

type DeletionTarget =
  | { type: 'cycle_expense'; id: string; title: string; amount: number }
  | { type: 'installment_purchase'; id: string; title: string; amount: number; hasPayments: boolean }
  | null;

const computeCardPersonalDebtPeriodPaid = (
  debt: PersonalDebt,
  cardMonthDebt: number,
  closingDay: number
): boolean => {
  if (Boolean(debt.settled) || (debt.remainingAmount ?? 0) <= 0) {
    return true;
  }

  const initialPaid =
    debt.initialPaidInstallments ??
    (debt.isPreexisting ? (debt.paidInstallments ?? 0) : 0);
  const currentPaid = debt.paidInstallments ?? 0;
  const hasDirectPayment = debt.isPreexisting
    ? currentPaid > initialPaid || (debt.totalActualPaid ?? 0) > 0
    : currentPaid > initialPaid ||
      (debt.totalAmount - (debt.remainingAmount ?? 0)) > 0 ||
      (debt.totalActualPaid ?? 0) > 0;

  if (cardMonthDebt > 0) {
    if (!hasDirectPayment) {
      return false;
    }
    const debtStatus = getDebtDueStatus(debt.dueDay ?? closingDay, debt.lastPaymentDate);
    return debtStatus.isUpToDateThisMonth;
  }

  return true;
};

const getEffectivePersonalPaidInstallments = (
  debt: PersonalDebt,
  isCurrentPeriodPaid: boolean
): number => {
  const initialPaid =
    debt.initialPaidInstallments ??
    (debt.isPreexisting ? (debt.paidInstallments ?? 0) : 0);
  const currentPaid = debt.paidInstallments ?? 0;
  const total = debt.totalInstallments ?? 1;

  if (isCurrentPeriodPaid && currentPaid === initialPaid) {
    return Math.min(total, currentPaid + 1);
  }
  return currentPaid;
};

const CardDetailScreen = (): JSX.Element => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWide = useIsWide(768);

  // Stores
  const cards = useCardsStore((state) => state.cards);
  const transactions = useTransactionsStore((state) => state.transactions);
  const deleteTransaction = useTransactionsStore((state) => state.deleteTransaction);
  const personalDebts = useDebtsStore((state) => state.personalDebts);
  const thirdPartyCharges = useDebtsStore((state) => state.thirdPartyCharges);
  const deletePersonalDebt = useDebtsStore((state) => state.deletePersonalDebt);
  const currencyCode = useSettingsStore((state) => state.currency);

  // Estados locales
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedPeriodOffset, setSelectedPeriodOffset] = useState<number>(0);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState<boolean>(false);
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget>(null);

  // Atajo de teclado Escape en Web y Tauri para volver o cerrar modales
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          if (deletionTarget !== null) {
            setDeletionTarget(null);
            return;
          }
          if (isPaymentModalVisible) {
            setIsPaymentModalVisible(false);
            return;
          }
          router.back();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [deletionTarget, isPaymentModalVisible, router]);

  // Buscar la tarjeta objetivo
  const card = useMemo(() => {
    return cards.find((c) => c.id === id);
  }, [cards, id]);

  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateDisplay = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleConfirmDelete = (): void => {
    if (!deletionTarget) return;

    if (deletionTarget.type === 'cycle_expense') {
      deleteTransaction(deletionTarget.id);
      setDeletionTarget(null);
    } else if (deletionTarget.type === 'installment_purchase') {
      if (!deletionTarget.hasPayments) {
        deletePersonalDebt(deletionTarget.id);
      }
      setDeletionTarget(null);
    }
  };

  const handleCancelDelete = (): void => {
    setDeletionTarget(null);
  };

  // Cálculos contables de la tarjeta y sus consumos
  const {
    cardClosingDay,
    cardPaymentDay,
    urgencyStatus,
    currentCycleTransactions,
    currentCycleTotal,
    linkedPersonalDebts,
    personalMonthDue,
    linkedThirdPartyCharges,
    thirdPartyMonthDue,
    cardPayments,
    cardCurrentMonthDebt,
    cardTotalDebt,
    creditLimit,
    usedCredit,
    availableCredit,
    creditUsedPercent,
    projectedOneTimeTx,
    projectedOneTimeTotal,
    projectedPersonalDebts,
    projectedPersonalDue,
    projectedThirdPartyCharges,
    projectedThirdPartyDue,
    projectedPeriodTotalDue,
  } = useMemo(() => {
    if (!card) {
      return {
        cardClosingDay: 20,
        cardPaymentDay: 5,
        urgencyStatus: null,
        currentCycleTransactions: [] as Transaction[],
        currentCycleTotal: 0,
        linkedPersonalDebts: [] as PersonalDebt[],
        personalMonthDue: 0,
        linkedThirdPartyCharges: [] as ThirdPartyCardCharge[],
        thirdPartyMonthDue: 0,
        cardPayments: 0,
        cardCurrentMonthDebt: 0,
        cardTotalDebt: 0,
        creditLimit: 0,
        usedCredit: 0,
        availableCredit: 0,
        creditUsedPercent: 0,
        projectedOneTimeTx: [] as Transaction[],
        projectedOneTimeTotal: 0,
        projectedPersonalDebts: [] as { debt: PersonalDebt; proj: ProjectedInstallmentInfo }[],
        projectedPersonalDue: 0,
        projectedThirdPartyCharges: [] as { charge: ThirdPartyCardCharge; proj: ProjectedInstallmentInfo }[],
        projectedThirdPartyDue: 0,
        projectedPeriodTotalDue: 0,
      };
    }

    const closingDay = card.closingDay ?? card.cutOffDay ?? 20;
    const paymentDay = card.paymentDay ?? card.cutOffDay ?? 5;

    // Urgencia de vencimiento de pago
    const recurringPayment = calculateRecurringDueDate(paymentDay);
    const urgency = getUrgencyStatus(recurringPayment.daysRemaining);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Compras directas del período de facturación actual
    const cycleTx = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (t.paymentMethod !== 'credit_card') return false;
      const isMatchingCard =
        t.cardId === card.id ||
        (t.cardName && card.name && t.cardName.toLowerCase() === card.name.toLowerCase());
      if (!isMatchingCard) return false;
      if (t.relatedDebtId || t.relatedChargeId || t.relatedLoanId) return false;

      const txDate = new Date(t.date);
      if (isNaN(txDate.getTime())) return false;
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
    });

    const cycleTotal = cycleTx.reduce((acc, t) => acc + (t.amount ?? 0), 0);

    // 2. Compras en cuotas propias (personalDebts vinculadas a la tarjeta)
    const personal = personalDebts.filter(
      (d) =>
        (d.cardId === card.id ||
          d.creditCardId === card.id ||
          (d.title && card.name && d.title.toLowerCase().includes(card.name.toLowerCase()))) &&
        !d.settled
    );

    const pMonthDue = personal.reduce((acc, d) => {
      const rem = d.remainingAmount ?? 0;
      if (d.cardPaymentType === 'full_statement') return acc + rem;
      if (d.monthlyPayment && d.monthlyPayment > 0) return acc + Math.min(rem, d.monthlyPayment);
      return acc + rem;
    }, 0);

    // 3. Consumos de terceros asociados a esta tarjeta
    const isDateInCurrentBillingCycle = (dateStr?: string): boolean => {
      if (!dateStr) return false;
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return false;
      const d = dt.getDate();
      const m = dt.getMonth();
      const y = dt.getFullYear();
      let billMonth = m;
      let billYear = y;
      if (d >= closingDay) {
        billMonth = m + 1;
        if (billMonth > 11) {
          billMonth = 0;
          billYear = y + 1;
        }
      }
      return (
        (billMonth === currentMonth && billYear === currentYear) ||
        (m === currentMonth && y === currentYear)
      );
    };

    const thirdParty = thirdPartyCharges.filter((c) => {
      const isMatchingCard =
        c.cardId === card.id ||
        (c.cardName && card.name && c.cardName.toLowerCase() === card.name.toLowerCase());
      if (!isMatchingCard) return false;

      const isUnsettledWithRemaining = !c.settled && (c.remainingAmount ?? 0) > 0;
      const isSettledInCurrentCycle =
        (c.settled || (c.remainingAmount ?? 0) <= 0) &&
        (isDateInCurrentBillingCycle(c.settledAt) ||
          isDateInCurrentBillingCycle(c.lastPaymentDate) ||
          (c.currentPeriodPaidAmount ?? 0) > 0);

      return isUnsettledWithRemaining || isSettledInCurrentCycle;
    });

    const tpMonthDue = thirdParty.reduce((acc, c) => {
      if (!c.settled && (c.remainingAmount ?? 0) > 0) {
        const rem = c.remainingAmount ?? 0;
        const count = c.installmentsCount ?? 1;
        const normalQuota =
          count <= 1
            ? (c.totalAmount || c.amount || rem)
            : (c.monthlyInstallmentAmount && c.monthlyInstallmentAmount > 0
                ? c.monthlyInstallmentAmount
                : rem);
        return acc + Math.min(rem, normalQuota);
      } else {
        const retainedQuota =
          c.currentPeriodPaidAmount && c.currentPeriodPaidAmount > 0
            ? c.currentPeriodPaidAmount
            : (c.installmentsCount ?? 1) <= 1
            ? (c.totalAmount || c.amount || 0)
            : (c.monthlyInstallmentAmount || c.totalAmount || c.amount || 0);
        return acc + retainedQuota;
      }
    }, 0);

    // 4. Pagos de tarjeta aplicados
    const payments = transactions
      .filter((t) => t.type === 'card_payment' && t.cardId === card.id)
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);

    // 5. Consolidación contable
    const rawMonthDue = pMonthDue + tpMonthDue + cycleTotal;
    const personalRemainingTotal = personal.reduce((acc, d) => acc + (d.remainingAmount ?? 0), 0);
    const thirdPartyRemainingTotal = thirdParty.reduce((acc, c) => acc + (c.remainingAmount ?? 0), 0);
    const rawTotalDebt = personalRemainingTotal + thirdPartyRemainingTotal + cycleTotal;

    const currentMonthDebt = Math.max(0, rawMonthDue - payments);
    const totalDebt = Math.max(0, rawTotalDebt - payments);

    // 6. Proyecciones para períodos futuros o actual según selectedPeriodOffset
    const projOneTime = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (t.paymentMethod !== 'credit_card') return false;
      const isMatchingCard =
        t.cardId === card.id ||
        (t.cardName && card.name && t.cardName.toLowerCase() === card.name.toLowerCase());
      if (!isMatchingCard) return false;
      if (t.relatedDebtId || t.relatedChargeId || t.relatedLoanId) return false;

      return isOneTimeExpenseInPeriod(t.date, closingDay, selectedPeriodOffset);
    });

    const projOneTimeTotal = projOneTime.reduce((acc, t) => acc + (t.amount ?? 0), 0);

    const projPersonal = personal
      .map((d) => {
        const quota =
          d.monthlyPayment && d.monthlyPayment > 0
            ? Math.min(d.remainingAmount ?? 0, d.monthlyPayment)
            : (d.remainingAmount ?? 0);
        const isCurrentPeriodPaid = computeCardPersonalDebtPeriodPaid(
          d,
          currentMonthDebt,
          closingDay
        );
        const effectivePaid = getEffectivePersonalPaidInstallments(d, isCurrentPeriodPaid);
        const proj = getProjectedInstallmentInfo(
          d.totalInstallments ?? 1,
          effectivePaid,
          quota,
          selectedPeriodOffset,
          d.settled,
          isCurrentPeriodPaid
        );
        return { debt: d, proj };
      })
      .filter((item) => item.proj.isActiveInPeriod);

    const projPersonalDue = projPersonal.reduce(
      (acc, item) => acc + item.proj.projectedAmount,
      0
    );

    const projThirdParty = thirdParty
      .filter((c) => !c.settled && (c.remainingAmount ?? 0) > 0)
      .map((c) => {
        const quota =
          c.monthlyInstallmentAmount && c.monthlyInstallmentAmount > 0
            ? c.monthlyInstallmentAmount
            : c.totalAmount || c.amount || 0;
        const isFullyCovered =
          Boolean(c.settled) || (c.remainingAmount ?? 0) <= 0;
        const isMonthSettled =
          isFullyCovered ||
          (c.currentPeriodPaidAmount ?? 0) >=
            (c.monthlyInstallmentAmount || c.totalAmount || c.amount || 1);
        const effectivePaid = getEffectivePaidInstallments(
          c.totalAmount || c.amount,
          c.remainingAmount,
          c.monthlyInstallmentAmount,
          c.installmentsCount,
          c.paidInstallmentsCount
        );
        const proj = getProjectedInstallmentInfo(
          c.installmentsCount ?? 1,
          effectivePaid,
          quota,
          selectedPeriodOffset,
          c.settled,
          isMonthSettled
        );
        return { charge: c, proj };
      })
      .filter((item) => item.proj.isActiveInPeriod);

    const projThirdPartyDue = projThirdParty.reduce(
      (acc, item) => acc + item.proj.projectedAmount,
      0
    );

    const projPeriodTotalDue =
      selectedPeriodOffset === 0
        ? currentMonthDebt
        : projOneTimeTotal + projPersonalDue + projThirdPartyDue;

    // 7. Métricas de límite de crédito
    const limit = card.creditLimit ?? 0;
    const used = totalDebt;
    const available = limit > 0 ? Math.max(0, limit - used) : 0;
    const usedPercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    return {
      cardClosingDay: closingDay,
      cardPaymentDay: paymentDay,
      urgencyStatus: urgency,
      currentCycleTransactions: cycleTx,
      currentCycleTotal: cycleTotal,
      linkedPersonalDebts: personal,
      personalMonthDue: pMonthDue,
      linkedThirdPartyCharges: thirdParty,
      thirdPartyMonthDue: tpMonthDue,
      cardPayments: payments,
      cardCurrentMonthDebt: currentMonthDebt,
      cardTotalDebt: totalDebt,
      creditLimit: limit,
      usedCredit: used,
      availableCredit: available,
      creditUsedPercent: usedPercent,
      projectedOneTimeTx: projOneTime,
      projectedOneTimeTotal: projOneTimeTotal,
      projectedPersonalDebts: projPersonal,
      projectedPersonalDue: projPersonalDue,
      projectedThirdPartyCharges: projThirdParty,
      projectedThirdPartyDue: projThirdPartyDue,
      projectedPeriodTotalDue: projPeriodTotalDue,
    };
  }, [card, transactions, personalDebts, thirdPartyCharges, selectedPeriodOffset]);

  // Si la tarjeta no existe o fue eliminada, mostrar pantalla de rescate
  if (!card) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={[styles.rescueContainer, isWide && styles.rescueContainerWide]}>
          <View style={styles.rescueIconCircle}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF453A" />
          </View>
          <Text style={styles.rescueTitle}>Tarjeta no encontrada</Text>
          <Text style={styles.rescueSubtitle}>
            La tarjeta solicitada no existe o fue dada de baja de tus registros.
          </Text>
          <TouchableOpacity
            style={styles.rescueButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista de tarjetas"
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.rescueButtonText}>Volver a Tarjetas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cardAccentColor = card.color || '#0A84FF';
  const cycleDates = useMemo(() => {
    return getCardBillingCycleDates(cardClosingDay, cardPaymentDay);
  }, [cardClosingDay, cardPaymentDay]);

  const periodActual = useMemo(() => {
    return getProjectedCardBillingPeriod(
      { closingDay: cardClosingDay, paymentDay: cardPaymentDay },
      0
    );
  }, [cardClosingDay, cardPaymentDay]);

  const periodNext = useMemo(() => {
    return getProjectedCardBillingPeriod(
      { closingDay: cardClosingDay, paymentDay: cardPaymentDay },
      1
    );
  }, [cardClosingDay, cardPaymentDay]);

  const periodPlus2 = useMemo(() => {
    return getProjectedCardBillingPeriod(
      { closingDay: cardClosingDay, paymentDay: cardPaymentDay },
      2
    );
  }, [cardClosingDay, cardPaymentDay]);

  const activeProjectedPeriod =
    selectedPeriodOffset === 0
      ? periodActual
      : selectedPeriodOffset === 1
      ? periodNext
      : periodPlus2;

  // Conteos para tabs según el período seleccionado
  const allCount =
    selectedPeriodOffset === 0
      ? currentCycleTransactions.length +
        linkedPersonalDebts.length +
        linkedThirdPartyCharges.length
      : projectedOneTimeTx.length +
        projectedPersonalDebts.length +
        projectedThirdPartyCharges.length;

  const cycleCount =
    selectedPeriodOffset === 0
      ? currentCycleTransactions.length
      : projectedOneTimeTx.length;

  const installmentsCount =
    selectedPeriodOffset === 0
      ? linkedPersonalDebts.length
      : projectedPersonalDebts.length;

  const thirdPartyCount =
    selectedPeriodOffset === 0
      ? linkedThirdPartyCharges.length
      : projectedThirdPartyCharges.length;

  // Renderizadores modulares para composición responsiva (Móvil vs Web/Desktop)
  const renderCyberCard = (): JSX.Element => (
    <View style={[styles.cyberCard, { borderColor: cardAccentColor }, isWide && styles.cyberCardWide]}>
      {/* Fila Superior: Chip y Marca */}
      <View style={styles.cyberCardTopRow}>
        <View style={styles.chipWrapper}>
          <View style={styles.chipBody}>
            <Ionicons name="hardware-chip-outline" size={26} color="#FFD700" />
          </View>
          <Ionicons name="wifi" size={20} color="#8E8E93" style={styles.contactlessIcon} />
        </View>
        <View style={styles.cyberCardRightMeta}>
          {card.isDefault && (
            <View style={styles.defaultPill}>
              <Text style={styles.defaultPillText}>★ Predeterminada</Text>
            </View>
          )}
          <Ionicons name="card" size={24} color={cardAccentColor} />
        </View>
      </View>

      {/* Número de Tarjeta Estilizado */}
      <Text style={styles.cyberCardNumber}>
        •••• •••• •••• {card.lastFourDigits || card.id.slice(-4)}
      </Text>

      {/* Fila Titular / Banco */}
      <View style={styles.cyberCardHolderRow}>
        <View style={styles.cyberCardHolderCol}>
          <Text style={styles.cyberCardLabel}>TITULAR / CUENTA</Text>
          <Text style={styles.cyberCardValue}>{card.name.toUpperCase()}</Text>
        </View>
        <View style={styles.cyberCardBankCol}>
          <Text style={styles.cyberCardLabel}>EMISOR</Text>
          <Text style={styles.cyberCardValue}>{card.bankName.toUpperCase()}</Text>
        </View>
      </View>

      {/* Barra de Cupo Asignado (si creditLimit > 0) */}
      {creditLimit > 0 && (
        <View style={styles.creditLimitContainer}>
          <View style={styles.creditLimitHeader}>
            <Text style={styles.creditLimitLabel}>
              Cupo usado: {formatCurrency(usedCredit)} ({creditUsedPercent}%)
            </Text>
            <Text style={styles.creditLimitAvailable}>
              Disp: {formatCurrency(availableCredit)}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${creditUsedPercent}%`,
                  backgroundColor:
                    creditUsedPercent > 85
                      ? '#FF453A'
                      : creditUsedPercent > 60
                      ? '#FF9F0A'
                      : '#00FFA3',
                },
              ]}
            />
          </View>
          <Text style={styles.creditLimitTotal}>
            Límite asignado: {formatCurrency(creditLimit)}
          </Text>
        </View>
      )}

      {/* Fechas de Facturación */}
      <View style={styles.cycleDatesRow}>
        <View style={styles.cycleDateItem}>
          <Ionicons name="cut-outline" size={13} color="#0A84FF" />
          <Text style={styles.cycleDateLabel}>
            Corte: <Text style={styles.cycleDateValue}>{cycleDates.closingFormatted}</Text>
          </Text>
        </View>

        <View style={styles.cycleDateItem}>
          <Ionicons name="calendar-outline" size={13} color="#FF9F0A" />
          <Text style={styles.cycleDateLabel}>
            Límite Pago: <Text style={styles.cycleDateValue}>{cycleDates.paymentDueFormatted}</Text>
          </Text>
          <View
            style={[
              styles.urgencyBadge,
              {
                backgroundColor: cycleDates.urgencyStatus.badgeBg,
                borderColor: cycleDates.urgencyStatus.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.urgencyBadgeText, { color: cycleDates.urgencyStatus.color }]}>
              {cycleDates.urgencyStatus.label}
              {cycleDates.daysUntilPayment > 0 ? ` (${cycleDates.daysUntilPayment}d)` : ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPeriodSelector = (): JSX.Element => (
    <View style={[styles.periodSelectorWrapper, isWide && styles.periodSelectorWrapperWide]}>
      <View style={styles.periodSelectorContainer}>
        <TouchableOpacity
          style={[
            styles.periodTabButton,
            selectedPeriodOffset === 0 && styles.periodTabButtonActive,
          ]}
          onPress={() => setSelectedPeriodOffset(0)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ver extracto actual"
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={selectedPeriodOffset === 0 ? '#00FFA3' : '#8E8E93'}
            style={styles.periodIcon}
          />
          <Text
            style={[
              styles.periodTabTitle,
              selectedPeriodOffset === 0 && styles.periodTabTitleActive,
            ]}
          >
            Actual
          </Text>
          <Text
            style={[
              styles.periodTabSubtitle,
              selectedPeriodOffset === 0 && styles.periodTabSubtitleActive,
            ]}
          >
            ({periodActual.statementMonthName.slice(0, 3)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.periodTabButton,
            selectedPeriodOffset === 1 && styles.periodTabButtonActive,
          ]}
          onPress={() => setSelectedPeriodOffset(1)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ver extracto próximo mes"
        >
          <Ionicons
            name="arrow-forward-circle-outline"
            size={13}
            color={selectedPeriodOffset === 1 ? '#00FFA3' : '#8E8E93'}
            style={styles.periodIcon}
          />
          <Text
            style={[
              styles.periodTabTitle,
              selectedPeriodOffset === 1 && styles.periodTabTitleActive,
            ]}
          >
            Próximo Mes
          </Text>
          <Text
            style={[
              styles.periodTabSubtitle,
              selectedPeriodOffset === 1 && styles.periodTabSubtitleActive,
            ]}
          >
            ({periodNext.statementMonthName.slice(0, 3)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.periodTabButton,
            selectedPeriodOffset === 2 && styles.periodTabButtonActive,
          ]}
          onPress={() => setSelectedPeriodOffset(2)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ver extracto en dos meses"
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color={selectedPeriodOffset === 2 ? '#00FFA3' : '#8E8E93'}
            style={styles.periodIcon}
          />
          <Text
            style={[
              styles.periodTabTitle,
              selectedPeriodOffset === 2 && styles.periodTabTitleActive,
            ]}
          >
            +2 Meses
          </Text>
          <Text
            style={[
              styles.periodTabSubtitle,
              selectedPeriodOffset === 2 && styles.periodTabSubtitleActive,
            ]}
          >
            ({periodPlus2.statementMonthName.slice(0, 3)})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHudSaldos = (): JSX.Element => {
    const isProjected = selectedPeriodOffset > 0;
    const hudTitle =
      selectedPeriodOffset === 0
        ? 'A PAGAR ESTE MES'
        : selectedPeriodOffset === 1
        ? 'A PAGAR EL PRÓXIMO MES'
        : `A PAGAR EN ${activeProjectedPeriod.statementMonthName.toUpperCase()}`;

    const dueAmount = isProjected ? projectedPeriodTotalDue : cardCurrentMonthDebt;

    const displayPersonalDue =
      selectedPeriodOffset === 0
        ? personalMonthDue + currentCycleTotal
        : projectedPersonalDue + projectedOneTimeTotal;

    const displayThirdPartyDue =
      selectedPeriodOffset === 0
        ? thirdPartyMonthDue
        : projectedThirdPartyDue;

    return (
      <View style={[styles.hudContainer, isWide && styles.hudContainerWide]}>
        <View style={styles.hudCardDue}>
          <View style={styles.hudHeaderRow}>
            <View style={styles.hudIconRow}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={dueAmount > 0 ? (isProjected ? '#0A84FF' : '#FF453A') : '#00FFA3'}
              />
              <Text style={styles.hudTitle}>{hudTitle}</Text>
            </View>
            {dueAmount === 0 ? (
              <View style={styles.settledBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#00FFA3" />
                <Text style={styles.settledBadgeText}>
                  {selectedPeriodOffset === 0 ? '✓ AL DÍA' : '✓ SIN COBROS'}
                </Text>
              </View>
            ) : isProjected ? (
              <View style={styles.projectedHudBadge}>
                <Text style={styles.projectedHudBadgeText}>PROYECCIÓN</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.hudMainAmount,
              dueAmount > 0
                ? isProjected
                  ? styles.hudAmountProjected
                  : styles.hudAmountOwed
                : styles.hudAmountSettled,
            ]}
          >
            {formatCurrency(dueAmount)}
          </Text>
          <Text style={styles.hudDueSubtitle}>
            {selectedPeriodOffset === 0
              ? `Vence el ${cycleDates.paymentDueFormatted} · ${cycleDates.phaseLabel}`
              : `Vence el ${activeProjectedPeriod.paymentDueFormatted} · ${activeProjectedPeriod.phaseLabel} (${activeProjectedPeriod.statementMonthName})`}
          </Text>
          <Text style={styles.hudSubtext}>
            Propio: {formatCurrency(displayPersonalDue)} • Terceros:{' '}
            {formatCurrency(displayThirdPartyDue)}
          </Text>
        </View>

        <View style={styles.hudCardTotal}>
          <View style={styles.hudHeaderRow}>
            <View style={styles.hudIconRow}>
              <Ionicons name="time-outline" size={15} color="#8E8E93" />
              <Text style={styles.hudTitleSecondary}>DEUDA TOTAL DIFERIDA</Text>
            </View>
          </View>
          <Text style={styles.hudTotalAmount}>{formatCurrency(cardTotalDebt)}</Text>
          <Text style={styles.hudSubtextSecondary}>
            Saldo pendiente consolidado de cuotas y ciclo
          </Text>
        </View>
      </View>
    );
  };

  const renderTabs = (): JSX.Element => (
    <View style={[styles.tabsContainer, isWide && styles.tabsContainerWide]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
      >
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabPillText,
              activeTab === 'all' && styles.tabPillTextActive,
            ]}
          >
            Todos ({allCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'cycle' && styles.tabPillActive]}
          onPress={() => setActiveTab('cycle')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabPillText,
              activeTab === 'cycle' && styles.tabPillTextActive,
            ]}
          >
            {selectedPeriodOffset === 0
              ? `Compras del Mes (${cycleCount})`
              : `Post-Corte (${cycleCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabPill,
            activeTab === 'installments' && styles.tabPillActive,
          ]}
          onPress={() => setActiveTab('installments')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabPillText,
              activeTab === 'installments' && styles.tabPillTextActive,
            ]}
          >
            Cuotas Propias ({installmentsCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabPill,
            activeTab === 'third_party' && styles.tabPillActive,
          ]}
          onPress={() => setActiveTab('third_party')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabPillText,
              activeTab === 'third_party' && styles.tabPillTextActive,
            ]}
          >
            Terceros ({thirdPartyCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderConsumptionList = (): JSX.Element => (
    <View style={styles.consumptionList}>
      {/* 1. Compras Directas (1 Cuota) */}
      {(activeTab === 'all' || activeTab === 'cycle') && (
        selectedPeriodOffset === 0
          ? currentCycleTransactions.map((tx: Transaction) => (
              <View key={`cycle-${tx.id}`} style={styles.consumptionItem}>
                <View style={styles.consumptionIconWrapper}>
                  <Ionicons name="cart-outline" size={18} color="#0A84FF" />
                </View>
                <View style={styles.consumptionContent}>
                  <View style={styles.consumptionTitleRow}>
                    <Text style={styles.consumptionTitle} numberOfLines={1}>
                      {tx.title || 'Gasto corriente'}
                    </Text>
                    <View style={styles.consumptionAmountRow}>
                      <Text style={styles.consumptionAmount}>
                        {formatCurrency(tx.amount)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteIconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        onPress={() =>
                          setDeletionTarget({
                            type: 'cycle_expense',
                            id: tx.id,
                            title: tx.title || 'Gasto corriente',
                            amount: tx.amount,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar compra ${tx.title || 'Gasto corriente'}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.consumptionMetaRow}>
                    <Text style={styles.consumptionMetaText}>
                      📅 {formatDateDisplay(tx.date)}
                    </Text>
                    <View style={styles.cycleBadge}>
                      <Text style={styles.cycleBadgeText}>Compra 1 Cuota</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          : projectedOneTimeTx.map((tx: Transaction) => (
              <View key={`cycle-proj-${tx.id}`} style={styles.consumptionItem}>
                <View style={styles.consumptionIconWrapper}>
                  <Ionicons name="cart-outline" size={18} color="#0A84FF" />
                </View>
                <View style={styles.consumptionContent}>
                  <View style={styles.consumptionTitleRow}>
                    <Text style={styles.consumptionTitle} numberOfLines={1}>
                      {tx.title || 'Compra diferida'}
                    </Text>
                    <View style={styles.consumptionAmountRow}>
                      <Text style={styles.consumptionAmount}>
                        {formatCurrency(tx.amount)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteIconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        onPress={() =>
                          setDeletionTarget({
                            type: 'cycle_expense',
                            id: tx.id,
                            title: tx.title || 'Compra diferida',
                            amount: tx.amount,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar compra ${tx.title || 'Compra diferida'}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF453A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.consumptionMetaRow}>
                    <Text style={styles.consumptionMetaText}>
                      📅 {formatDateDisplay(tx.date)}
                    </Text>
                    <View style={styles.cycleBadge}>
                      <Text style={styles.cycleBadgeText}>
                        Post-corte • {activeProjectedPeriod.statementMonthName}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
      )}

      {/* 2. Cuotas Propias */}
      {(activeTab === 'all' || activeTab === 'installments') && (
        selectedPeriodOffset === 0
          ? linkedPersonalDebts.map((debt: PersonalDebt) => {
              const isSettledOrPaidOff =
                Boolean(debt.settled) || (debt.remainingAmount ?? 0) <= 0;
              const isCurrentPeriodPaid = computeCardPersonalDebtPeriodPaid(
                debt,
                cardCurrentMonthDebt,
                cardClosingDay
              );
              const effectivePaid = getEffectivePersonalPaidInstallments(
                debt,
                isCurrentPeriodPaid
              );
              const progressInfo = getInstallmentProgressInfo(
                debt.totalInstallments ?? 1,
                effectivePaid,
                isCurrentPeriodPaid
              );
              const initialPaid =
                debt.initialPaidInstallments ??
                (debt.isPreexisting ? (debt.paidInstallments ?? 0) : 0);
              const currentPaid = debt.paidInstallments ?? 0;
              const hasPayments = debt.isPreexisting
                ? currentPaid > initialPaid || (debt.totalActualPaid ?? 0) > 0
                : currentPaid > 0 ||
                  debt.totalAmount - debt.remainingAmount > 0 ||
                  (debt.totalActualPaid ?? 0) > 0;

              return (
                <View key={`inst-${debt.id}`} style={styles.consumptionItem}>
                  <View style={[styles.consumptionIconWrapper, { backgroundColor: 'rgba(0, 255, 163, 0.1)' }]}>
                    <Ionicons name="card-outline" size={18} color="#00FFA3" />
                  </View>
                  <View style={styles.consumptionContent}>
                    <View style={styles.consumptionTitleRow}>
                      <Text style={styles.consumptionTitle} numberOfLines={1}>
                        {debt.title}
                      </Text>
                      <View style={styles.consumptionAmountRow}>
                        <Text style={styles.consumptionMonthlyAmount}>
                          {formatCurrency(debt.monthlyPayment ?? debt.remainingAmount)}/mes
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                          onPress={() =>
                            setDeletionTarget({
                              type: 'installment_purchase',
                              id: debt.id,
                              title: debt.title,
                              amount: debt.totalAmount,
                              hasPayments,
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar compra en cuotas ${debt.title}`}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.personalStatusRow}>
                      {isSettledOrPaidOff ? (
                        <View style={styles.tpSettledPill}>
                          <Text style={styles.tpSettledPillText}>✓ 100% Cubierto</Text>
                        </View>
                      ) : isCurrentPeriodPaid ? (
                        <View style={styles.tpSettledPill}>
                          <Text style={styles.tpSettledPillText}>✓ Cuota saldada</Text>
                        </View>
                      ) : (
                        <View style={styles.tpPendingPill}>
                          <Text style={styles.tpPendingPillText}>Pendiente este mes</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.installmentProgressBlock}>
                      <View style={styles.installmentProgressLabels}>
                        <Text style={styles.installmentCountText}>
                          {progressInfo.currentInstallmentLabel}
                        </Text>
                        <Text style={styles.installmentRemainingText}>
                          {formatCurrency(debt.remainingAmount)} restantes
                        </Text>
                      </View>
                      <Text style={styles.installmentSubtext}>
                        {debt.paidInstallments ?? 0} pagadas · Restan {Math.max(0, (debt.totalInstallments ?? 1) - (debt.paidInstallments ?? 0))} cuotas
                      </Text>
                      <View style={styles.miniProgressBarTrack}>
                        <View
                          style={[
                            styles.miniProgressBarFill,
                            { width: `${progressInfo.progressPercent}%`, backgroundColor: '#00FFA3' },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          : projectedPersonalDebts.map(({ debt, proj }) => {
              const initialPaid =
                debt.initialPaidInstallments ??
                (debt.isPreexisting ? (debt.paidInstallments ?? 0) : 0);
              const currentPaid = debt.paidInstallments ?? 0;
              const hasPayments = debt.isPreexisting
                ? currentPaid > initialPaid || (debt.totalActualPaid ?? 0) > 0
                : currentPaid > 0 ||
                  debt.totalAmount - debt.remainingAmount > 0 ||
                  (debt.totalActualPaid ?? 0) > 0;

              const progressPercent =
                proj.totalInstallments > 0
                  ? Math.min(100, Math.round((proj.installmentNumber / proj.totalInstallments) * 100))
                  : 0;

              return (
                <View key={`inst-proj-${debt.id}`} style={styles.consumptionItem}>
                  <View
                    style={[
                      styles.consumptionIconWrapper,
                      { backgroundColor: 'rgba(0, 255, 163, 0.1)' },
                    ]}
                  >
                    <Ionicons name="card-outline" size={18} color="#00FFA3" />
                  </View>
                  <View style={styles.consumptionContent}>
                    <View style={styles.consumptionTitleRow}>
                      <Text style={styles.consumptionTitle} numberOfLines={1}>
                        {debt.title}
                      </Text>
                      <View style={styles.consumptionAmountRow}>
                        <Text style={styles.consumptionMonthlyAmount}>
                          {formatCurrency(proj.projectedAmount)}/mes
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteIconButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                          onPress={() =>
                            setDeletionTarget({
                              type: 'installment_purchase',
                              id: debt.id,
                              title: debt.title,
                              amount: debt.totalAmount,
                              hasPayments,
                            })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar compra en cuotas ${debt.title}`}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.personalStatusRow}>
                      <View style={styles.projectedPill}>
                        <Text style={styles.projectedPillText}>
                          Proyectada ({activeProjectedPeriod.statementMonthName})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.installmentProgressBlock}>
                      <View style={styles.installmentProgressLabels}>
                        <Text style={styles.installmentCountText}>
                          {proj.badgeLabel}
                        </Text>
                        <Text style={styles.installmentRemainingText}>
                          {formatCurrency(debt.remainingAmount)} restantes
                        </Text>
                      </View>
                      <Text style={styles.installmentSubtext}>
                        {debt.paidInstallments ?? 0} pagadas · Restan {Math.max(0, (debt.totalInstallments ?? 1) - (debt.paidInstallments ?? 0))} cuotas
                      </Text>
                      <View style={styles.miniProgressBarTrack}>
                        <View
                          style={[
                            styles.miniProgressBarFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: '#00FFA3',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
      )}

      {/* 3. Consumos de Terceros */}
      {(activeTab === 'all' || activeTab === 'third_party') && (
        selectedPeriodOffset === 0
          ? linkedThirdPartyCharges.map((charge: ThirdPartyCardCharge) => {
              const isFullyCovered =
                Boolean(charge.settled) || (charge.remainingAmount ?? 0) <= 0;
              const isMonthSettled =
                isFullyCovered ||
                (charge.currentPeriodPaidAmount ?? 0) >=
                  (charge.monthlyInstallmentAmount || charge.totalAmount || charge.amount || 1);
              const effectivePaid = getEffectivePaidInstallments(
                charge.totalAmount || charge.amount,
                charge.remainingAmount,
                charge.monthlyInstallmentAmount,
                charge.installmentsCount,
                charge.paidInstallmentsCount
              );
              const tpProgress = getInstallmentProgressInfo(
                charge.installmentsCount ?? 1,
                effectivePaid,
                isMonthSettled
              );

              return (
                <View key={`tp-${charge.id}`} style={styles.consumptionItem}>
                  <View style={[styles.consumptionIconWrapper, { backgroundColor: 'rgba(255, 159, 10, 0.1)' }]}>
                    <Ionicons name="people-outline" size={18} color="#FF9F0A" />
                  </View>
                  <View style={styles.consumptionContent}>
                    <View style={styles.consumptionTitleRow}>
                      <Text style={styles.consumptionTitle} numberOfLines={1}>
                        {charge.concept}
                      </Text>
                      <Text style={styles.consumptionThirdPartyAmount}>
                        {formatCurrency(
                          charge.monthlyInstallmentAmount || charge.totalAmount || charge.amount
                        )}/mes
                      </Text>
                    </View>

                    <View style={styles.thirdPartyPersonRow}>
                      <View style={styles.thirdPartyPersonBadge}>
                        <Ionicons name="person-outline" size={10} color="#FF9F0A" />
                        <Text style={styles.thirdPartyPersonBadgeText} numberOfLines={1}>
                          {charge.personName}
                        </Text>
                      </View>
                      {isFullyCovered ? (
                        <View style={styles.tpSettledPill}>
                          <Text style={styles.tpSettledPillText}>✓ 100% Cubierto</Text>
                        </View>
                      ) : isMonthSettled ? (
                        <View style={styles.tpSettledPill}>
                          <Text style={styles.tpSettledPillText}>✓ Cuota saldada</Text>
                        </View>
                      ) : (
                        <View style={styles.tpPendingPill}>
                          <Text style={styles.tpPendingPillText}>Pendiente este mes</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.installmentProgressBlock}>
                      <View style={styles.installmentProgressLabels}>
                        <Text style={styles.installmentCountText}>
                          {tpProgress.currentInstallmentLabel}
                        </Text>
                        <Text style={styles.tpRemainingText}>
                          {formatCurrency(charge.remainingAmount)} restantes
                        </Text>
                      </View>
                      <Text style={styles.installmentSubtext}>
                        {tpProgress.progressLabel}
                      </Text>
                      <View style={styles.miniProgressBarTrack}>
                        <View
                          style={[
                            styles.miniProgressBarFill,
                            { width: `${tpProgress.progressPercent}%`, backgroundColor: '#FF9F0A' },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          : projectedThirdPartyCharges.map(({ charge, proj }) => {
              const effectivePaid = getEffectivePaidInstallments(
                charge.totalAmount || charge.amount,
                charge.remainingAmount,
                charge.monthlyInstallmentAmount,
                charge.installmentsCount,
                charge.paidInstallmentsCount
              );
              const progressPercent =
                proj.totalInstallments > 0
                  ? Math.min(100, Math.round((proj.installmentNumber / proj.totalInstallments) * 100))
                  : 0;

              return (
                <View key={`tp-proj-${charge.id}`} style={styles.consumptionItem}>
                  <View
                    style={[
                      styles.consumptionIconWrapper,
                      { backgroundColor: 'rgba(255, 159, 10, 0.1)' },
                    ]}
                  >
                    <Ionicons name="people-outline" size={18} color="#FF9F0A" />
                  </View>
                  <View style={styles.consumptionContent}>
                    <View style={styles.consumptionTitleRow}>
                      <Text style={styles.consumptionTitle} numberOfLines={1}>
                        {charge.concept}
                      </Text>
                      <Text style={styles.consumptionThirdPartyAmount}>
                        {formatCurrency(proj.projectedAmount)}/mes
                      </Text>
                    </View>

                    <View style={styles.thirdPartyPersonRow}>
                      <View style={styles.thirdPartyPersonBadge}>
                        <Ionicons name="person-outline" size={10} color="#FF9F0A" />
                        <Text style={styles.thirdPartyPersonBadgeText} numberOfLines={1}>
                          {charge.personName}
                        </Text>
                      </View>
                      <View style={styles.projectedPill}>
                        <Text style={styles.projectedPillText}>
                          Proyectada ({activeProjectedPeriod.statementMonthName})
                        </Text>
                      </View>
                    </View>

                    <View style={styles.installmentProgressBlock}>
                      <View style={styles.installmentProgressLabels}>
                        <Text style={styles.installmentCountText}>
                          {proj.badgeLabel}
                        </Text>
                        <Text style={styles.tpRemainingText}>
                          {formatCurrency(charge.remainingAmount)} restantes
                        </Text>
                      </View>
                      <Text style={styles.installmentSubtext}>
                        {effectivePaid} pagadas · Restan {Math.max(0, (charge.installmentsCount ?? 1) - effectivePaid)} cuotas
                      </Text>
                      <View style={styles.miniProgressBarTrack}>
                        <View
                          style={[
                            styles.miniProgressBarFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: '#FF9F0A',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
      )}

      {/* Estado vacío cuando no hay elementos en la pestaña */}
      {allCount === 0 ||
      (activeTab === 'cycle' && cycleCount === 0) ||
      (activeTab === 'installments' && installmentsCount === 0) ||
      (activeTab === 'third_party' && thirdPartyCount === 0) ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={selectedPeriodOffset > 0 ? 'calendar-outline' : 'receipt-outline'}
              size={32}
              color={selectedPeriodOffset > 0 ? '#00FFA3' : '#8E8E93'}
            />
          </View>
          <Text style={styles.emptyStateTitle}>
            {selectedPeriodOffset > 0
              ? 'Sin consumos proyectados para este período'
              : 'Sin consumos en esta categoría'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {selectedPeriodOffset > 0
              ? `No hay compras post-corte ni cuotas diferidas que venzan en el extracto de ${activeProjectedPeriod.statementMonthName}.`
              : 'Los consumos, compras en cuotas y gastos de terceros asignados a esta tarjeta aparecerán aquí.'}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderActionButtons = (isDesktop: boolean): JSX.Element => (
    <View style={isDesktop ? styles.desktopActionsContainer : styles.bottomBarContainer}>
      <TouchableOpacity
        style={styles.addInstallmentButton}
        activeOpacity={0.7}
        onPress={() => router.push('/(app)/(modal)/legacy-card-expense')}
        accessibilityRole="button"
        accessibilityLabel="Registrar compra en cuotas"
      >
        <Ionicons name="add-circle-outline" size={18} color="#0A84FF" />
        <Text style={styles.addInstallmentButtonText}>+ Compra en Cuotas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.payCardButton}
        activeOpacity={0.7}
        onPress={() => setIsPaymentModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Pagar tarjeta de crédito"
      >
        <Ionicons name="card" size={18} color="#121212" />
        <Text style={styles.payCardButtonText}>PAGAR TARJETA</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Cabecera de Pantalla Completa */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isWide && styles.headerContentWide]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerPreTitle}>DETALLE DE TARJETA</Text>
            <Text style={styles.headerMainTitle} numberOfLines={1}>
              {card.name}
            </Text>
          </View>
          <View style={styles.bankBadge}>
            <Text style={styles.bankBadgeText} numberOfLines={1}>
              {card.bankName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isWide ? (
          <View style={styles.wideLayoutContainer}>
            {/* Columna Izquierda (~410px fijo) */}
            <View style={styles.leftColumn}>
              {renderCyberCard()}
              {renderPeriodSelector()}
              {renderHudSaldos()}
              {renderActionButtons(true)}
            </View>

            {/* Columna Derecha (Flexible flex: 1) */}
            <View style={styles.rightColumn}>
              {renderTabs()}
              {renderConsumptionList()}
            </View>
          </View>
        ) : (
          <>
            {renderCyberCard()}
            {renderPeriodSelector()}
            {renderHudSaldos()}
            {renderTabs()}
            {renderConsumptionList()}
          </>
        )}
      </ScrollView>

      {/* Barra Inferior Fija de Acciones en Móvil */}
      {!isWide && renderActionButtons(false)}

      {/* Modal de Liquidación / Pago Montado */}
      <CardPaymentModal
        visible={isPaymentModalVisible}
        card={card}
        monthDue={cardCurrentMonthDebt}
        totalDue={cardTotalDebt}
        onClose={() => setIsPaymentModalVisible(false)}
        onSuccess={() => setIsPaymentModalVisible(false)}
      />

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        visible={deletionTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCancelDelete}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal de confirmación"
          />
          <View style={styles.deleteDialogCard}>
            {deletionTarget?.type === 'installment_purchase' && deletionTarget.hasPayments ? (
              <>
                <View style={styles.protectedIconWrapper}>
                  <Ionicons name="lock-closed-outline" size={28} color="#FF9F0A" />
                </View>
                <Text style={styles.deleteDialogTitle}>Eliminación Protegida</Text>
                <Text style={styles.deleteDialogMessage}>
                  Esta compra en cuotas ya registra cuotas pagadas en el historial contable. Para preservar la integridad de los balances, no se puede eliminar directamente.
                </Text>
                <View style={styles.deleteDialogSingleButtonContainer}>
                  <TouchableOpacity
                    style={styles.dialogAcknowledgeButton}
                    onPress={handleCancelDelete}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Entendido"
                  >
                    <Text style={styles.dialogAcknowledgeButtonText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.deleteIconWrapper}>
                  <Ionicons name="trash-outline" size={28} color="#FF453A" />
                </View>
                <Text style={styles.deleteDialogTitle}>
                  {deletionTarget?.type === 'cycle_expense'
                    ? 'Eliminar Compra'
                    : 'Eliminar Compra en Cuotas'}
                </Text>
                <Text style={styles.deleteDialogMessage}>
                  {deletionTarget?.type === 'cycle_expense'
                    ? `¿Seguro que deseas eliminar esta compra de ${formatCurrency(
                        deletionTarget.amount
                      )} por '${deletionTarget.title}'? Se restituirá el límite disponible de la tarjeta.`
                    : deletionTarget
                    ? `¿Deseas eliminar este plan de cuotas de ${formatCurrency(
                        deletionTarget.amount
                      )} por '${deletionTarget.title}'? Se removerá la deuda diferida y se liberará el cupo.`
                    : ''}
                </Text>
                <View style={styles.deleteDialogButtonsRow}>
                  <TouchableOpacity
                    style={styles.dialogCancelButton}
                    onPress={handleCancelDelete}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                  >
                    <Text style={styles.dialogCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dialogConfirmDeleteButton}
                    onPress={handleConfirmDelete}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar eliminación"
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={styles.dialogButtonIcon} />
                    <Text style={styles.dialogConfirmDeleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CardDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
    backgroundColor: '#121212',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  headerContentWide: {
    maxWidth: 1150,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerPreTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 1,
  },
  headerMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bankBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(10, 132, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 120,
  },
  bankBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  scrollContentWide: {
    maxWidth: 1150,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  wideLayoutContainer: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
    width: '100%',
  },
  leftColumn: {
    width: 410,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  cyberCardWide: {
    marginBottom: 0,
  },
  cyberCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  cyberCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipBody: {
    width: 38,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactlessIcon: {
    transform: [{ rotate: '90deg' }],
  },
  cyberCardRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultPill: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00FFA3',
  },
  cyberCardNumber: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cyberCardHolderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cyberCardHolderCol: {
    flex: 1,
  },
  cyberCardBankCol: {
    alignItems: 'flex-end',
  },
  cyberCardLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cyberCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  creditLimitContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    marginBottom: 12,
  },
  creditLimitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  creditLimitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  creditLimitAvailable: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00FFA3',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  creditLimitTotal: {
    fontSize: 10,
    color: '#8E8E93',
  },
  cycleDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    flexWrap: 'wrap',
    gap: 8,
  },
  cycleDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cycleDateLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  cycleDateValue: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hudContainer: {
    gap: 12,
    marginBottom: 16,
  },
  hudContainerWide: {
    marginBottom: 0,
  },
  hudCardDue: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#FF453A',
    borderWidth: 1,
    borderColor: '#262626',
  },
  hudCardTotal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0A84FF',
    borderWidth: 1,
    borderColor: '#262626',
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hudIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF453A',
    letterSpacing: 0.5,
  },
  hudTitleSecondary: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  settledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00FFA3',
  },
  hudMainAmount: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  hudAmountOwed: {
    color: '#FF453A',
  },
  hudAmountSettled: {
    color: '#00FFA3',
  },
  hudDueSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
    marginBottom: 4,
  },
  hudTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hudSubtext: {
    fontSize: 11,
    color: '#8E8E93',
  },
  hudSubtextSecondary: {
    fontSize: 11,
    color: '#8E8E93',
  },
  tabsContainer: {
    marginBottom: 12,
  },
  tabsContainerWide: {
    marginBottom: 16,
  },
  tabsScrollContent: {
    gap: 8,
  },
  tabPill: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tabPillActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.18)',
    borderColor: '#0A84FF',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabPillTextActive: {
    color: '#0A84FF',
  },
  consumptionList: {
    gap: 10,
  },
  consumptionItem: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    gap: 12,
  },
  consumptionIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumptionContent: {
    flex: 1,
  },
  consumptionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  consumptionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  consumptionAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  consumptionMonthlyAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00FFA3',
  },
  consumptionThirdPartyAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  consumptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consumptionMetaText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  cycleBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  cycleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0A84FF',
  },
  installmentProgressBlock: {
    marginTop: 4,
  },
  installmentProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  installmentCountText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  installmentSubtext: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 4,
  },
  installmentRemainingText: {
    fontSize: 11,
    color: '#00FFA3',
    fontWeight: '600',
  },
  miniProgressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  thirdPartyPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 6,
  },
  personalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  thirdPartyPersonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  thirdPartyPersonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  tpRemainingText: {
    fontSize: 11,
    color: '#FF9F0A',
    fontWeight: '600',
  },
  tpSettledPill: {
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tpSettledPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00FFA3',
  },
  tpPendingPill: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tpPendingPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBarContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161616',
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  desktopActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addInstallmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: '#0A84FF',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
  },
  addInstallmentButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A84FF',
  },
  payCardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00FFA3',
    borderRadius: 10,
    paddingVertical: 13,
  },
  payCardButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#121212',
  },
  rescueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rescueContainerWide: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  rescueIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  rescueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  rescueSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  rescueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  consumptionAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteIconButton: {
    padding: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  deleteDialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  deleteIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  protectedIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteDialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteDialogButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dialogCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dialogConfirmDeleteButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#FF453A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogConfirmDeleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialogButtonIcon: {
    marginRight: 6,
  },
  deleteDialogSingleButtonContainer: {
    width: '100%',
  },
  dialogAcknowledgeButton: {
    width: '100%',
    height: 46,
    borderRadius: 10,
    backgroundColor: '#FF9F0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogAcknowledgeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#121212',
  },
  periodSelectorWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  periodSelectorWrapperWide: {
    marginHorizontal: 0,
  },
  periodSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  periodTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: 'transparent',
    gap: 4,
  },
  periodTabButtonActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderWidth: 1,
    borderColor: '#00FFA3',
  },
  periodIcon: {
    marginRight: 2,
  },
  periodTabTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  periodTabTitleActive: {
    color: '#00FFA3',
  },
  periodTabSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#636366',
  },
  periodTabSubtitleActive: {
    color: 'rgba(0, 255, 163, 0.8)',
  },
  projectedHudBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.4)',
  },
  projectedHudBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  hudAmountProjected: {
    color: '#0A84FF',
  },
  projectedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  projectedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
});

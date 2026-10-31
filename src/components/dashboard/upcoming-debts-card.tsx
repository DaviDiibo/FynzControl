import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { useDebtsStore, type PersonalDebt, type ThirdPartyCardCharge } from '../../store/debts-store';
import { useCardsStore, type CreditCard } from '../../store/cards-store';
import { useTransactionsStore, type Transaction } from '../../store/transactions-store';
import { useSettingsStore } from '../../store/settings-store';

export interface UpcomingDebtsCardProps {
  onViewAll?: () => void;
}

import {
  calculateRecurringDueDate,
  getUrgencyStatus,
  getDebtDueStatus,
  MONTH_NAMES_ES,
} from '../../utils/date-helpers';

const formatAmount = (val: number): string => {
  return val.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export interface UpcomingCommitmentItem {
  id: string;
  title: string;
  entity: string;
  amount: number;
  remainingAmount?: number;
  dueDay?: number;
  dueDate: string;
  isCard: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  isMonthly?: boolean;
  lastPaymentDate?: string;
  shouldAlertInDashboard?: boolean;
  daysRemaining?: number;
  isUpToDateThisMonth?: boolean;
  nextDueDateFormatted?: string;
}

export const getConsolidatedUpcomingDebts = (
  personalDebts: PersonalDebt[],
  thirdPartyCharges: ThirdPartyCardCharge[],
  transactions: Transaction[],
  cards: CreditCard[],
  referenceDate: Date = new Date()
): UpcomingCommitmentItem[] => {
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();

  // 1. Filtrar deudas personales puras (excluyendo compras individuales en tarjeta)
  const purePersonalDebts = personalDebts.filter(
    (d) => d.category !== 'credit_card' && !d.cardId && !d.settled && d.remainingAmount > 0
  );

  const mappedPersonalDebts: UpcomingCommitmentItem[] = purePersonalDebts.map((d) => {
    const amountToPay =
      d.monthlyPayment && d.monthlyPayment > 0 && d.monthlyPayment <= d.remainingAmount
        ? d.monthlyPayment
        : d.remainingAmount;
    const isMonthly =
      d.debtType === 'installment_loan' ||
      Boolean(d.totalInstallments) ||
      Boolean(d.monthlyPayment);

    const debtStatus = getDebtDueStatus(d.dueDay ?? 1, d.lastPaymentDate, referenceDate);
    const day = debtStatus.nextDueDate.getDate();
    const month = MONTH_NAMES_ES[debtStatus.nextDueDate.getMonth()] ?? '';
    const nextDueDateFormatted = `${day} ${month}`;

    return {
      id: d.id,
      title: d.title,
      entity: d.entity || 'Préstamo',
      amount: amountToPay,
      remainingAmount: d.remainingAmount,
      dueDay: d.dueDay,
      dueDate: d.dueDate,
      isCard: false,
      icon: d.icon || 'cash-outline',
      isMonthly,
      lastPaymentDate: d.lastPaymentDate,
      shouldAlertInDashboard: debtStatus.shouldAlertInDashboard,
      daysRemaining: debtStatus.daysRemaining,
      isUpToDateThisMonth: debtStatus.isUpToDateThisMonth,
      nextDueDateFormatted,
    };
  });

  // 2. Consolidar compromisos por cada tarjeta de crédito registrada
  const consolidatedCardItems: UpcomingCommitmentItem[] = cards
    .map((card): UpcomingCommitmentItem => {
      const cardClosingDay = card.closingDay ?? card.cutOffDay ?? 20;

      // Cuotas del mes de compras propias en tarjeta
      const linkedPersonalDebts = personalDebts.filter(
        (d) =>
          (d.cardId === card.id ||
            (d.category === 'credit_card' &&
              d.entity &&
              card.name &&
              d.entity.toLowerCase().includes(card.name.toLowerCase()))) &&
          !d.settled &&
          d.remainingAmount > 0
      );

      const personalMonthDue = linkedPersonalDebts.reduce((acc, d) => {
        const rem = d.remainingAmount ?? 0;
        if (d.cardPaymentType === 'full_statement') {
          return acc + rem;
        }
        if (d.monthlyPayment && d.monthlyPayment > 0) {
          return acc + Math.min(rem, d.monthlyPayment);
        }
        return acc + rem;
      }, 0);

      // Cuotas del mes de compras de terceros vinculadas a la tarjeta
      const isDateInCurrentBillingCycle = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        const dt = new Date(dateStr);
        if (isNaN(dt.getTime())) return false;
        const d = dt.getDate();
        const m = dt.getMonth();
        const y = dt.getFullYear();
        let billMonth = m;
        let billYear = y;
        if (d >= cardClosingDay) {
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

      const linkedThirdPartyCharges = thirdPartyCharges.filter((c) => {
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

      const thirdPartyMonthDue = linkedThirdPartyCharges.reduce((acc, c) => {
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

      // Compras corrientes del mes en ciclo
      const currentCycleTransactions = transactions
        .filter((t) => {
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
          if (d >= cardClosingDay) {
            billMonth = m + 1;
            if (billMonth > 11) {
              billMonth = 0;
              billYear = y + 1;
            }
          }

          return billMonth === currentMonth && billYear === currentYear;
        })
        .reduce((acc, t) => acc + (t.amount ?? 0), 0);

      // Pagos de tarjeta registrados en el ciclo
      const cardPayments = transactions
        .filter(
          (t) =>
            t.type === 'card_payment' &&
            (t.cardId === card.id ||
              (t.cardName && card.name && t.cardName.toLowerCase() === card.name.toLowerCase()))
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const rawMonthDue = personalMonthDue + thirdPartyMonthDue + currentCycleTransactions;
      const cardCurrentMonthDebt = Math.max(0, rawMonthDue - cardPayments);

      const rawTotalDebt =
        linkedPersonalDebts.reduce((sum, d) => sum + (d.remainingAmount ?? 0), 0) +
        linkedThirdPartyCharges.reduce((sum, c) => sum + (c.remainingAmount ?? 0), 0) +
        currentCycleTransactions;
      const cardTotalDebt = Math.max(0, rawTotalDebt - cardPayments);

      const paymentDay = card.paymentDay ?? 5;
      const recurring = calculateRecurringDueDate(paymentDay, `Día ${paymentDay} de cada mes`, referenceDate);
      const shouldAlertInDashboard = recurring.daysRemaining <= 7;

      return {
        id: `card-${card.id}`,
        title: card.name,
        entity: card.bankName || 'Tarjeta de Crédito',
        amount: cardCurrentMonthDebt,
        remainingAmount: cardTotalDebt,
        dueDay: paymentDay,
        dueDate: `Día ${paymentDay} de cada mes`,
        isCard: true,
        icon: 'card-outline' as const,
        isMonthly: false,
        shouldAlertInDashboard,
        daysRemaining: recurring.daysRemaining,
        nextDueDateFormatted: recurring.nextDueDateFormatted,
      };
    })
    .filter((item) => item.amount > 0);

  // Unificar y ordenar por días restantes (los más urgentes/vencidos primero)
  const allItems = [...mappedPersonalDebts, ...consolidatedCardItems];

  return allItems.sort((a, b) => {
    const remA =
      a.daysRemaining !== undefined
        ? a.daysRemaining
        : calculateRecurringDueDate(a.dueDay, a.dueDate, referenceDate).daysRemaining;
    const remB =
      b.daysRemaining !== undefined
        ? b.daysRemaining
        : calculateRecurringDueDate(b.dueDay, b.dueDate, referenceDate).daysRemaining;
    return remA - remB;
  });
};

const UpcomingDebtsCard = ({ onViewAll }: UpcomingDebtsCardProps = {}): JSX.Element => {
  const router = useRouter();

  const personalDebts = useDebtsStore((state) => state.personalDebts);
  const thirdPartyCharges = useDebtsStore((state) => state.thirdPartyCharges);
  const transactions = useTransactionsStore((state) => state.transactions);
  const cards = useCardsStore((state) => state.cards);
  const currencyCode = useSettingsStore((state) => state.currency);

  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  const sortedDebts = getConsolidatedUpcomingDebts(
    personalDebts,
    thirdPartyCharges,
    transactions,
    cards
  );

  const handleViewAll = (): void => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/(app)/(tabs)/debts');
    }
  };

  if (sortedDebts.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleBadge}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.titleText}>PRÓXIMOS VENCIMIENTOS</Text>
          </View>
          <View style={styles.cleanStatusChip}>
            <View style={styles.cleanStatusDot} />
            <Text style={styles.cleanStatusText}>AL DÍA</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
          <Text style={styles.emptyTitle}>Sin compromisos pendientes</Text>
          <Text style={styles.emptySubtitle}>
            No tienes deudas registradas ni cuotas pendientes por vencer.
          </Text>
        </View>
      </View>
    );
  }

  // Filtrar compromisos que requieren atención inmediata en el Dashboard
  const alertingDebts = sortedDebts.filter((item) => item.shouldAlertInDashboard);

  // Si hay compromisos con saldo pendiente pero todos están al día o faltan más de 7 días
  if (alertingDebts.length === 0) {
    const nextCommitment = sortedDebts[0];
    const nextCommitmentDate =
      nextCommitment.nextDueDateFormatted ||
      (nextCommitment.dueDay ? `Día ${nextCommitment.dueDay}` : nextCommitment.dueDate);
    const nextDays = nextCommitment.daysRemaining ?? 0;

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleBadge}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.titleText}>PRÓXIMOS VENCIMIENTOS</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Ver todas las deudas"
          >
            <Text style={styles.viewAllText}>Ver todas</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.upToDateCardContainer}
          onPress={handleViewAll}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ver detalle de compromisos al día"
        >
          <View style={styles.upToDateHeader}>
            <View style={styles.upToDateBadge}>
              <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
              <Text style={styles.upToDateBadgeText}>✓ Al día este mes</Text>
            </View>
          </View>
          <Text style={styles.upToDateMessage}>
            Tus compromisos están al día. Próximo cobro:{' '}
            <Text style={styles.upToDateHighlight}>
              {nextCommitment.title} · {nextCommitmentDate} (en {nextDays} días)
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayedDebts = alertingDebts.slice(0, 3);

  return (
    <View style={styles.card}>
      {/* Cabecera del Card */}
      <View style={styles.headerRow}>
        <View style={styles.titleBadge}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.titleText}>PRÓXIMOS VENCIMIENTOS</Text>
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={handleViewAll}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Ver todas las deudas"
        >
          <Text style={styles.viewAllText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Lista de Compromisos Activos */}
      <View style={styles.debtsList}>
        {displayedDebts.map((item, index) => {
          const recurring = calculateRecurringDueDate(item.dueDay, item.dueDate);
          const daysRemaining =
            item.daysRemaining !== undefined ? item.daysRemaining : recurring.daysRemaining;
          const urgency = getUrgencyStatus(daysRemaining);

          const handleItemPress = (): void => {
            if (item.isCard) {
              router.push('/(app)/(modal)/cards-overview');
            } else {
              router.push('/(app)/(tabs)/debts');
            }
          };

          return (
            <View key={item.id} style={styles.itemWrapper}>
              {index > 0 && <View style={styles.divider} />}

              <TouchableOpacity
                style={styles.debtItem}
                onPress={handleItemPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  item.isCard
                    ? `Ver resumen de tarjeta ${item.title}`
                    : `Ver detalle de préstamo ${item.title}`
                }
              >
                {/* Fila 1: Concepto + Banco/Entidad Badge */}
                <View style={styles.rowTop}>
                  <View style={styles.titleContainer}>
                    <View
                      style={[
                        styles.itemIconBox,
                        item.isCard ? styles.cardIconBox : styles.loanIconBox,
                      ]}
                    >
                      <Ionicons
                        name={item.isCard ? 'card-outline' : (item.icon || 'cash-outline')}
                        size={14}
                        color={item.isCard ? '#0A84FF' : colors.primary}
                      />
                    </View>
                    <Text style={styles.debtTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>

                  {item.isCard ? (
                    <View style={styles.cardBadge}>
                      <Ionicons name="card-outline" size={11} color="#0A84FF" />
                      <Text style={styles.cardBadgeText} numberOfLines={1}>
                        Resumen Tarjeta
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.entityBadge}>
                      <Ionicons
                        name={item.icon || 'cash-outline'}
                        size={11}
                        color={colors.primary}
                      />
                      <Text style={styles.entityBadgeText} numberOfLines={1}>
                        Préstamo
                      </Text>
                    </View>
                  )}
                </View>

                {/* Fila 2: Modalidad y Fecha de vencimiento proyectada */}
                <View style={styles.rowMiddle}>
                  <View style={styles.creditorInfo}>
                    <Ionicons
                      name={item.isCard ? 'business-outline' : 'wallet-outline'}
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.creditorText} numberOfLines={1}>
                      {item.isCard
                        ? item.entity
                        : item.entity
                        ? `${item.entity} · ${item.isMonthly ? 'Cuota mensual' : 'Saldo total'}`
                        : item.isMonthly
                        ? 'Cuota mensual'
                        : 'Saldo total'}
                    </Text>
                  </View>
                  <View style={styles.dueDateInfo}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.dueDateText}>
                      {item.isCard && item.dueDay
                        ? `Vence día ${item.dueDay}`
                        : item.nextDueDateFormatted
                        ? `Próximo corte: ${item.nextDueDateFormatted}`
                        : recurring.fullFormatted}
                    </Text>
                  </View>
                </View>

                {/* Fila 3: Monto a pagar + Saldo total si difiere + Badge de urgencia */}
                <View style={styles.rowBottom}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountValue}>
                      {currencySymbol} {formatAmount(item.amount)}
                    </Text>
                    {item.remainingAmount && item.remainingAmount > item.amount ? (
                      <Text style={styles.totalBalanceText}>
                        Total pendiente: {currencySymbol} {formatAmount(item.remainingAmount)}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.urgencyBadge,
                      {
                        backgroundColor: urgency.badgeBg,
                        borderColor: urgency.badgeBorder,
                      },
                    ]}
                  >
                    <View
                      style={[styles.urgencyDot, { backgroundColor: urgency.color }]}
                    />
                    <Text style={[styles.urgencyText, { color: urgency.color }]}>
                      {urgency.text}
                    </Text>
                    <Text style={[styles.urgencyDaysText, { color: urgency.color }]}>
                      {daysRemaining > 0 ? `(${daysRemaining}d)` : daysRemaining === 0 ? '(Hoy)' : '(!)'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  titleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cleanStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cleanStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  cleanStatusText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  debtsList: {
    gap: 0,
  },
  itemWrapper: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  debtItem: {
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  itemIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBox: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  loanIconBox: {
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
  },
  debtTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(10, 132, 255, 0.3)',
    borderWidth: 1,
    maxWidth: 140,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.3,
  },
  entityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    maxWidth: 140,
  },
  entityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  rowMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  creditorText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  dueDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  amountContainer: {
    gap: 2,
  },
  amountValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  totalBalanceText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
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
    letterSpacing: 0.2,
  },
  urgencyDaysText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
  },
  upToDateCardContainer: {
    backgroundColor: 'rgba(0, 255, 163, 0.05)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  upToDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  upToDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  upToDateBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  upToDateMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  upToDateHighlight: {
    color: colors.text,
    fontWeight: '700',
  },
});

export default UpcomingDebtsCard;

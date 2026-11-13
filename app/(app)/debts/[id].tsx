import React, { useState, useMemo } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { useDebtsStore, type PersonalDebt, type FriendLoan } from '../../../src/store/debts-store';
import { useTransactionsStore, type Transaction } from '../../../src/store/transactions-store';
import { useCardsStore, type Bank } from '../../../src/store/cards-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { formatCurrency } from '../../../src/utils/currency';
import { getDebtDueStatus } from '../../../src/utils/date-helpers';
import PersonalDebtPaymentModal, {
  type PersonalDebtPaymentData,
} from '../../../src/components/debts/personal-debt-payment-modal';
import FriendLoanCollectionModal from '../../../src/components/debts/friend-loan-collection-modal';

const MONTH_NAMES_ES: readonly string[] = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const formatDate = (isoOrDateStr?: string): string => {
  if (!isoOrDateStr) return '-';
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

type DueStatusBadgeInfo = {
  label: 'Liquidada' | 'Al día' | 'Próximo' | 'Por vencer' | 'Vencido';
  color: string;
  bg: string;
};

const resolveDebtStatusInfo = (
  isSettled: boolean,
  dueDay?: number,
  lastPaymentDate?: string
): DueStatusBadgeInfo => {
  if (isSettled) {
    return {
      label: 'Liquidada',
      color: '#00FFA3',
      bg: 'rgba(0, 255, 163, 0.12)',
    };
  }

  const status = getDebtDueStatus(dueDay ?? 1, lastPaymentDate);
  if (status.isUpToDateThisMonth) {
    return {
      label: 'Al día',
      color: '#00FFA3',
      bg: 'rgba(0, 255, 163, 0.12)',
    };
  }

  if (status.urgency === 'overdue') {
    return {
      label: 'Vencido',
      color: '#FF453A',
      bg: 'rgba(255, 69, 58, 0.12)',
    };
  }

  if (status.urgency === 'urgent' || status.urgency === 'today') {
    return {
      label: 'Próximo',
      color: '#FFD60A',
      bg: 'rgba(255, 214, 10, 0.12)',
    };
  }

  if (status.urgency === 'warning') {
    return {
      label: 'Por vencer',
      color: '#FF9F0A',
      bg: 'rgba(255, 159, 10, 0.12)',
    };
  }

  return {
    label: 'Al día',
    color: '#00FFA3',
    bg: 'rgba(0, 255, 163, 0.12)',
  };
};

const resolveLoanStatusInfo = (isSettled: boolean, dueDateStr?: string): DueStatusBadgeInfo => {
  if (isSettled) {
    return {
      label: 'Liquidada',
      color: '#00FFA3',
      bg: 'rgba(0, 255, 163, 0.12)',
    };
  }

  if (!dueDateStr || dueDateStr === 'Por definir') {
    return {
      label: 'Al día',
      color: '#00FFA3',
      bg: 'rgba(0, 255, 163, 0.12)',
    };
  }

  let targetDate: Date | null = null;
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
      label: 'Al día',
      color: '#00FFA3',
      bg: 'rgba(0, 255, 163, 0.12)',
    };
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const daysRemaining = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      label: 'Vencido',
      color: '#FF453A',
      bg: 'rgba(255, 69, 58, 0.12)',
    };
  }
  if (daysRemaining <= 3) {
    return {
      label: 'Próximo',
      color: '#FFD60A',
      bg: 'rgba(255, 214, 10, 0.12)',
    };
  }
  if (daysRemaining <= 7) {
    return {
      label: 'Por vencer',
      color: '#FF9F0A',
      bg: 'rgba(255, 159, 10, 0.12)',
    };
  }

  return {
    label: 'Al día',
    color: '#00FFA3',
    bg: 'rgba(0, 255, 163, 0.12)',
  };
};

const DebtDetailScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Stores
  const personalDebts = useDebtsStore((state) => state.personalDebts);
  const friendLoans = useDebtsStore((state) => state.friendLoans);
  const payPersonalDebt = useDebtsStore((state) => state.payPersonalDebt);
  const collectFriendLoan = useDebtsStore((state) => state.collectFriendLoan);
  const transactions = useTransactionsStore((state) => state.transactions);
  const addTransaction = useTransactionsStore((state) => state.addTransaction);
  const banks = useCardsStore((state) => state.banks);
  const currencyCode = useSettingsStore((state) => state.currency);

  // Modal interactivo de acción
  const [isActionModalVisible, setIsActionModalVisible] = useState<boolean>(false);

  // Buscar si corresponde a PersonalDebt o FriendLoan
  const personalDebt = useMemo<PersonalDebt | undefined>(
    () => personalDebts.find((d) => d.id === id),
    [personalDebts, id]
  );
  const friendLoan = useMemo<FriendLoan | undefined>(
    () => friendLoans.find((l) => l.id === id),
    [friendLoans, id]
  );

  // Transacciones vinculadas en orden cronológico descendente
  const relatedTransactions = useMemo<Transaction[]>(() => {
    if (!id) return [];
    return transactions
      .filter((t) => t.relatedDebtId === id || t.relatedLoanId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, id]);

  // Si no se encuentra la deuda/préstamo
  if (!personalDebt && !friendLoan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle de Deuda</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#8E8E93" />
          <Text style={styles.notFoundTitle}>Deuda no encontrada</Text>
          <Text style={styles.notFoundSubtitle}>
            El registro solicitado no existe o fue eliminado previamente.
          </Text>
          <TouchableOpacity
            style={styles.notFoundButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-outline" size={18} color="#121212" />
            <Text style={styles.notFoundButtonText}>VOLVER ATRÁS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLoan = Boolean(friendLoan);
  const title = isLoan ? (friendLoan?.friendName ?? '') : (personalDebt?.title ?? '');
  const subtitle = isLoan ? 'Préstamo a Amigo' : (personalDebt?.entity ?? '');
  const categoryLabel = isLoan
    ? 'Préstamo a Amigo'
    : personalDebt?.category === 'credit_card' || personalDebt?.cardId
    ? 'Tarjeta de Crédito'
    : 'Préstamo Bancario';

  const isSettled = isLoan
    ? Boolean(friendLoan?.settled) || (friendLoan?.remainingAmount ?? 0) <= 0
    : Boolean(personalDebt?.settled) || (personalDebt?.remainingAmount ?? 0) <= 0;

  const remainingAmount = isLoan
    ? (friendLoan?.remainingAmount ?? 0)
    : (personalDebt?.remainingAmount ?? 0);

  const originalAmount = isLoan
    ? (friendLoan?.totalAmount ?? friendLoan?.totalToCollect ?? friendLoan?.principalAmount ?? 0)
    : (personalDebt?.totalAmount ?? 0);

  const totalInstallments = personalDebt?.totalInstallments ?? 0;
  const paidInstallments = personalDebt?.paidInstallments ?? 0;
  const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);
  const monthlyPayment = personalDebt?.monthlyPayment ?? 0;
  const totalDiscountSaved = personalDebt?.totalDiscountSaved ?? 0;
  const createdAt = isLoan ? friendLoan?.createdAt : personalDebt?.createdAt;
  const settledAt = isLoan ? friendLoan?.settledAt : personalDebt?.settledAt;

  const statusInfo = isLoan
    ? resolveLoanStatusInfo(isSettled, friendLoan?.dueDate)
    : resolveDebtStatusInfo(isSettled, personalDebt?.dueDay, personalDebt?.lastPaymentDate);

  const debtStatus = useMemo(() => {
    if (!personalDebt) return null;
    return getDebtDueStatus(personalDebt.dueDay ?? 1, personalDebt.lastPaymentDate);
  }, [personalDebt?.dueDay, personalDebt?.lastPaymentDate]);

  const handleConfirmDebtPayment = (paymentData: PersonalDebtPaymentData): void => {
    if (!personalDebt) return;
    const { amount, mode, installmentsCount, nominalAmountExtinguished, discountSaved, bankId } = paymentData;

    payPersonalDebt(personalDebt.id, amount, {
      mode,
      installmentsCount,
      nominalAmountExtinguished,
      discountSaved,
    });

    const quotaLabel = installmentsCount === 1 ? 'última cuota' : 'últimas cuotas';
    const titleSuffix = mode === 'last' ? ` (${installmentsCount} ${quotaLabel})` : '';

    addTransaction({
      title: `Pago de ${personalDebt.title}${titleSuffix}`,
      amount,
      type: 'expense',
      category: 'Pago Deudas',
      relatedDebtId: personalDebt.id,
      debtPaymentMode: mode,
      nominalDebtAmount: nominalAmountExtinguished,
      debtInstallmentsPaid: installmentsCount,
      debtDiscountSaved: discountSaved,
      bankId,
    });

    setIsActionModalVisible(false);
  };

  const handleConfirmFriendLoanCollection = (amount: number, bankId?: string): void => {
    if (!friendLoan) return;

    collectFriendLoan(friendLoan.id, amount);

    addTransaction({
      title: `Abono de ${friendLoan.friendName}`,
      amount,
      type: 'income',
      category: 'Cobro Préstamo',
      relatedLoanId: friendLoan.id,
      personName: friendLoan.friendName,
      bankId: bankId || undefined,
    });

    setIsActionModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerCategoryText}>{categoryLabel}</Text>
            {Boolean(subtitle) && (
              <Text style={styles.headerEntityText} numberOfLines={1}>
                {' '}• {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.bg, borderColor: statusInfo.color },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: !isSettled && remainingAmount > 0 ? insets.bottom + 100 : insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD FINANCIERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroIconBadge}>
              <Ionicons
                name={isLoan ? 'wallet-outline' : 'cash-outline'}
                size={20}
                color="#00FFA3"
              />
            </View>
            <View style={styles.heroBadgeRight}>
              <Text style={styles.heroBadgeRightText}>
                {isSettled ? 'LIQUIDACIÓN 100%' : 'EN SEGUIMIENTO'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroLabel}>
            {isLoan ? 'SALDO POR COBRAR' : 'SALDO PENDIENTE'}
          </Text>
          <Text style={styles.heroAmount}>
            {formatCurrency(remainingAmount, currencyCode)}
          </Text>

          <View style={styles.heroDivider} />

          {/* Desglose de importes */}
          <View style={styles.heroMetricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Monto original</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(originalAmount, currencyCode)}
              </Text>
            </View>

            {isLoan && friendLoan?.interestRate !== undefined && friendLoan.interestRate > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Tasa pactada</Text>
                <Text style={[styles.metricValue, { color: '#0A84FF' }]}>
                  +{friendLoan.interestRate.toFixed(2)}%
                </Text>
              </View>
            )}

            {!isLoan && monthlyPayment > 0 && (
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Cuota nominal mensual</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(monthlyPayment, currencyCode)}
                </Text>
              </View>
            )}
          </View>

          {/* Barra de progreso de cuotas */}
          {!isLoan && totalInstallments > 0 && (
            <View style={styles.installmentsContainer}>
              <View style={styles.installmentsHeaderRow}>
                <Text style={styles.installmentsLabel}>Progreso de cuotas</Text>
                <Text style={styles.installmentsCountText}>
                  {paidInstallments} de {totalInstallments} cuotas ({remainingInstallments} restantes)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(0, (paidInstallments / totalInstallments) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Badge de ahorro por liquidación anticipada */}
          {!isLoan && totalDiscountSaved > 0 && (
            <View style={styles.savingsBadge}>
              <Ionicons name="sparkles" size={14} color="#FFD60A" />
              <Text style={styles.savingsBadgeText}>
                Ahorro total por liquidación anticipada: {formatCurrency(totalDiscountSaved, currencyCode)}
              </Text>
            </View>
          )}

          {/* Fechas de registro y liquidación */}
          <View style={styles.heroDatesRow}>
            {Boolean(createdAt) && (
              <View style={styles.heroDateItem}>
                <Ionicons name="calendar-outline" size={13} color="#8E8E93" />
                <Text style={styles.heroDateText}>
                  Inicio: {formatDate(createdAt)}
                </Text>
              </View>
            )}

            {!isSettled && debtStatus && (
              <View style={styles.heroDateItem}>
                <Ionicons name="repeat-outline" size={13} color="#00FFA3" />
                <Text style={[styles.heroDateText, { color: '#00FFA3' }]}>
                  Próximo débito: {debtStatus.nextDueDateFormatted} ({debtStatus.daysRemainingFormatted})
                </Text>
              </View>
            )}

            {Boolean(settledAt) && (
              <View style={styles.heroDateItem}>
                <Ionicons name="checkmark-done-circle-outline" size={13} color="#00FFA3" />
                <Text style={[styles.heroDateText, { color: '#00FFA3' }]}>
                  Liquidada el: {formatDate(settledAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* BITÁCORA HISTÓRICA DE PAGOS / ABONOS */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="time-outline" size={18} color="#00FFA3" />
              <Text style={styles.sectionTitle}>
                {isLoan ? 'BITÁCORA DE ABONOS RECIBIDOS' : 'BITÁCORA HISTÓRICA DE PAGOS'}
              </Text>
            </View>
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>
                {relatedTransactions.length} {relatedTransactions.length === 1 ? 'registro' : 'registros'}
              </Text>
            </View>
          </View>

          {relatedTransactions.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Ionicons name="receipt-outline" size={36} color="#8E8E93" />
              <Text style={styles.emptyHistoryTitle}>Sin registros de pago todavía</Text>
              <Text style={styles.emptyHistorySubtitle}>
                {isLoan
                  ? 'Cada abono recibido de este préstamo se registrará automáticamente en esta bitácora.'
                  : 'Cada cuota o amortización registrada para esta deuda se reflejará aquí con su fecha y cuenta bancaria de origen.'}
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {relatedTransactions.map((tx) => {
                const bankName =
                  banks.find((b) => b.id === tx.bankId)?.name ||
                  (tx.bankId ? 'Cuenta Bancaria' : 'Cuenta Principal');

                const isAnticipated = tx.debtPaymentMode === 'last';
                const hasDiscount = (tx.debtDiscountSaved ?? 0) > 0;

                return (
                  <View key={tx.id} style={styles.transactionCard}>
                    <View style={styles.txHeaderRow}>
                      <View style={styles.txDateWrapper}>
                        <Ionicons name="calendar-outline" size={12} color="#8E8E93" />
                        <Text style={styles.txDateText}>{formatDate(tx.date)}</Text>
                      </View>
                      <Text style={styles.txAmountText}>
                        {formatCurrency(tx.amount, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.txDetailRow}>
                      <View style={styles.txBankBadge}>
                        <Ionicons name="business-outline" size={11} color="#0A84FF" />
                        <Text style={styles.txBankText} numberOfLines={1}>
                          {bankName}
                        </Text>
                      </View>

                      {isAnticipated ? (
                        <View style={styles.txAnticipatedBadge}>
                          <Ionicons name="flash-outline" size={11} color="#FFD60A" />
                          <Text style={styles.txAnticipatedText}>
                            Cuota anticipada con descuento
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.txModeBadge}>
                          <Ionicons name="checkmark-circle-outline" size={11} color="#00FFA3" />
                          <Text style={styles.txModeText}>
                            {isLoan ? 'Abono recibido' : 'Cuota siguiente'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {hasDiscount && (
                      <View style={styles.txSavingsRow}>
                        <Ionicons name="sparkles-outline" size={12} color="#FFD60A" />
                        <Text style={styles.txSavingsText}>
                          Descuento ahorrado: {formatCurrency(tx.debtDiscountSaved ?? 0, currencyCode)}
                        </Text>
                      </View>
                    )}

                    {Boolean(tx.notes) && (
                      <Text style={styles.txNotesText}>
                        Nota: {tx.notes}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTÓN DE ACCIÓN INFERIOR */}
      {!isSettled && remainingAmount > 0 && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(16, insets.bottom + 12) },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => setIsActionModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={isLoan ? 'Registrar abono de préstamo' : 'Registrar pago de cuota'}
          >
            <Ionicons
              name={isLoan ? 'cash-outline' : 'checkmark-circle-outline'}
              size={18}
              color="#121212"
            />
            <Text style={styles.actionButtonText}>
              {isLoan ? 'REGISTRAR ABONO' : 'REGISTRAR PAGO DE CUOTA'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODALES INTERACTIVOS */}
      {personalDebt && (
        <PersonalDebtPaymentModal
          visible={isActionModalVisible}
          debt={personalDebt}
          onClose={() => setIsActionModalVisible(false)}
          onConfirmPayment={handleConfirmDebtPayment}
          banks={banks}
          currencySymbol={formatCurrency(0, currencyCode).slice(0, 2).trim()}
          currency={currencyCode}
        />
      )}

      {friendLoan && (
        <FriendLoanCollectionModal
          visible={isActionModalVisible}
          debt={friendLoan}
          loan={friendLoan}
          onClose={() => setIsActionModalVisible(false)}
          onConfirmCollection={handleConfirmFriendLoanCollection}
          banks={banks}
          currencySymbol={formatCurrency(0, currencyCode).slice(0, 2).trim()}
          currency={currencyCode}
        />
      )}
    </SafeAreaView>
  );
};

export default DebtDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerCategoryText: {
    fontSize: 12,
    color: '#00FFA3',
    fontWeight: '600',
  },
  headerEntityText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  headerRightPlaceholder: {
    width: 38,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Hero Card
  heroCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
  },
  heroBadgeRight: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBadgeRightText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00FFA3',
    letterSpacing: -0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 14,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    minWidth: '45%',
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  installmentsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  installmentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  installmentsLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  installmentsCountText: {
    fontSize: 12,
    color: '#00FFA3',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00FFA3',
    borderRadius: 3,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 14,
    gap: 6,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD60A',
    flex: 1,
  },
  heroDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#262626',
    gap: 8,
  },
  heroDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroDateText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  // History Section
  historySection: {
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  historyBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyHistoryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyHistorySubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  transactionsList: {
    gap: 10,
  },
  transactionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txDateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  txDateText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  txAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00FFA3',
  },
  txDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  txBankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  txBankText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  txModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  txModeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00FFA3',
  },
  txAnticipatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  txAnticipatedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD60A',
  },
  txSavingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  txSavingsText: {
    fontSize: 11,
    color: '#FFD60A',
    fontWeight: '600',
  },
  txNotesText: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 6,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FFA3',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121212',
    letterSpacing: 0.5,
  },
  // Not found state
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 6,
  },
  notFoundSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  notFoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FFA3',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  notFoundButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#121212',
  },
});

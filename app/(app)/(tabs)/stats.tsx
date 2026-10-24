import React, { useState, useMemo, useCallback } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { useIsWide } from '../../../src/hooks/use-responsive';
import FinancialHealthCard from '../../../src/components/stats/financial-health-card';
import CategoryBreakdownCard, {
  type CategoryExpenseItem,
} from '../../../src/components/stats/category-breakdown-card';
import { useTransactionsStore } from '../../../src/store/transactions-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useDebtsStore } from '../../../src/store/debts-store';
import { EXPENSE_CATEGORIES } from '../../../src/constants/categories';

type PeriodFilter = 'current_month' | 'quarter' | 'year';

type ChangeInfo = {
  text: string;
  diff: number | null;
};

const parseTxDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const computeDiffText = (current: number, prev: number): ChangeInfo => {
  if (prev <= 0) {
    if (current > 0) {
      return { text: 'Base', diff: null };
    }
    return { text: '0.0%', diff: 0 };
  }
  const diff = ((current - prev) / prev) * 100;
  if (diff === 0) {
    return { text: '0.0%', diff: 0 };
  }
  const formatted = Math.abs(diff).toFixed(1);
  return {
    text: diff > 0 ? `+${formatted}%` : `-${formatted}%`,
    diff,
  };
};

const StatsScreen = (): JSX.Element => {
  const isWide = useIsWide(768);
  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [focusRefreshKey, setFocusRefreshKey] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      setFocusRefreshKey((prev) => prev + 1);
    }, [])
  );

  const transactions = useTransactionsStore((state) => state.transactions);
  const currencyCode = useSettingsStore((state) => state.currency);
  const currencySymbol = currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  const personalDebts = useDebtsStore((state) => state.personalDebts);
  const thirdPartyCharges = useDebtsStore((state) => state.thirdPartyCharges);
  const friendLoans = useDebtsStore((state) => state.friendLoans);

  const periodTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return transactions.filter((t) => {
      const txDate = parseTxDate(t.date);
      if (!txDate) return false;

      const y = txDate.getFullYear();
      const m = txDate.getMonth();

      if (period === 'current_month') {
        return y === currentYear && m === currentMonth;
      }

      if (period === 'quarter') {
        return y === currentYear && Math.floor(m / 3) === currentQuarter;
      }

      if (period === 'year') {
        return y === currentYear;
      }

      return false;
    });
  }, [transactions, period, focusRefreshKey]);

  const prevPeriodTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return transactions.filter((t) => {
      const txDate = parseTxDate(t.date);
      if (!txDate) return false;

      const y = txDate.getFullYear();
      const m = txDate.getMonth();

      if (period === 'current_month') {
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return y === prevMonthYear && m === prevMonth;
      }

      if (period === 'quarter') {
        const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const prevQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
        return y === prevQuarterYear && Math.floor(m / 3) === prevQuarter;
      }

      if (period === 'year') {
        return y === currentYear - 1;
      }

      return false;
    });
  }, [transactions, period, focusRefreshKey]);

  const periodIncome = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income' || t.type === 'reimbursement')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const periodExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense' || t.type === 'card_payment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const periodNet = periodIncome - periodExpense;

  const prevIncome = useMemo(() => {
    return prevPeriodTransactions
      .filter((t) => t.type === 'income' || t.type === 'reimbursement')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [prevPeriodTransactions]);

  const prevExpense = useMemo(() => {
    return prevPeriodTransactions
      .filter((t) => t.type === 'expense' || t.type === 'card_payment')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [prevPeriodTransactions]);

  const savingsRate =
    periodIncome > 0
      ? Math.max(0, Math.min(100, Math.round(((periodIncome - periodExpense) / periodIncome) * 100)))
      : 0;

  const monthlyDebtCommitment = useMemo(() => {
    const personalDebtsMonthly = personalDebts
      .filter((d) => (d.remainingAmount ?? 0) > 0 && !d.settled)
      .reduce((sum, d) => sum + (d.monthlyPayment ?? 0), 0);

    const thirdPartyMonthly = thirdPartyCharges
      .filter((c) => {
        const remainingInstallments = c.installmentsCount - (c.paidInstallmentsCount || 0);
        return !c.settled && ((c.remainingAmount ?? 0) > 0 || remainingInstallments > 0);
      })
      .reduce((sum, c) => {
        const monthlyQuota =
          c.monthlyInstallmentAmount > 0
            ? c.monthlyInstallmentAmount
            : c.installmentsCount > 0
            ? c.totalAmount / c.installmentsCount
            : c.remainingAmount;
        return sum + (monthlyQuota || 0);
      }, 0);

    return personalDebtsMonthly + thirdPartyMonthly;
  }, [personalDebts, thirdPartyCharges]);

  const periodDebtCommitment = useMemo(() => {
    if (period === 'quarter') {
      return monthlyDebtCommitment * 3;
    }
    if (period === 'year') {
      return monthlyDebtCommitment * 12;
    }
    return monthlyDebtCommitment;
  }, [monthlyDebtCommitment, period]);

  const debtToIncomeRatio = useMemo(() => {
    if (periodIncome > 0) {
      return Math.min(100, Math.round((periodDebtCommitment / periodIncome) * 100));
    }
    return periodDebtCommitment > 0 ? 100 : 0;
  }, [periodIncome, periodDebtCommitment]);

  const healthStatus: 'optimal' | 'moderate' | 'critical' = useMemo(() => {
    if (periodNet < 0 || debtToIncomeRatio > 40) {
      return 'critical';
    }
    if (savingsRate < 10 || debtToIncomeRatio > 30) {
      return 'moderate';
    }
    return 'optimal';
  }, [periodNet, debtToIncomeRatio, savingsRate]);

  const dynamicCategoryExpenses = useMemo<CategoryExpenseItem[]>(() => {
    const expenseTxs = periodTransactions.filter(
      (t) => t.type === 'expense' || t.type === 'card_payment'
    );
    const categoryMap = new Map<
      string,
      { categoryName: string; amount: number; color: string; icon: keyof typeof Ionicons.glyphMap }
    >();

    for (const tx of expenseTxs) {
      const rawCategory = tx.category || (tx.type === 'card_payment' ? 'Pago Deudas' : 'Otros Gastos');
      const matched = EXPENSE_CATEGORIES.find(
        (c) =>
          c.id.toLowerCase() === rawCategory.toLowerCase() ||
          c.name.toLowerCase() === rawCategory.toLowerCase()
      );

      const categoryId = matched ? matched.id : rawCategory.toLowerCase().replace(/\s+/g, '-');
      const categoryName = matched ? matched.name : rawCategory;
      const color = matched ? matched.color : (tx.type === 'card_payment' ? '#FF453A' : '#8E8E93');
      const icon = matched ? matched.icon : (tx.icon ?? (tx.type === 'card_payment' ? 'card-outline' : 'ellipsis-horizontal-circle-outline'));

      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.amount += tx.amount;
      } else {
        categoryMap.set(categoryId, {
          categoryName,
          amount: tx.amount,
          color,
          icon,
        });
      }
    }

    const items: CategoryExpenseItem[] = [];
    categoryMap.forEach((val, catId) => {
      const percentage =
        periodExpense > 0 ? Math.round((val.amount / periodExpense) * 100) : 0;
      items.push({
        categoryId: catId,
        categoryName: val.categoryName,
        amount: val.amount,
        percentage,
        color: val.color,
        icon: val.icon,
      });
    });

    items.sort((a, b) => b.amount - a.amount);
    return items;
  }, [periodTransactions, periodExpense]);

  const incomeChangeInfo = useMemo(() => {
    return computeDiffText(periodIncome, prevIncome);
  }, [periodIncome, prevIncome]);

  const expenseChangeInfo = useMemo(() => {
    return computeDiffText(periodExpense, prevExpense);
  }, [periodExpense, prevExpense]);

  const formatAmount = (val: number): string => {
    return val.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const currentYearNumber = new Date().getFullYear();
  const periodOptions: Array<{ id: PeriodFilter; label: string }> = [
    { id: 'current_month', label: 'Mes Actual' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: `Año ${currentYearNumber}` },
  ];

  const isIncomeDown = incomeChangeInfo.diff !== null && incomeChangeInfo.diff < 0;
  const isExpenseUp = expenseChangeInfo.diff !== null && expenseChangeInfo.diff > 0;

  const renderSegmentedControl = (): JSX.Element => (
    <View style={[styles.segmentedControl, isWide && styles.segmentedControlWide]}>
      {periodOptions.map((opt) => {
        const isActive = period === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => setPeriod(opt.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSummaryCard = (): JSX.Element => (
    <View style={[styles.summaryCard, isWide && styles.summaryCardWide]}>
      {/* Columna 1: Ingresos Totales */}
      <View style={styles.summaryCol}>
        <View style={styles.summaryLabelRow}>
          <Ionicons name="arrow-up-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.summaryColLabel}>Ingresos Totales</Text>
        </View>
        <Text style={[styles.summaryColAmount, styles.incomeAmount]}>
          {`${currencySymbol}${formatAmount(periodIncome)}`}
        </Text>
        <View style={styles.changeBadgePositive}>
          <Ionicons
            name={isIncomeDown ? 'trending-down-outline' : 'trending-up-outline'}
            size={12}
            color={isIncomeDown ? colors.error : colors.primary}
          />
          <Text
            style={[
              styles.changeTextPositive,
              isIncomeDown && { color: colors.error },
            ]}
          >
            {`${incomeChangeInfo.text} vs ant.`}
          </Text>
        </View>
      </View>

      <View style={styles.verticalDivider} />

      {/* Columna 2: Gastos Totales */}
      <View style={styles.summaryCol}>
        <View style={styles.summaryLabelRow}>
          <Ionicons name="arrow-down-circle-outline" size={16} color={colors.error} />
          <Text style={styles.summaryColLabel}>Gastos Totales</Text>
        </View>
        <Text style={[styles.summaryColAmount, styles.expenseAmount]}>
          {`${currencySymbol}${formatAmount(periodExpense)}`}
        </Text>
        <View style={styles.changeBadgeNegative}>
          <Ionicons
            name={isExpenseUp ? 'trending-up-outline' : 'trending-down-outline'}
            size={12}
            color={isExpenseUp ? colors.error : '#64D2FF'}
          />
          <Text
            style={[
              styles.changeTextNegative,
              isExpenseUp && { color: colors.error },
            ]}
          >
            {`${expenseChangeInfo.text} vs ant.`}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.badgePulse} />
              <Text style={styles.badgeText}>INTELIGENCIA DE GASTO</Text>
            </View>
            <Text style={styles.headerTitle}>ANÁLISIS FINANCIERO</Text>
          </View>

          {isWide ? (
            <View style={styles.wideGridContainer}>
              {/* Columna Izquierda */}
              <View style={styles.leftColumn}>
                {renderSegmentedControl()}
                {renderSummaryCard()}
                <FinancialHealthCard
                  status={healthStatus}
                  savingsRate={savingsRate}
                  debtToIncomeRatio={debtToIncomeRatio}
                  netCashflow={periodNet}
                  currency={currencySymbol}
                />
              </View>

              {/* Columna Derecha */}
              <View style={styles.rightColumn}>
                <CategoryBreakdownCard
                  items={dynamicCategoryExpenses}
                  totalExpense={periodExpense}
                  currency={currencySymbol}
                />
              </View>
            </View>
          ) : (
            <>
              {/* Selector de período por píldoras segmentadas */}
              {renderSegmentedControl()}

              {/* Tarjeta comparativa rápida (2 columnas: Ingresos vs Gastos) */}
              {renderSummaryCard()}

              {/* Diagnóstico Financiero */}
              <FinancialHealthCard
                status={healthStatus}
                savingsRate={savingsRate}
                debtToIncomeRatio={debtToIncomeRatio}
                netCashflow={periodNet}
                currency={currencySymbol}
              />

              {/* Distribución de Gastos */}
              <CategoryBreakdownCard
                items={dynamicCategoryExpenses}
                totalExpense={periodExpense}
                currency={currencySymbol}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  scrollContentWide: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  wideGridContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 0.46,
    gap: 16,
  },
  rightColumn: {
    flex: 0.54,
    gap: 16,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentedControlWide: {
    marginBottom: 0,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#0D2B22',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryCardWide: {
    marginBottom: 0,
  },
  summaryCol: {
    flex: 1,
    gap: 6,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryColLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  summaryColAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  incomeAmount: {
    color: colors.primary,
  },
  expenseAmount: {
    color: colors.error,
  },
  changeBadgePositive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeTextPositive: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  changeBadgeNegative: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeTextNegative: {
    color: '#64D2FF',
    fontSize: 11,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
});

export default StatsScreen;

import React from 'react';
import type { JSX } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useSettingsStore } from '../../store/settings-store';

type BalanceHeroCardProps = {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  currency?: string;
  isPrivate?: boolean;
  onTogglePrivacy?: () => void;
  /** @deprecated compatibilidad con llamadas anteriores */
  income?: number;
  /** @deprecated compatibilidad con llamadas anteriores */
  expenses?: number;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  BRL: 'R$',
  ARS: '$',
  COP: '$',
  MXN: '$',
};

const BalanceHeroCard = ({
  balance = 0,
  monthlyIncome: monthlyIncomeProp,
  monthlyExpense: monthlyExpenseProp,
  income,
  expenses,
  currency: currencyProp,
  isPrivate,
  onTogglePrivacy,
}: BalanceHeroCardProps): JSX.Element => {
  const {
    privacyMode: storePrivacyMode,
    togglePrivacyMode: storeTogglePrivacyMode,
    currency: storeCurrency,
  } = useSettingsStore();

  const monthlyIncome = monthlyIncomeProp ?? income ?? 0;
  const monthlyExpense = monthlyExpenseProp ?? expenses ?? 0;
  const activePrivacy = isPrivate !== undefined ? isPrivate : storePrivacyMode;
  const handleTogglePrivacy = onTogglePrivacy ?? storeTogglePrivacyMode;

  const activeCurrency =
    currencyProp ?? CURRENCY_SYMBOLS[storeCurrency] ?? storeCurrency;

  const formatAmount = (val: number): string => {
    return val.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const net = monthlyIncome - monthlyExpense;
  const savingsRate =
    monthlyIncome > 0 ? net / monthlyIncome : net >= 0 ? 0 : -1;

  let healthStatus = 'EQUILIBRADO';
  let healthColor = '#0A84FF';
  let healthBg = 'rgba(10, 132, 255, 0.15)';

  if (net < 0) {
    healthStatus = 'DÉFICIT';
    healthColor = '#FF453A';
    healthBg = 'rgba(255, 69, 58, 0.15)';
  } else if (savingsRate >= 0.2 || (monthlyIncome > 0 && monthlyExpense === 0)) {
    healthStatus = 'ÓPTIMO';
    healthColor = '#00FFA3';
    healthBg = 'rgba(0, 255, 163, 0.15)';
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>BALANCE DISPONIBLE</Text>
          <View
            style={[
              styles.healthChip,
              { backgroundColor: healthBg, borderColor: healthColor },
            ]}
          >
            <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
            <Text style={[styles.healthText, { color: healthColor }]}>
              {healthStatus}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={handleTogglePrivacy}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={activePrivacy ? 'Mostrar balance' : 'Ocultar balance'}
        >
          <Ionicons
            name={activePrivacy ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceText}>
          {activePrivacy
            ? `${activeCurrency} ••••••`
            : `${activeCurrency} ${formatAmount(balance)}`}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <View style={styles.statHeader}>
            <Ionicons
              name="arrow-up-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.statLabel}>Ingresos del mes</Text>
          </View>
          <Text style={[styles.statValue, styles.incomeValue]}>
            {activePrivacy
              ? `${activeCurrency} ••••`
              : `+${activeCurrency} ${formatAmount(monthlyIncome)}`}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <View style={styles.statHeader}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.statLabel}>Gastos del mes</Text>
          </View>
          <Text style={[styles.statValue, styles.expensesValue]}>
            {activePrivacy
              ? `${activeCurrency} ••••`
              : `-${activeCurrency} ${formatAmount(monthlyExpense)}`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopColor: colors.primary,
    borderTopWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  healthDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  healthText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  eyeButton: {
    padding: 4,
  },
  balanceContainer: {
    marginVertical: 4,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  incomeValue: {
    color: colors.primary,
  },
  expensesValue: {
    color: colors.error,
  },
});

export default BalanceHeroCard;

import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type TransactionsSummaryHeaderProps = {
  currentMonth?: string;
  incomeTotal?: number;
  expenseTotal?: number;
  netBalance?: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  currency?: string;
  isAllTime?: boolean;
  onToggleAllTime?: () => void;
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const TransactionsSummaryHeader = ({
  currentMonth = 'Octubre 2026',
  incomeTotal = 4200.0,
  expenseTotal = 1850.5,
  netBalance = 2349.5,
  onPrevMonth,
  onNextMonth,
  currency = '$',
  isAllTime = false,
  onToggleAllTime,
}: TransactionsSummaryHeaderProps): JSX.Element => {
  const isNetPositive = netBalance >= 0;

  return (
    <View style={styles.container}>
      {/* Selector de Mes */}
      <View style={styles.monthSelectorRow}>
        <TouchableOpacity
          onPress={onPrevMonth}
          style={styles.navButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthTitleContainer}
          onPress={onToggleAllTime}
          disabled={!onToggleAllTime}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} style={styles.monthCalendarIcon} />
          <Text style={styles.monthTitle}>{currentMonth}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNextMonth}
          style={styles.navButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Flujo Mensual */}
      <View style={styles.flowCard}>
        {/* Columna Ingresos */}
        <View style={styles.column}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(0, 255, 163, 0.12)' }]}>
            <Ionicons name="arrow-down-circle-outline" size={18} color="#00FFA3" />
          </View>
          <Text style={styles.columnLabel}>Ingresos</Text>
          <Text style={[styles.columnAmount, { color: '#00FFA3' }]} numberOfLines={1} adjustsFontSizeToFit>
            +{currency}{formatAmount(incomeTotal)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Columna Gastos */}
        <View style={styles.column}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 69, 58, 0.12)' }]}>
            <Ionicons name="arrow-up-circle-outline" size={18} color="#FF453A" />
          </View>
          <Text style={styles.columnLabel}>Gastos</Text>
          <Text style={[styles.columnAmount, { color: '#FF453A' }]} numberOfLines={1} adjustsFontSizeToFit>
            -{currency}{formatAmount(expenseTotal)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Columna Balance Neto */}
        <View style={styles.column}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: isNetPositive ? 'rgba(0, 255, 163, 0.12)' : 'rgba(255, 69, 58, 0.12)' },
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={18}
              color={isNetPositive ? '#00FFA3' : '#FF453A'}
            />
          </View>
          <Text style={styles.columnLabel}>Neto</Text>
          <Text
            style={[styles.columnAmount, { color: isNetPositive ? '#00FFA3' : '#FF453A' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isNetPositive ? '+' : '-'}{currency}{formatAmount(Math.abs(netBalance))}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthCalendarIcon: {
    marginRight: 2,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  columnAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: '75%',
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
});

export default TransactionsSummaryHeader;

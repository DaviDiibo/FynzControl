import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type FinancialHealthCardProps = {
  savingsRate?: number; // ej: 44 (%)
  debtToIncomeRatio?: number; // ej: 13 (%)
  netCashflow?: number; // ej: 2349.50
  currency?: string;
  status?: 'optimal' | 'moderate' | 'critical';
  debtStatusDescription?: string;
};

export type FinancialHealthProps = FinancialHealthCardProps;

const FinancialHealthCard = ({
  savingsRate = 44,
  debtToIncomeRatio = 13,
  netCashflow = 2349.50,
  currency = '$',
  status = 'optimal',
  debtStatusDescription,
}: FinancialHealthCardProps): JSX.Element => {
  const clampedSavings = Math.min(100, Math.max(0, savingsRate));
  const clampedDebt = Math.min(100, Math.max(0, debtToIncomeRatio));

  const formatAmount = (val: number): string => {
    return Math.abs(val).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const sign = netCashflow >= 0 ? '+' : '-';

  const statusConfig = {
    optimal: {
      text: 'ESTADO: ÓPTIMO',
      color: '#00FFA3',
      bg: 'rgba(0, 255, 163, 0.15)',
      border: 'rgba(0, 255, 163, 0.3)',
    },
    moderate: {
      text: 'ESTADO: MODERADO',
      color: '#FFD60A',
      bg: 'rgba(255, 214, 10, 0.15)',
      border: 'rgba(255, 214, 10, 0.3)',
    },
    critical: {
      text: 'ESTADO: CRÍTICO',
      color: '#FF453A',
      bg: 'rgba(255, 69, 58, 0.15)',
      border: 'rgba(255, 69, 58, 0.3)',
    },
  }[status];

  const debtColor =
    debtToIncomeRatio <= 30
      ? '#00FFA3'
      : debtToIncomeRatio <= 40
      ? '#FFD60A'
      : '#FF453A';

  const debtLegend =
    debtStatusDescription ||
    (debtToIncomeRatio <= 30
      ? 'Compromiso crediticio bajo control (< 30%)'
      : debtToIncomeRatio <= 40
      ? 'Compromiso moderado (30% - 40%)'
      : 'Alerta: Sobreendeudamiento (> 40%)');

  return (
    <View style={styles.card}>
      {/* Cabecera */}
      <View style={styles.headerRow}>
        <View style={styles.titleBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={styles.titleText}>DIAGNÓSTICO FINANCIERO</Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: statusConfig.bg,
              borderColor: statusConfig.border,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      {/* Sección 1: Tasa de Ahorro */}
      <View style={styles.section}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Tasa de Retención / Ahorro</Text>
          <Text style={styles.savingsValue}>{`${savingsRate}%`}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              styles.savingsBar,
              { width: `${clampedSavings}%` as DimensionValue },
            ]}
          />
        </View>
        <Text style={styles.legendText}>
          {`Retienes el ${savingsRate}% de tus ingresos este período`}
        </Text>
      </View>

      <View style={styles.separator} />

      {/* Sección 2: Carga de Deuda vs Ingreso */}
      <View style={styles.section}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Carga de Deuda (Cuotas / Ingreso)</Text>
          <Text style={[styles.debtValue, { color: debtColor }]}>{`${debtToIncomeRatio}%`}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: debtColor,
                width: `${clampedDebt}%` as DimensionValue,
              },
            ]}
          />
        </View>
        <Text style={styles.legendText}>
          {debtLegend}
        </Text>
      </View>

      <View style={styles.separator} />

      {/* Fila inferior con Flujo de Caja Libre */}
      <View style={styles.cashflowRow}>
        <View style={styles.cashflowLabelContainer}>
          <Ionicons name="flash-outline" size={15} color={colors.primary} />
          <Text style={styles.cashflowLabel}>Superávit Disponible</Text>
        </View>
        <Text style={styles.cashflowValue}>
          {`${sign}${currency}${formatAmount(netCashflow)}`}
        </Text>
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
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0D2B22',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  section: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  savingsValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  debtValue: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  savingsBar: {
    backgroundColor: colors.primary,
  },
  debtBar: {
    backgroundColor: '#0A84FF',
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  cashflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  cashflowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashflowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  cashflowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default FinancialHealthCard;

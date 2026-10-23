import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type DebtsSummaryProps = {
  totalDebt?: number;
  personalDebt?: number; // Mi deuda real neta
  thirdPartyDebt?: number; // Total a cargo de terceros
  monthCommitment?: number;
  totalOriginal?: number;
  currency?: string;
  onPressPersonal?: () => void;
  onPressThirdParty?: () => void;
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const DebtsSummaryCard = ({
  totalDebt = 8050.0,
  personalDebt = 7450.0,
  thirdPartyDebt = 600.0,
  monthCommitment = 1550.0,
  totalOriginal = 15500.0,
  currency = '$',
  onPressPersonal,
  onPressThirdParty,
}: DebtsSummaryProps): JSX.Element => {
  const paidAmount = Math.max(0, totalOriginal - totalDebt);
  const progressPercentage =
    totalOriginal > 0 ? Math.round((paidAmount / totalOriginal) * 100) : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercentage));

  return (
    <View style={styles.card}>
      {/* Detalle visual superior de acento cibernético */}
      <View style={styles.topAccentBar} />

      {/* Fila superior: Badge cibernético con punto verde "DEUDA TOTAL VIGENTE" y texto de moneda */}
      <View style={styles.headerRow}>
        <View style={styles.cyberBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.cyberBadgeText}>DEUDA TOTAL VIGENTE</Text>
        </View>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyBadgeText}>{currency} USD</Text>
        </View>
      </View>

      {/* Monto total grande en negrita */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>{currency}</Text>
        <Text style={styles.totalDebtText}>{formatAmount(totalDebt)}</Text>
      </View>

      {/* Fila de desglose visual claro: Mi deuda real vs A cargo de terceros */}
      <View style={styles.breakdownRow}>
        <TouchableOpacity
          style={styles.breakdownCol}
          onPress={onPressPersonal}
          disabled={!onPressPersonal}
          activeOpacity={onPressPersonal ? 0.7 : 1}
        >
          <View style={styles.breakdownLabelRow}>
            <Text style={styles.breakdownEmoji}>👤</Text>
            <Text style={styles.breakdownLabel}>Mi Deuda Real</Text>
            {onPressPersonal && (
              <Ionicons name="chevron-forward" size={11} color={colors.textSecondary} />
            )}
          </View>
          <Text style={styles.personalDebtText}>
            {currency} {formatAmount(personalDebt)}
          </Text>
        </TouchableOpacity>

        <View style={styles.breakdownDivider} />

        <TouchableOpacity
          style={styles.breakdownCol}
          onPress={onPressThirdParty}
          disabled={!onPressThirdParty}
          activeOpacity={onPressThirdParty ? 0.7 : 1}
        >
          <View style={styles.breakdownLabelRow}>
            <Text style={styles.breakdownEmoji}>🤝</Text>
            <Text style={styles.breakdownLabelHighlight}>A Cargo de Terceros</Text>
            {onPressThirdParty && (
              <Ionicons name="chevron-forward" size={11} color={colors.primary} />
            )}
          </View>
          <Text style={styles.thirdPartyDebtText}>
            {currency} {formatAmount(thirdPartyDebt)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fila intermedia con métrica de "COMPROMISO DEL MES" destacada con icono calendar-outline y monto */}
      <View style={styles.commitmentRow}>
        <View style={styles.commitmentLeft}>
          <View style={styles.calendarIconContainer}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.commitmentLabel}>COMPROMISO DEL MES</Text>
            <Text style={styles.commitmentSub}>Cuotas y pagos pactados</Text>
          </View>
        </View>
        <Text style={styles.commitmentAmount}>
          {currency} {formatAmount(monthCommitment)}
        </Text>
      </View>

      {/* Barra de progreso de amortización global */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>Amortización de Pasivos</Text>
          <Text style={styles.progressPercentageText}>{progressPercentage}% Pagado</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${clampedProgress}%` }]} />
        </View>

        <View style={styles.progressMetricsRow}>
          <Text style={styles.progressDetailText}>
            Liquidado: {currency} {formatAmount(paidAmount)}
          </Text>
          <Text style={styles.progressDetailText}>
            Inicial: {currency} {formatAmount(totalOriginal)}
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
    borderRadius: 16,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    gap: 14,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  cyberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  cyberBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  currencyBadge: {
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currencyBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  totalDebtText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  breakdownCol: {
    flex: 1,
    gap: 4,
  },
  breakdownDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownEmoji: {
    fontSize: 12,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  breakdownLabelHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  personalDebtText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  thirdPartyDebtText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  commitmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commitmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  commitmentSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    marginTop: 1,
  },
  commitmentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  progressContainer: {
    gap: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressPercentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetailText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default DebtsSummaryCard;

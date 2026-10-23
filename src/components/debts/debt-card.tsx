import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type DebtCategory = 'monthly' | 'personal';

export type DebtDetail = {
  id: string;
  title: string;
  creditor: string;
  category: DebtCategory;
  initialAmount: number;
  currentBalance: number;
  nextPaymentAmount: number;
  dueDateFormatted: string;
  daysRemaining: number;
  interestRate?: string;
  currency?: string;
};

export type DebtCardProps = {
  debt: DebtDetail;
  onPress?: (debt: DebtDetail) => void;
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const DebtCard = ({ debt, onPress }: DebtCardProps): JSX.Element => {
  const paid = Math.max(0, debt.initialAmount - debt.currentBalance);
  const pct =
    debt.initialAmount > 0
      ? Math.min(100, Math.max(0, Math.round((paid / debt.initialAmount) * 100)))
      : 0;

  // Semáforo de urgencia de vencimiento:
  // - daysRemaining > 10: verde neón (#00FFA3), "En plazo"
  // - 0 < daysRemaining <= 5: naranja/ámbar (#FF9F0A), "¡Por vencer!"
  // - daysRemaining <= 0: rojo (#FF453A), "¡Vencido!"
  let urgencyColor: string = colors.primary;
  let urgencyText = 'En plazo';
  let urgencyBg = 'rgba(0, 255, 163, 0.12)';
  let urgencyBorder = 'rgba(0, 255, 163, 0.35)';

  if (debt.daysRemaining <= 0) {
    urgencyColor = colors.error;
    urgencyText = '¡Vencido!';
    urgencyBg = 'rgba(255, 69, 58, 0.12)';
    urgencyBorder = 'rgba(255, 69, 58, 0.35)';
  } else if (debt.daysRemaining <= 5) {
    urgencyColor = '#FF9F0A';
    urgencyText = '¡Por vencer!';
    urgencyBg = 'rgba(255, 159, 10, 0.12)';
    urgencyBorder = 'rgba(255, 159, 10, 0.35)';
  }

  const isMonthly = debt.category === 'monthly';
  const currency = debt.currency ?? '$';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress ? () => onPress(debt) : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {/* Fila 1: Título de la deuda en negrita + Badge de categoría */}
      <View style={styles.row1}>
        <Text style={styles.debtTitle} numberOfLines={1}>
          {debt.title}
        </Text>
        <View
          style={[
            styles.categoryBadge,
            isMonthly ? styles.categoryBadgeMonthly : styles.categoryBadgePersonal,
          ]}
        >
          <Ionicons
            name={isMonthly ? 'repeat-outline' : 'people-outline'}
            size={12}
            color={isMonthly ? colors.primary : '#64D2FF'}
          />
          <Text
            style={[
              styles.categoryBadgeText,
              { color: isMonthly ? colors.primary : '#64D2FF' },
            ]}
          >
            {isMonthly ? 'Cuota Mensual' : 'Fecha Pactada'}
          </Text>
        </View>
      </View>

      {/* Fila 2: Acreedor + Badge del semáforo de días restantes */}
      <View style={styles.row2}>
        <View style={styles.creditorWrapper}>
          <Ionicons
            name={isMonthly ? 'business-outline' : 'person-circle-outline'}
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.creditorText} numberOfLines={1}>
            {debt.creditor}
          </Text>
          {debt.interestRate && debt.interestRate !== '0%' && (
            <View style={styles.interestTag}>
              <Text style={styles.interestText}>{debt.interestRate}</Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.urgencyBadge,
            {
              backgroundColor: urgencyBg,
              borderColor: urgencyBorder,
            },
          ]}
        >
          <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
          <Text style={[styles.urgencyText, { color: urgencyColor }]}>
            {urgencyText}
          </Text>
          <Text style={[styles.urgencyDaysText, { color: urgencyColor }]}>
            {debt.daysRemaining > 0 ? `(${debt.daysRemaining}d)` : '(Hoy)'}
          </Text>
        </View>
      </View>

      {/* Fila 3: Barra de amortización individual con texto de porcentaje liquidado */}
      <View style={styles.row3}>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctText}>{pct}% liquidado</Text>
      </View>

      {/* Fila 4: Dos columnas de montos */}
      <View style={styles.row4}>
        <View style={styles.colLeft}>
          <Text style={styles.amountHeaderLabel}>Próximo pago</Text>
          <Text style={styles.nextPaymentValue}>
            {currency} {formatAmount(debt.nextPaymentAmount)}
          </Text>
          <View style={styles.dueDateRow}>
            <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.dueDateSubText}>{debt.dueDateFormatted}</Text>
          </View>
        </View>

        <View style={styles.colRight}>
          <Text style={styles.amountHeaderLabel}>Saldo adeudado</Text>
          <Text style={styles.balanceValue}>
            {currency} {formatAmount(debt.currentBalance)}
          </Text>
          <Text style={styles.initialSubText}>
            de {currency} {formatAmount(debt.initialAmount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBadgeMonthly: {
    backgroundColor: '#0D2B22',
    borderColor: 'rgba(0, 255, 163, 0.3)',
  },
  categoryBadgePersonal: {
    backgroundColor: '#0E2433',
    borderColor: 'rgba(100, 210, 255, 0.3)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  creditorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  creditorText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flexShrink: 1,
  },
  interestTag: {
    backgroundColor: '#242426',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  urgencyDaysText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
  },
  row3: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161616',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  row4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  colLeft: {
    flex: 1,
    gap: 2,
  },
  colRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextPaymentValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  dueDateSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  initialSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
});

export default DebtCard;

import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { type TransactionType } from '../../store/transactions-store';

export type { TransactionType };

export type TransactionRecord = {
  id: string;
  title: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: TransactionType;
  amount: number;
  time: string; // ej: "14:30"
  dateGroup: string; // ej: "Hoy, 10 de Octubre", "Ayer, 09 de Octubre", "07 de Octubre 2026"
  currency?: string;
  paymentMethod?: 'cash_debit' | 'credit_card';
  cardName?: string;
  installmentsCount?: number;
};

export type TransactionItemCardProps = {
  item: TransactionRecord;
  onPress?: (item: TransactionRecord) => void;
  onLongPress?: (item: TransactionRecord) => void;
  onDelete?: (item: TransactionRecord) => void;
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const TransactionItemCard = ({
  item,
  onPress,
  onLongPress,
  onDelete,
}: TransactionItemCardProps): JSX.Element => {
  const isPositive = item.type === 'income' || item.type === 'reimbursement';
  const isCardPayment = item.type === 'card_payment';
  const currency = item.currency || '$';

  const iconBg = isPositive
    ? 'rgba(0, 255, 163, 0.12)'
    : isCardPayment
      ? 'rgba(10, 132, 255, 0.12)'
      : 'rgba(255, 69, 58, 0.12)';
  const accentColor = isPositive ? '#00FFA3' : isCardPayment ? '#0A84FF' : '#FF453A';
  const prefix = isPositive ? '+' : '-';
  const iconName: keyof typeof Ionicons.glyphMap = isCardPayment ? 'card-outline' : item.icon;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      {/* Icono Circular */}
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={accentColor} />
      </View>

      {/* Información Central */}
      <View style={styles.centerContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.subtitleRow}>
          {isCardPayment ? (
            <View style={styles.cardPaymentBadge}>
              <Ionicons name="card-outline" size={11} color="#0A84FF" style={styles.cardBadgeIcon} />
              <Text style={styles.cardPaymentBadgeText}>Pago Tarjeta</Text>
            </View>
          ) : (
            <Text style={styles.category} numberOfLines={1}>
              {item.category}
            </Text>
          )}
          <Text style={styles.dot}>•</Text>
          <Text style={styles.time}>{item.time}</Text>
          {!isCardPayment && (item.paymentMethod === 'credit_card' || !!item.cardName) && (
            <>
              <Text style={styles.dot}>•</Text>
              <View style={styles.cardBadge}>
                <Ionicons name="card-outline" size={11} color="#BF5AF2" style={styles.cardBadgeIcon} />
                <Text style={styles.cardBadgeText} numberOfLines={1}>
                  {`💳 ${item.cardName || 'Tarjeta'}${item.installmentsCount && item.installmentsCount > 1 ? ` (${item.installmentsCount} cuotas)` : ''}`}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Monto Destacado */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: accentColor }]}>
          {prefix}{currency}{formatAmount(item.amount)}
        </Text>
      </View>

      {/* Botón sutil de eliminar */}
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Eliminar movimiento"
        >
          <Ionicons name="trash-outline" size={16} color="rgba(255, 69, 58, 0.7)" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  deleteButton: {
    marginLeft: 10,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  category: {
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  dot: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 160,
  },
  cardBadgeIcon: {
    marginRight: 3,
  },
  cardBadgeText: {
    fontSize: 11,
    color: '#BF5AF2',
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardPaymentBadgeText: {
    fontSize: 11,
    color: '#0A84FF',
    fontWeight: '600',
  },
});

export default TransactionItemCard;

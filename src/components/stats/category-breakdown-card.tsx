import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type CategoryExpenseItem = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type CategoryBreakdownCardProps = {
  items?: CategoryExpenseItem[];
  totalExpense?: number;
  currency?: string;
};

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
};

const CategoryBreakdownCard = ({
  items = [],
  totalExpense = 0,
  currency = '$',
}: CategoryBreakdownCardProps): JSX.Element => {
  return (
    <View style={styles.card}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
          <Text style={styles.titleText}>DISTRIBUCIÓN DE GASTOS</Text>
        </View>
        <Text style={styles.totalAmount}>
          {`-${currency}${formatAmount(totalExpense)}`}
        </Text>
      </View>

      {/* Lista de Categorías o Estado Vacío */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pie-chart-outline" size={32} color="#8E8E93" />
          <Text style={styles.emptyText}>
            Sin gastos registrados en este período
          </Text>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {items.map((item, index) => {
            const clampedPercentage = Math.min(100, Math.max(0, item.percentage));
            return (
              <View key={item.categoryId || index} style={styles.itemRow}>
                {/* Fila superior: Icono miniatura, nombre y monto (%) */}
                <View style={styles.itemHeader}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                      <Ionicons name={item.icon} size={14} color={item.color} />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {item.categoryName}
                    </Text>
                  </View>

                  <View style={styles.amountInfo}>
                    <Text style={styles.amountText}>
                      {`-${currency}${formatAmount(item.amount)}`}
                    </Text>
                    <Text style={styles.percentageText}>{`(${item.percentage}%)`}</Text>
                  </View>
                </View>

                {/* Barra de progreso horizontal */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: item.color,
                        width: `${clampedPercentage}%` as DimensionValue,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  totalAmount: {
    color: '#FF6961',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemsList: {
    gap: 14,
  },
  itemRow: {
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  amountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  amountText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  percentageText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

export default CategoryBreakdownCard;

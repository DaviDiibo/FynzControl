import React, { useState } from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTransactionsStore, type TransactionType } from '../../store/transactions-store';
import DeleteTransactionModal from '../transactions/delete-transaction-modal';

export type { TransactionType };

export type RecentTransaction = {
  id: string;
  title: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: TransactionType;
  amount: number;
  dateFormatted: string;
  currency?: string;
};

export type Transaction = RecentTransaction;

export type TransactionFilter = 'all' | 'income' | 'expense';

export type RecentTransactionsListProps = {
  transactions?: RecentTransaction[];
  onViewAll?: () => void;
};

const defaultTransactions: RecentTransaction[] = [
  {
    id: 'tx-1',
    title: 'Nómina Quincenal',
    category: 'Ingreso Fijo',
    icon: 'briefcase-outline',
    type: 'income',
    amount: 2450.0,
    dateFormatted: 'Hoy, 09:15',
    currency: '$',
  },
  {
    id: 'tx-2',
    title: 'Supermercado',
    category: 'Alimentación',
    icon: 'cart-outline',
    type: 'expense',
    amount: 84.5,
    dateFormatted: 'Hoy, 14:30',
    currency: '$',
  },
  {
    id: 'tx-3',
    title: 'Combustible / Transporte',
    category: 'Transporte',
    icon: 'car-outline',
    type: 'expense',
    amount: 35.0,
    dateFormatted: 'Ayer, 19:40',
    currency: '$',
  },
  {
    id: 'tx-4',
    title: 'Pago Freelance',
    category: 'Ingreso Extra',
    icon: 'laptop-outline',
    type: 'income',
    amount: 320.0,
    dateFormatted: '08 Oct 2026',
    currency: '$',
  },
  {
    id: 'tx-5',
    title: 'Servicios - Electricidad',
    category: 'Servicios',
    icon: 'flash-outline',
    type: 'expense',
    amount: 62.0,
    dateFormatted: '07 Oct 2026',
    currency: '$',
  },
];

const FILTER_OPTIONS: { key: TransactionFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
];

const formatAmount = (val: number): string => {
  return val.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const RecentTransactionsList = ({
  transactions = defaultTransactions,
  onViewAll,
}: RecentTransactionsListProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>('all');
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const deleteTransaction = useTransactionsStore((state) => state.deleteTransaction);

  const handleConfirmDelete = (): void => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
  };

  const filteredList = transactions.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'income') return t.type === 'income' || t.type === 'reimbursement';
    if (activeFilter === 'expense') return t.type === 'expense' || t.type === 'card_payment';
    return t.type === activeFilter;
  });

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          <Ionicons name="receipt-outline" size={16} color={colors.primary} />
          <Text style={styles.title}>ÚLTIMOS MOVIMIENTOS</Text>
        </View>

        {onViewAll && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={onViewAll}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Ver todos los movimientos"
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selector de filtros segmentado */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterPill,
                isActive ? styles.filterPillActive : styles.filterPillInactive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Ver todos los movimientos"
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive
                    ? styles.filterPillTextActive
                    : styles.filterPillTextInactive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista de Movimientos */}
      {filteredList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="receipt-outline"
            size={32}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>Sin movimientos</Text>
          <Text style={styles.emptySubtitle}>
            No hay registros para este filtro seleccionado
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredList.map((item) => {
            const isPositive = item.type === 'income' || item.type === 'reimbursement';
            const isCardPayment = item.type === 'card_payment';
            const currencySymbol = item.currency ?? '$';
            const amountColor = isPositive
              ? colors.primary
              : isCardPayment
                ? '#0A84FF'
                : colors.error;
            const amountPrefix = isPositive ? '+' : '-';
            const iconName: keyof typeof Ionicons.glyphMap = isCardPayment ? 'card-outline' : item.icon;
            const iconBg = isPositive
              ? 'rgba(0, 255, 163, 0.15)'
              : isCardPayment
                ? 'rgba(10, 132, 255, 0.15)'
                : 'rgba(255, 69, 58, 0.15)';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.transactionCard}
                activeOpacity={0.7}
                onPress={() => setTransactionToDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.title}`}
              >
                {/* Lado izquierdo: Contenedor circular con icono */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: iconBg,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={20}
                    color={amountColor}
                  />
                </View>

                {/* Centro: Título, categoría y fecha */}
                <View style={styles.detailsContainer}>
                  <Text style={styles.transactionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.metadataRow}>
                    {isCardPayment ? (
                      <View style={styles.cardPaymentBadge}>
                        <Ionicons name="card-outline" size={11} color="#0A84FF" style={styles.badgeIcon} />
                        <Text style={styles.cardPaymentBadgeText}>Pago Tarjeta</Text>
                      </View>
                    ) : (
                      <Text style={styles.metadataText} numberOfLines={1}>
                        {item.category}
                      </Text>
                    )}
                    <Text style={styles.metadataDot}>•</Text>
                    <Text style={styles.metadataText}>
                      {item.dateFormatted}
                    </Text>
                  </View>
                </View>

                {/* Lado derecho: Monto con signo explícito */}
                <View style={styles.amountContainer}>
                  <Text style={[styles.amountText, { color: amountColor }]}>
                    {amountPrefix}{currencySymbol} {formatAmount(item.amount)}
                  </Text>
                </View>

                {/* Botón sutil de eliminar */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setTransactionToDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar movimiento"
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="rgba(255, 69, 58, 0.65)"
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Modal Reutilizable de Confirmación de Eliminación */}
      <DeleteTransactionModal
        visible={!!transactionToDelete}
        transaction={
          transactionToDelete
            ? {
                id: transactionToDelete.id,
                title: transactionToDelete.title,
                amount: transactionToDelete.amount,
                type:
                  transactionToDelete.type === 'card_payment'
                    ? 'expense'
                    : transactionToDelete.type,
                currency: transactionToDelete.currency,
              }
            : null
        }
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.15)',
    borderColor: colors.primary,
  },
  filterPillInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  filterPillText: {
    fontSize: 12,
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterPillTextInactive: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  list: {
    gap: 0,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
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
    marginRight: 12,
  },
  iconContainerIncome: {
    backgroundColor: 'rgba(0, 255, 163, 0.15)',
  },
  iconContainerExpense: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  detailsContainer: {
    flex: 1,
    gap: 3,
    marginRight: 8,
  },
  transactionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  metadataDot: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
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
    color: '#0A84FF',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeIcon: {
    marginRight: 2,
  },
});

export default RecentTransactionsList;

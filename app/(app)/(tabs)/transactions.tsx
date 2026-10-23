import React, { useState, useMemo } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import TransactionsSummaryHeader from '../../../src/components/transactions/transactions-summary-header';
import TransactionItemCard, {
  type TransactionRecord,
} from '../../../src/components/transactions/transaction-item-card';
import DeleteTransactionModal from '../../../src/components/transactions/delete-transaction-modal';
import { useTransactionsStore, type Transaction } from '../../../src/store/transactions-store';
import { useSettingsStore } from '../../../src/store/settings-store';

type FilterType = 'all' | 'income' | 'expense';

const isSameMonthAndYear = (dateStr: string, targetDate: Date): boolean => {
  if (!dateStr) {
    return false;
  }
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return (
        d.getFullYear() === targetDate.getFullYear() &&
        d.getMonth() === targetDate.getMonth()
      );
    }
  }
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length >= 2) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    if (!isNaN(year) && !isNaN(month)) {
      return year === targetDate.getFullYear() && month === targetDate.getMonth();
    }
  }
  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    return (
      fallback.getFullYear() === targetDate.getFullYear() &&
      fallback.getMonth() === targetDate.getMonth()
    );
  }
  return false;
};

const getTimeString = (tx: Transaction): string => {
  if (tx.date) {
    const d = new Date(tx.date);
    if (!isNaN(d.getTime())) {
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }
  if (tx.dateFormatted) {
    const match = tx.dateFormatted.match(/\d{1,2}:\d{2}/);
    if (match) {
      return match[0];
    }
  }
  return '00:00';
};

const TransactionsScreen = (): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isAllTime, setIsAllTime] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionRecord | null>(null);

  const transactions = useTransactionsStore((state) => state.transactions);
  const deleteTransaction = useTransactionsStore((state) => state.deleteTransaction);
  const currencyCode = useSettingsStore((state) => state.currency);

  const currencySymbol = currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  const handleDeleteTransaction = (tx: TransactionRecord): void => {
    setTransactionToDelete(tx);
  };

  const handleConfirmDelete = (): void => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
  };

  const handlePrevMonth = (): void => {
    if (isAllTime) {
      setIsAllTime(false);
    }
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (): void => {
    if (isAllTime) {
      setIsAllTime(false);
    }
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToggleAllTime = (): void => {
    setIsAllTime((prev) => !prev);
  };

  const formattedMonth = useMemo(() => {
    if (isAllTime) {
      return 'Histórico Completo';
    }
    const monthName = selectedDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }, [isAllTime, selectedDate]);

  // Transacciones filtradas por el mes seleccionado (o todas si isAllTime)
  const monthTransactions = useMemo(() => {
    if (isAllTime) {
      return transactions;
    }
    return transactions.filter((tx) => isSameMonthAndYear(tx.date, selectedDate));
  }, [transactions, isAllTime, selectedDate]);

  // Métricas financieras calculadas dinámicamente según el período activo
  const { monthlyIncome, monthlyExpense, monthlyNet } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of monthTransactions) {
      if (tx.type === 'income' || tx.type === 'reimbursement') {
        income += tx.amount;
      } else if (tx.type === 'expense' || tx.type === 'card_payment') {
        expense += tx.amount;
      }
    }

    return {
      monthlyIncome: income,
      monthlyExpense: expense,
      monthlyNet: income - expense,
    };
  }, [monthTransactions]);

  const mappedTransactions: TransactionRecord[] = useMemo(() => {
    return monthTransactions.map((tx) => ({
      id: tx.id,
      title: tx.title,
      category: tx.category,
      icon: tx.icon,
      type: tx.type,
      amount: tx.amount,
      time: getTimeString(tx),
      dateGroup: tx.dateGroup || 'Recientes',
      currency: currencySymbol,
      cardName: tx.cardName,
      paymentMethod: tx.paymentMethod,
      installmentsCount: tx.installmentsCount,
    }));
  }, [monthTransactions, currencySymbol]);

  const filteredTransactions = useMemo(() => {
    return mappedTransactions.filter((tx) => {
      // Filtro de tipo (todos / ingresos / gastos)
      if (activeFilter === 'income' && tx.type !== 'income' && tx.type !== 'reimbursement') {
        return false;
      }
      if (activeFilter === 'expense' && tx.type !== 'expense' && tx.type !== 'card_payment') {
        return false;
      }

      // Filtro de texto (título o categoría)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchCategory = tx.category.toLowerCase().includes(query);
        if (!matchTitle && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [mappedTransactions, activeFilter, searchQuery]);

  // Agrupamiento por fecha preservando orden cronológico
  const groupedTransactions = useMemo(() => {
    const groups: { dateGroup: string; items: TransactionRecord[] }[] = [];
    const map = new Map<string, TransactionRecord[]>();

    for (const tx of filteredTransactions) {
      if (!map.has(tx.dateGroup)) {
        const list: TransactionRecord[] = [];
        map.set(tx.dateGroup, list);
        groups.push({ dateGroup: tx.dateGroup, items: list });
      }
      map.get(tx.dateGroup)!.push(tx);
    }

    return groups;
  }, [filteredTransactions]);

  // Contadores para las píldoras calculados sobre el período activo
  const counts = useMemo(() => {
    const incomeCount = monthTransactions.filter(
      (t) => t.type === 'income' || t.type === 'reimbursement'
    ).length;
    const expenseCount = monthTransactions.filter(
      (t) => t.type === 'expense' || t.type === 'card_payment'
    ).length;
    return {
      all: monthTransactions.length,
      income: incomeCount,
      expense: expenseCount,
    };
  }, [monthTransactions]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>FLUJO FINANCIERO</Text>
          </View>
          <Text style={styles.headerTitle}>HISTORIAL DE MOVIMIENTOS</Text>
        </View>

        {/* Resumen Mensual */}
        <TransactionsSummaryHeader
          currentMonth={formattedMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          incomeTotal={monthlyIncome}
          expenseTotal={monthlyExpense}
          netBalance={monthlyNet}
          currency={currencySymbol}
          isAllTime={isAllTime}
          onToggleAllTime={handleToggleAllTime}
        />

        {/* Buscador */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por concepto o categoría..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtro Segmentado */}
        <View style={styles.filterSection}>
          <View style={styles.pillsContainer}>
            {/* Todos */}
            <TouchableOpacity
              style={[
                styles.pill,
                activeFilter === 'all' && styles.pillActive,
              ]}
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  activeFilter === 'all' && styles.pillTextActive,
                ]}
              >
                Todos
              </Text>
              <View
                style={[
                  styles.countBadge,
                  activeFilter === 'all' && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeFilter === 'all' && styles.countBadgeTextActive,
                  ]}
                >
                  {counts.all}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Ingresos */}
            <TouchableOpacity
              style={[
                styles.pill,
                activeFilter === 'income' && styles.pillActiveIncome,
              ]}
              onPress={() => setActiveFilter('income')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={14}
                color={activeFilter === 'income' ? '#00FFA3' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.pillText,
                  activeFilter === 'income' && styles.pillTextActiveIncome,
                ]}
              >
                Ingresos
              </Text>
              <View
                style={[
                  styles.countBadge,
                  activeFilter === 'income' && styles.countBadgeActiveIncome,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeFilter === 'income' && styles.countBadgeTextActiveIncome,
                  ]}
                >
                  {counts.income}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Gastos */}
            <TouchableOpacity
              style={[
                styles.pill,
                activeFilter === 'expense' && styles.pillActiveExpense,
              ]}
              onPress={() => setActiveFilter('expense')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={14}
                color={activeFilter === 'expense' ? '#FF453A' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.pillText,
                  activeFilter === 'expense' && styles.pillTextActiveExpense,
                ]}
              >
                Gastos
              </Text>
              <View
                style={[
                  styles.countBadge,
                  activeFilter === 'expense' && styles.countBadgeActiveExpense,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeFilter === 'expense' && styles.countBadgeTextActiveExpense,
                  ]}
                >
                  {counts.expense}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista Agrupada de Movimientos */}
        {groupedTransactions.length > 0 ? (
          <View style={styles.listContainer}>
            {groupedTransactions.map((group) => (
              <View key={group.dateGroup} style={styles.dateGroupContainer}>
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupTitle}>{group.dateGroup}</Text>
                  <Text style={styles.dateGroupCount}>
                    {group.items.length} {group.items.length === 1 ? 'movimiento' : 'movimientos'}
                  </Text>
                </View>
                {group.items.map((item) => (
                  <TransactionItemCard
                    key={item.id}
                    item={item}
                    onPress={handleDeleteTransaction}
                    onDelete={handleDeleteTransaction}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          /* Estado Vacío */
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name={transactions.length === 0 ? 'wallet-outline' : 'search-outline'}
                size={28}
                color={colors.textSecondary}
              />
            </View>
            <Text style={styles.emptyStateTitle}>
              {transactions.length === 0
                ? 'No hay movimientos registrados'
                : monthTransactions.length === 0
                ? 'Sin movimientos en este período'
                : 'Sin movimientos encontrados'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {transactions.length === 0
                ? 'Agrega tus ingresos y gastos para ver tu historial detallado aquí.'
                : monthTransactions.length === 0
                ? 'No se registraron transacciones para el período seleccionado.'
                : 'Intenta cambiar el término de búsqueda o el filtro seleccionado.'}
            </Text>
            {(searchQuery.length > 0 ||
              activeFilter !== 'all' ||
              (!isAllTime && monthTransactions.length === 0 && transactions.length > 0)) && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  if (!isAllTime && monthTransactions.length === 0 && transactions.length > 0) {
                    setIsAllTime(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    !isAllTime && monthTransactions.length === 0 && transactions.length > 0
                      ? 'calendar-outline'
                      : 'refresh-outline'
                  }
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.resetButtonText}>
                  {!isAllTime && monthTransactions.length === 0 && transactions.length > 0
                    ? 'Ver todo el historial'
                    : 'Restablecer filtros'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Confirmación de Eliminación */}
      <DeleteTransactionModal
        visible={!!transactionToDelete}
        transaction={transactionToDelete}
        currencySymbol={currencySymbol}
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
    gap: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginHorizontal: 8,
    paddingVertical: 0,
  },
  filterSection: {
    marginBottom: 16,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: colors.primary,
  },
  pillActiveIncome: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: colors.primary,
  },
  pillActiveExpense: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: colors.error,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  pillTextActiveIncome: {
    color: colors.primary,
    fontWeight: '700',
  },
  pillTextActiveExpense: {
    color: colors.error,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#2A2A2E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.25)',
  },
  countBadgeActiveIncome: {
    backgroundColor: 'rgba(0, 255, 163, 0.25)',
  },
  countBadgeActiveExpense: {
    backgroundColor: 'rgba(255, 69, 58, 0.25)',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  countBadgeTextActive: {
    color: colors.primary,
  },
  countBadgeTextActiveIncome: {
    color: colors.primary,
  },
  countBadgeTextActiveExpense: {
    color: colors.error,
  },
  listContainer: {
    marginTop: 4,
  },
  dateGroupContainer: {
    marginBottom: 14,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateGroupCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyStateContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default TransactionsScreen;

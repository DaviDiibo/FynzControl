import React, { useState, useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { useIsWide } from '../../../src/hooks/use-responsive';
import DashboardHeader from '../../../src/components/dashboard/dashboard-header';
import BalanceHeroCard, {
  type BankAccountSummary,
} from '../../../src/components/dashboard/balance-hero-card';
import UpcomingDebtsCard from '../../../src/components/dashboard/upcoming-debts-card';
import QuickActionsGrid from '../../../src/components/dashboard/quick-actions-grid';
import RecentTransactionsList, {
  type RecentTransaction,
} from '../../../src/components/dashboard/recent-transactions-list';
import { useTransactionsStore } from '../../../src/store/transactions-store';
import { useCardsStore } from '../../../src/store/cards-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import {
  subscribeToInitialSync,
  isInitialSyncing,
} from '../../../src/services/sync-service';

const DashboardScreen = (): JSX.Element => {
  const router = useRouter();
  const isWide = useIsWide(768);
  const [isSyncingInitial, setIsSyncingInitial] = useState<boolean>(() => isInitialSyncing());

  useEffect(() => {
    const unsubscribe = subscribeToInitialSync(setIsSyncingInitial);
    return () => {
      unsubscribe();
    };
  }, []);

  const transactions = useTransactionsStore((state) => state.transactions);
  const currentMonthIncome = useTransactionsStore((state) =>
    state.getCurrentMonthIncome()
  );
  const currentMonthExpense = useTransactionsStore((state) =>
    state.getCurrentMonthExpense()
  );
  const netBalance = useTransactionsStore((state) => state.getNetBalance());
  const getBankComputedBalance = useTransactionsStore(
    (state) => state.getBankComputedBalance
  );
  const getBankCustodyAmount = useTransactionsStore(
    (state) => state.getBankCustodyAmount
  );

  const banks = useCardsStore((state) => state.banks);
  const currencyCode = useSettingsStore((state) => state.currency);

  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  // Resumen computado de cuentas bancarias y liquidez disponible
  const bankSummaries = useMemo<BankAccountSummary[]>(() => {
    // 1. Cómputo de saldos por banco registrado
    const computedList: BankAccountSummary[] = (banks || []).map((b) => {
      const bal = getBankComputedBalance(b.id, b.initialBalance);
      const custody = getBankCustodyAmount(b.id);
      return {
        id: b.id,
        name: b.name,
        balance: bal,
        percentage: 0,
        custodyAmount: custody > 0 ? custody : undefined,
      };
    });

    // 2. Transacciones no asignadas a un banco específico (Efectivo / Otras cuentas)
    const unassignedBalance = transactions.reduce((acc, tx) => {
      if (tx.bankId) return acc;
      // Las compras con tarjeta de crédito sin banco no reducen liquidez de efectivo hasta pagarse
      if (tx.paymentMethod === 'credit_card') return acc;
      if (tx.type === 'income' || tx.type === 'reimbursement') {
        return acc + tx.amount;
      }
      if (tx.type === 'expense' || tx.type === 'card_payment') {
        return acc - tx.amount;
      }
      return acc;
    }, 0);

    // Si existe liquidez no bancarizada o no hay bancos registrados pero sí transacciones
    if (unassignedBalance !== 0 || computedList.length === 0) {
      const fallbackAmount =
        computedList.length === 0 && unassignedBalance === 0
          ? netBalance
          : unassignedBalance;

      if (fallbackAmount !== 0 || computedList.length === 0) {
        computedList.push({
          id: 'unassigned_cash',
          name: 'Efectivo / Otros',
          balance: fallbackAmount,
          percentage: 0,
        });
      }
    }

    // 3. Cálculo de porcentajes sobre la liquidez positiva total
    const totalPositive = computedList.reduce(
      (sum, item) => sum + (item.balance > 0 ? item.balance : 0),
      0
    );

    return computedList.map((item) => ({
      ...item,
      percentage:
        totalPositive > 0 && item.balance > 0
          ? Number(((item.balance / totalPositive) * 100).toFixed(1))
          : 0,
    }));
  }, [banks, transactions, getBankComputedBalance, getBankCustodyAmount, netBalance]);

  // Liquidez total real sumando cuentas y saldos disponibles
  const totalLiquidBalance = useMemo<number>(() => {
    if (bankSummaries.length > 0) {
      return bankSummaries.reduce((sum, b) => sum + b.balance, 0);
    }
    return netBalance;
  }, [bankSummaries, netBalance]);

  const recentItems: RecentTransaction[] = useMemo(() => {
    return transactions.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      icon: t.icon,
      type: t.type,
      amount: t.amount,
      dateFormatted: t.dateFormatted,
      currency: currencySymbol,
    }));
  }, [transactions, currencySymbol]);

  if (isSyncingInitial) {
    return (
      <SafeAreaView style={styles.syncSafeArea}>
        <View style={styles.syncContainer}>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>[ SINCRONIZANDO FINANZAS ]</Text>
          </View>
          <ActivityIndicator size="large" color="#00FFA3" style={styles.syncSpinner} />
          <Text style={styles.syncTitle}>Cargando tus finanzas...</Text>
          <Text style={styles.syncSubtitle}>
            Descargando tus movimientos, cuentas y tarjetas seguras...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader />

        {isWide ? (
          <View style={styles.wideGridContainer}>
            <View style={styles.leftColumn}>
              <BalanceHeroCard
                balance={totalLiquidBalance}
                monthlyIncome={currentMonthIncome}
                monthlyExpense={currentMonthExpense}
                currency={currencySymbol}
                banks={bankSummaries}
                onBankPress={(_bankId) =>
                  router.push('/(app)/(modal)/cards-overview')
                }
                onAddBankPress={() =>
                  router.push('/(app)/(modal)/cards-overview')
                }
                isWide={isWide}
              />
              <QuickActionsGrid
                onAddIncome={() =>
                  router.push({
                    pathname: '/(app)/(modal)/new-transaction',
                    params: { type: 'income' },
                  })
                }
                onAddExpense={() =>
                  router.push({
                    pathname: '/(app)/(modal)/new-transaction',
                    params: { type: 'expense' },
                  })
                }
                onCardsPress={() =>
                  router.push('/(app)/(modal)/cards-overview')
                }
                onViewAnalytics={() => router.push('/(app)/(tabs)/stats')}
              />
            </View>

            <View style={styles.rightColumn}>
              <UpcomingDebtsCard />
              <View style={styles.recentTransactionsContainer}>
                <RecentTransactionsList
                  transactions={recentItems}
                  onViewAll={() => router.push('/(app)/(tabs)/transactions')}
                />
              </View>
            </View>
          </View>
        ) : (
          <>
            <BalanceHeroCard
              balance={totalLiquidBalance}
              monthlyIncome={currentMonthIncome}
              monthlyExpense={currentMonthExpense}
              currency={currencySymbol}
              banks={bankSummaries}
              onBankPress={(_bankId) =>
                router.push('/(app)/(modal)/cards-overview')
              }
              onAddBankPress={() =>
                router.push('/(app)/(modal)/cards-overview')
              }
              isWide={isWide}
            />
            <UpcomingDebtsCard />

            <QuickActionsGrid
              onAddIncome={() =>
                router.push({
                  pathname: '/(app)/(modal)/new-transaction',
                  params: { type: 'income' },
                })
              }
              onAddExpense={() =>
                router.push({
                  pathname: '/(app)/(modal)/new-transaction',
                  params: { type: 'expense' },
                })
              }
              onCardsPress={() =>
                router.push('/(app)/(modal)/cards-overview')
              }
              onViewAnalytics={() => router.push('/(app)/(tabs)/stats')}
            />

            <View style={styles.recentTransactionsContainer}>
              <RecentTransactionsList
                transactions={recentItems}
                onViewAll={() => router.push('/(app)/(tabs)/transactions')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  syncSafeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  syncContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  syncBadge: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncBadgeText: {
    color: '#00FFA3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  syncSpinner: {
    marginVertical: 24,
  },
  syncTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  syncSubtitle: {
    color: '#A0A0A0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  scrollContentWide: {
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
    flex: 1,
    gap: 20,
  },
  rightColumn: {
    flex: 1,
    gap: 20,
  },
  recentTransactionsContainer: {
    marginBottom: 20,
  },
});

export default DashboardScreen;

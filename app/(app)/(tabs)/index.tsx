import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import DashboardHeader from '../../../src/components/dashboard/dashboard-header';
import BalanceHeroCard from '../../../src/components/dashboard/balance-hero-card';
import UpcomingDebtsCard from '../../../src/components/dashboard/upcoming-debts-card';
import QuickActionsGrid from '../../../src/components/dashboard/quick-actions-grid';
import RecentTransactionsList, {
  type RecentTransaction,
} from '../../../src/components/dashboard/recent-transactions-list';
import { useTransactionsStore } from '../../../src/store/transactions-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import {
  subscribeToInitialSync,
  isInitialSyncing,
} from '../../../src/services/sync-service';

const DashboardScreen = (): JSX.Element => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
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
  const currencyCode = useSettingsStore((state) => state.currency);

  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  const recentItems: RecentTransaction[] = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    icon: t.icon,
    type: t.type,
    amount: t.amount,
    dateFormatted: t.dateFormatted,
    currency: currencySymbol,
  }));

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
                balance={netBalance}
                monthlyIncome={currentMonthIncome}
                monthlyExpense={currentMonthExpense}
                currency={currencySymbol}
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
              balance={netBalance}
              monthlyIncome={currentMonthIncome}
              monthlyExpense={currentMonthExpense}
              currency={currencySymbol}
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

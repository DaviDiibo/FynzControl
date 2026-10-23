import React from 'react';
import type { JSX } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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

const DashboardScreen = (): JSX.Element => {
  const router = useRouter();

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader />
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  recentTransactionsContainer: {
    marginBottom: 20,
  },
});

export default DashboardScreen;

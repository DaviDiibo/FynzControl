import React from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useSettingsStore } from '../../store/settings-store';
import { getBankIdentity } from '../../utils/bank-identity';
import { BankDeckCard, AddBankDeckCard } from './bank-deck-card';

export type BankAccountSummary = {
  id: string;
  name: string;
  balance: number;
  percentage: number;
  custodyAmount?: number;
};

export type BalanceHeroCardProps = {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  currency?: string;
  banks?: BankAccountSummary[];
  onBankPress?: (bankId: string) => void;
  onAddBankPress?: () => void;
  isWide?: boolean;
  isPrivate?: boolean;
  onTogglePrivacy?: () => void;
  /** @deprecated compatibilidad con llamadas anteriores */
  income?: number;
  /** @deprecated compatibilidad con llamadas anteriores */
  expenses?: number;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  BRL: 'R$',
  ARS: '$',
  COP: '$',
  MXN: '$',
};

const formatAmount = (val: number): string => {
  if (isNaN(val)) return '0,00';
  return val.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const BalanceHeroCard = ({
  balance = 0,
  monthlyIncome: monthlyIncomeProp,
  monthlyExpense: monthlyExpenseProp,
  income,
  expenses,
  currency: currencyProp,
  banks = [],
  onBankPress,
  onAddBankPress,
  isWide = false,
  isPrivate,
  onTogglePrivacy,
}: BalanceHeroCardProps): JSX.Element => {
  const {
    privacyMode: storePrivacyMode,
    togglePrivacyMode: storeTogglePrivacyMode,
    currency: storeCurrency,
  } = useSettingsStore();

  const monthlyIncome = monthlyIncomeProp ?? income ?? 0;
  const monthlyExpense = monthlyExpenseProp ?? expenses ?? 0;
  const activePrivacy = isPrivate !== undefined ? isPrivate : storePrivacyMode;
  const handleTogglePrivacy = onTogglePrivacy ?? storeTogglePrivacyMode;

  const activeCurrency =
    currencyProp ?? CURRENCY_SYMBOLS[storeCurrency] ?? storeCurrency;

  const net = monthlyIncome - monthlyExpense;
  const savingsRate =
    monthlyIncome > 0 ? net / monthlyIncome : net >= 0 ? 0 : -1;

  let healthStatus = 'EQUILIBRADO';
  let healthColor = '#0A84FF';
  let healthBg = 'rgba(10, 132, 255, 0.15)';

  if (net < 0) {
    healthStatus = 'DÉFICIT';
    healthColor = '#FF453A';
    healthBg = 'rgba(255, 69, 58, 0.15)';
  } else if (savingsRate >= 0.2 || (monthlyIncome > 0 && monthlyExpense === 0)) {
    healthStatus = 'ÓPTIMO';
    healthColor = '#00FFA3';
    healthBg = 'rgba(0, 255, 163, 0.15)';
  }

  // Filtrar bancos con porcentaje positivo para la micro-barra de distribución patrimonial
  const validSegments = banks.filter((b) => b.percentage > 0);

  return (
    <View style={styles.container}>
      {/* Micro-Hero Card: Saldo Total Compacto */}
      <View style={styles.card}>
        {/* Fila 1: Etiqueta, badge de salud financiera y botón de privacidad */}
        <View style={styles.topRow}>
          <View style={styles.labelGroup}>
            <Text style={styles.label}>LIQUIDEZ TOTAL DISPONIBLE</Text>
            <View
              style={[
                styles.healthChip,
                { backgroundColor: healthBg, borderColor: healthColor },
              ]}
            >
              <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
              <Text style={[styles.healthText, { color: healthColor }]}>
                {healthStatus}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={handleTogglePrivacy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              activePrivacy ? 'Mostrar balance' : 'Ocultar balance'
            }
          >
            <Ionicons
              name={activePrivacy ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Fila 2: Cifra de saldo total en tipografía compacta y micro-chips de flujo mensual */}
        <View style={styles.balanceRow}>
          <Text
            style={styles.balanceText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {activePrivacy
              ? `${activeCurrency} ••••••`
              : `${activeCurrency} ${formatAmount(balance)}`}
          </Text>

          <View style={styles.flowChipsContainer}>
            <View style={styles.flowChipIncome}>
              <Text style={styles.flowChipIncomeText}>
                ▲ +{activePrivacy ? '••••' : `${activeCurrency} ${formatAmount(monthlyIncome)}`}
              </Text>
            </View>
            <View style={styles.flowChipExpense}>
              <Text style={styles.flowChipExpenseText}>
                ▼ -{activePrivacy ? '••••' : `${activeCurrency} ${formatAmount(monthlyExpense)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Fila 3: Micro-barra de distribución patrimonial segmentada */}
        <View style={styles.segmentedBarTrack}>
          {validSegments.length > 0 ? (
            validSegments.map((bank) => {
              const bankColor = getBankIdentity(bank.name).color;
              return (
                <View
                  key={bank.id}
                  style={[
                    styles.segmentItem,
                    {
                      width: `${Math.max(0, Math.min(100, bank.percentage))}%`,
                      backgroundColor: bankColor,
                    },
                  ]}
                />
              );
            })
          ) : (
            <View style={styles.emptySegment} />
          )}
        </View>
      </View>

      {/* Carrusel / Deck de Cuentas Bancarias y Liquidez */}
      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <Text style={styles.carouselTitle}>CUENTAS BANCARIAS Y LIQUIDEZ</Text>
        </View>

        {isWide ? (
          <View style={styles.wideDeckContainer}>
            {banks.map((bank) => (
              <BankDeckCard
                key={bank.id}
                bankName={bank.name}
                balance={bank.balance}
                currencySymbol={activeCurrency}
                percentage={bank.percentage}
                custodyAmount={bank.custodyAmount}
                isHidden={activePrivacy}
                onPress={() => onBankPress?.(bank.id)}
                style={styles.desktopCard}
              />
            ))}
            <AddBankDeckCard
              onPress={() => onAddBankPress?.()}
              style={styles.desktopCard}
            />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mobileDeckScroll}
          >
            {banks.map((bank) => (
              <BankDeckCard
                key={bank.id}
                bankName={bank.name}
                balance={bank.balance}
                currencySymbol={activeCurrency}
                percentage={bank.percentage}
                custodyAmount={bank.custodyAmount}
                isHidden={activePrivacy}
                onPress={() => onBankPress?.(bank.id)}
              />
            ))}
            <AddBankDeckCard onPress={() => onAddBankPress?.()} />
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopColor: colors.primary,
    borderTopWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  healthDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  healthText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  eyeButton: {
    padding: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  balanceText: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  flowChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowChipIncome: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  flowChipIncomeText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '700',
  },
  flowChipExpense: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  flowChipExpenseText: {
    color: '#FF453A',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentedBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#2A2A2A',
    width: '100%',
  },
  segmentItem: {
    height: '100%',
  },
  emptySegment: {
    flex: 1,
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
  carouselSection: {
    marginTop: 2,
  },
  carouselHeader: {
    marginBottom: 8,
  },
  carouselTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mobileDeckScroll: {
    gap: 10,
    paddingRight: 16,
  },
  wideDeckContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  desktopCard: {
    width: '48.5%',
    flexGrow: 1,
    minWidth: 170,
  },
});

export { BalanceHeroCard };
export default React.memo(BalanceHeroCard);

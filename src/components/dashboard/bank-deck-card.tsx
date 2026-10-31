import React from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBankIdentity } from '../../utils/bank-identity';

export type BankDeckCardProps = {
  bankName: string;
  balance: number;
  currencySymbol: string;
  percentage: number;
  isHidden?: boolean;
  onPress?: () => void;
  custodyAmount?: number;
  style?: StyleProp<ViewStyle>;
};

export type AddBankDeckCardProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const formatAmount = (val: number): string => {
  if (isNaN(val)) return '0,00';
  return val.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercentage = (pct: number): string => {
  if (isNaN(pct)) return '0%';
  const rounded = Math.round(pct);
  return `${rounded}%`;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

export const BankDeckCard = ({
  bankName,
  balance,
  currencySymbol,
  percentage,
  isHidden = false,
  onPress,
  custodyAmount = 0,
  style,
}: BankDeckCardProps): JSX.Element => {
  const identity = getBankIdentity(bankName);
  const isPositivePercentage = percentage > 0;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Tarjeta ${bankName}, saldo ${
        isHidden ? 'oculto' : `${currencySymbol} ${formatAmount(balance)}`
      }`}
    >
      {/* Tira vertical interior con el color de la marca bancaria */}
      <View
        style={[styles.neonAccentBar, { backgroundColor: identity.color }]}
      />

      <View style={styles.cardContent}>
        {/* Fila superior: squircle del icono, nombre del banco y badge de porcentaje */}
        <View style={styles.topRow}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: hexToRgba(identity.color, 0.12),
                borderColor: hexToRgba(identity.color, 0.25),
              },
            ]}
          >
            <Ionicons name={identity.icon} size={15} color={identity.color} />
          </View>

          <Text style={styles.bankName} numberOfLines={1} ellipsizeMode="tail">
            {bankName}
          </Text>

          {isPositivePercentage ? (
            <View style={styles.percentageBadge}>
              <Text style={styles.percentageText}>
                {formatPercentage(percentage)}
              </Text>
            </View>
          ) : (
            <Text style={styles.zeroPercentageText}>
              {formatPercentage(percentage)}
            </Text>
          )}
        </View>

        {/* Cuerpo: Saldo prominente y micro-chip de custodia */}
        <View style={styles.bottomSection}>
          <Text
            style={[
              styles.balanceValue,
              isHidden && styles.balanceValueHidden,
            ]}
            numberOfLines={1}
          >
            {isHidden ? '••••••' : `${currencySymbol} ${formatAmount(balance)}`}
          </Text>

          {custodyAmount > 0 && (
            <View style={styles.custodyPill}>
              <Ionicons
                name="shield-checkmark"
                size={11}
                color="#FF9F0A"
              />
              <Text style={styles.custodyText} numberOfLines={1}>
                {isHidden
                  ? 'Custodia: ••••••'
                  : `Custodia: ${currencySymbol} ${formatAmount(custodyAmount)}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const AddBankDeckCard = ({
  onPress,
  style,
}: AddBankDeckCardProps): JSX.Element => {
  return (
    <TouchableOpacity
      style={[styles.addCard, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Vincular Cuenta"
    >
      <View style={styles.addSquircle}>
        <Ionicons name="add" size={18} color="#00FFA3" />
      </View>
      <Text style={styles.addTitle}>Vincular Cuenta</Text>
      <Text style={styles.addSubtext}>+ Añadir entidad</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 175,
    minHeight: 110,
    backgroundColor: '#18181A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'space-between',
  },
  neonAccentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  percentageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  percentageText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  zeroPercentageText: {
    fontSize: 10,
    color: '#6E6E73',
  },
  bottomSection: {
    marginTop: 8,
  },
  balanceValue: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  balanceValueHidden: {
    fontSize: 19,
    letterSpacing: 2,
    color: '#6E6E73',
  },
  custodyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderColor: 'rgba(255, 159, 10, 0.22)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  custodyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  addCard: {
    width: 175,
    minHeight: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  addSquircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00FFA3',
    marginTop: 6,
    textAlign: 'center',
  },
  addSubtext: {
    fontSize: 10,
    color: '#6E6E73',
    marginTop: 2,
    textAlign: 'center',
  },
});

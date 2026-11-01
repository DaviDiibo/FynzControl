import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { FriendLoan } from '../../store/debts-store';
import type { Bank } from '../../store/cards-store';

export type FriendLoanCollectionData = {
  amount: number;
  bankId?: string;
};

export type FriendLoanCollectionModalProps = {
  visible: boolean;
  debt?: FriendLoan | null;
  loan?: FriendLoan | null;
  onClose: () => void;
  onConfirmCollection: (amount: number, bankId?: string) => void;
  banks: Bank[];
  currencySymbol?: string;
  currency?: string;
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const FriendLoanCollectionModal = ({
  visible,
  debt,
  loan,
  onClose,
  onConfirmCollection,
  banks,
  currencySymbol,
  currency,
}: FriendLoanCollectionModalProps): JSX.Element => {
  const symbol = currencySymbol ?? currency ?? '$';
  const currentLoan = debt ?? loan ?? null;

  const [customAbonoAmount, setCustomAbonoAmount] = useState<string>('');
  const [abonoError, setAbonoError] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(
    () => (banks.length > 0 ? banks[0].id : null)
  );

  useEffect(() => {
    if (visible && currentLoan) {
      setCustomAbonoAmount('');
      setAbonoError(null);
      setSelectedBankId(banks.length > 0 ? banks[0].id : null);
    }
  }, [visible, currentLoan, banks]);

  const handleAbonoAmountChange = (text: string): void => {
    let val = text.replace(',', '.');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setCustomAbonoAmount(val);

    if (!val.trim()) {
      setAbonoError(null);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setAbonoError('Ingresa un monto válido mayor a 0');
    } else if (currentLoan && num > currentLoan.remainingAmount) {
      setAbonoError(
        `El monto no puede superar ${symbol}${formatAmount(currentLoan.remainingAmount)} restantes`
      );
    } else {
      setAbonoError(null);
    }
  };

  const handleSetFiftyPercent = (): void => {
    if (!currentLoan) return;
    const half = (currentLoan.remainingAmount / 2).toFixed(2);
    setCustomAbonoAmount(half);
    setAbonoError(null);
  };

  const handleSetFullAmount = (): void => {
    if (!currentLoan) return;
    const full = currentLoan.remainingAmount.toFixed(2);
    setCustomAbonoAmount(full);
    setAbonoError(null);
  };

  const handleConfirmAbono = (): void => {
    if (!currentLoan) return;
    const parsedAmount = parseFloat(customAbonoAmount);
    if (
      abonoError ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > currentLoan.remainingAmount
    ) {
      return;
    }

    onConfirmCollection(parsedAmount, selectedBankId || undefined);
  };

  const parsedAbonoAmount = parseFloat(customAbonoAmount);
  const isConfirmDisabled =
    !currentLoan ||
    Boolean(abonoError) ||
    isNaN(parsedAbonoAmount) ||
    parsedAbonoAmount <= 0 ||
    parsedAbonoAmount > (currentLoan?.remainingAmount ?? 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardAvoiding}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.abonoCard}
            onPress={(e) => {
              e.stopPropagation?.();
            }}
          >
            {/* Cabecera */}
            <View style={styles.abonoHeader}>
              <View style={styles.abonoBadge}>
                <Ionicons name="cash-outline" size={16} color="#00FFA3" />
                <Text style={styles.abonoBadgeText}>REGISTRAR ABONO</Text>
              </View>
              <TouchableOpacity
                style={styles.abonoCloseButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Subtítulo informativo */}
            <View style={styles.abonoInfoContainer}>
              <Text style={styles.abonoFriendName}>
                {currentLoan?.friendName}
              </Text>
              <Text style={styles.abonoRemainingText}>
                Resta por cobrar: {symbol}{formatAmount(currentLoan?.remainingAmount ?? 0)}
              </Text>
            </View>

            {/* Campo de entrada */}
            <View
              style={[
                styles.abonoInputContainer,
                Boolean(abonoError) && styles.abonoInputContainerError,
              ]}
            >
              <Text style={styles.abonoCurrencySymbol}>{symbol}</Text>
              <TextInput
                style={styles.abonoInput}
                value={customAbonoAmount}
                onChangeText={handleAbonoAmountChange}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Error si aplica */}
            {Boolean(abonoError) && (
              <View style={styles.abonoErrorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#FF453A" />
                <Text style={styles.abonoErrorText}>{abonoError}</Text>
              </View>
            )}

            {/* Píldoras de monto rápido */}
            <View style={styles.abonoPillsRow}>
              <TouchableOpacity
                style={styles.abonoPill}
                activeOpacity={0.7}
                onPress={handleSetFiftyPercent}
              >
                <Text style={styles.abonoPillText}>
                  50% ({symbol}{formatAmount((currentLoan?.remainingAmount ?? 0) / 2)})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.abonoPill}
                activeOpacity={0.7}
                onPress={handleSetFullAmount}
              >
                <Text style={styles.abonoPillText}>
                  Liquidar Total ({symbol}{formatAmount(currentLoan?.remainingAmount ?? 0)})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de cuenta bancaria */}
            <View style={styles.modalBankSelectorSection}>
              <Text style={styles.modalBankSelectorLabel}>¿A QUÉ CUENTA INGRESÓ EL PAGO?</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalBankPillsRow}
              >
                <TouchableOpacity
                  style={[
                    styles.modalBankPill,
                    selectedBankId === null && styles.modalBankPillActive,
                  ]}
                  onPress={() => setSelectedBankId(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="cash-outline"
                    size={13}
                    color={selectedBankId === null ? '#00FFA3' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modalBankPillText,
                      selectedBankId === null && styles.modalBankPillTextActive,
                    ]}
                  >
                    Efectivo en mano
                  </Text>
                </TouchableOpacity>
                {banks.map((b) => {
                  const isSelected = selectedBankId === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.modalBankPill,
                        isSelected && styles.modalBankPillActive,
                      ]}
                      onPress={() => setSelectedBankId(b.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="business-outline"
                        size={13}
                        color={isSelected ? '#00FFA3' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.modalBankPillText,
                          isSelected && styles.modalBankPillTextActive,
                        ]}
                      >
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Botón confirmar */}
            <TouchableOpacity
              style={[
                styles.abonoConfirmButton,
                { backgroundColor: isConfirmDisabled ? '#2C2C2E' : colors.primary },
              ]}
              activeOpacity={0.8}
              disabled={isConfirmDisabled}
              onPress={handleConfirmAbono}
            >
              <Text
                style={[
                  styles.abonoConfirmButtonText,
                  { color: isConfirmDisabled ? '#8E8E93' : '#121212' },
                ]}
              >
                CONFIRMAR ABONO
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboardAvoiding: {
    width: '100%',
    alignItems: 'center',
  },
  abonoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  abonoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  abonoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  abonoBadgeText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  abonoCloseButton: {
    padding: 4,
  },
  abonoInfoContainer: {
    gap: 4,
  },
  abonoFriendName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  abonoRemainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64D2FF',
  },
  abonoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  abonoInputContainerError: {
    borderColor: '#FF453A',
  },
  abonoCurrencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00FFA3',
  },
  abonoInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    padding: 0,
  },
  abonoErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  abonoErrorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  abonoPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  abonoPill: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abonoPillText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBankSelectorSection: {
    marginTop: 12,
    marginBottom: 6,
  },
  modalBankSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalBankPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  modalBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 6,
  },
  modalBankPillActive: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  modalBankPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalBankPillTextActive: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  abonoConfirmButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  abonoConfirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

export default FriendLoanCollectionModal;

import React, { useState, useEffect, useMemo } from 'react';
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
import type { PersonalDebt } from '../../store/debts-store';
import type { Bank } from '../../store/cards-store';

export type PersonalDebtPaymentData = {
  amount: number;
  mode: 'next' | 'last';
  installmentsCount: number;
  nominalAmountExtinguished: number;
  discountSaved: number;
  bankId?: string;
};

export type PersonalDebtPaymentModalProps = {
  visible: boolean;
  debt: PersonalDebt | null;
  onClose: () => void;
  onConfirmPayment: (paymentData: PersonalDebtPaymentData) => void;
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

const PersonalDebtPaymentModal = ({
  visible,
  debt,
  onClose,
  onConfirmPayment,
  banks,
  currencySymbol,
  currency,
}: PersonalDebtPaymentModalProps): JSX.Element => {
  const symbol = currencySymbol ?? currency ?? '$';

  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'next' | 'last'>('next');
  const [lastInstallmentsCount, setLastInstallmentsCount] = useState<number>(1);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(
    () => (banks.length > 0 ? banks[0].id : null)
  );

  useEffect(() => {
    if (visible && debt) {
      setMode('next');
      setLastInstallmentsCount(1);
      if (debt.monthlyPayment && debt.monthlyPayment > 0) {
        setAmount(Math.min(debt.monthlyPayment, debt.remainingAmount).toFixed(2));
      } else {
        setAmount('');
      }
      setError(null);
      setSelectedBankId(banks.length > 0 ? banks[0].id : null);
    }
  }, [visible, debt, banks]);

  const maxRemainingInstallments = useMemo((): number => {
    if (!debt) return 1;
    if (debt.totalInstallments && debt.totalInstallments > 0) {
      return Math.max(
        1,
        debt.totalInstallments - (debt.paidInstallments || 0)
      );
    }
    return 12;
  }, [debt]);

  const handleSelectMode = (newMode: 'next' | 'last'): void => {
    setMode(newMode);
    const targetCount = newMode === 'last' ? lastInstallmentsCount : 1;
    if (debt?.monthlyPayment && debt.monthlyPayment > 0) {
      const nominal = Math.min(
        debt.monthlyPayment * targetCount,
        debt.remainingAmount
      );
      setAmount(nominal.toFixed(2));
      setError(null);
    }
  };

  const handleChangeLastInstallmentsCount = (delta: number): void => {
    const nextCount = Math.max(
      1,
      Math.min(maxRemainingInstallments, lastInstallmentsCount + delta)
    );
    setLastInstallmentsCount(nextCount);
    if (debt?.monthlyPayment && debt.monthlyPayment > 0) {
      const nominal = Math.min(
        debt.monthlyPayment * nextCount,
        debt.remainingAmount
      );
      setAmount(nominal.toFixed(2));
      setError(null);
    }
  };

  const handleAmountChange = (text: string): void => {
    let val = text.replace(',', '.');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setAmount(val);

    if (!val.trim()) {
      setError(null);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setError('Ingresa un monto válido mayor a 0');
    } else if (debt && num > debt.remainingAmount) {
      setError(
        `El monto no puede superar ${symbol}${formatAmount(debt.remainingAmount)} restantes`
      );
    } else {
      setError(null);
    }
  };

  const handleSetSuggestedInstallment = (): void => {
    if (!debt || !debt.monthlyPayment) return;
    const count = mode === 'last' ? lastInstallmentsCount : 1;
    const val = Math.min(
      debt.monthlyPayment * count,
      debt.remainingAmount
    ).toFixed(2);
    setAmount(val);
    setError(null);
  };

  const handleSetFullDebtPayment = (): void => {
    if (!debt) return;
    setAmount(debt.remainingAmount.toFixed(2));
    setError(null);
  };

  const handleConfirm = (): void => {
    if (!debt) return;
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (
      error ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > debt.remainingAmount
    ) {
      return;
    }

    const count = mode === 'last' ? lastInstallmentsCount : 1;
    const nominalQuotaValue =
      debt.monthlyPayment && debt.monthlyPayment > 0
        ? Math.min(
            debt.remainingAmount,
            Number((debt.monthlyPayment * count).toFixed(2))
          )
        : parsedAmount;
    const effectiveNominal = Math.max(parsedAmount, nominalQuotaValue);
    const discountSaved = Math.max(0, Number((effectiveNominal - parsedAmount).toFixed(2)));

    onConfirmPayment({
      amount: parsedAmount,
      mode,
      installmentsCount: count,
      nominalAmountExtinguished: effectiveNominal,
      discountSaved,
      bankId: selectedBankId || undefined,
    });
  };

  const parsedDebtAmount = parseFloat(amount);
  const isDebtPaymentDisabled =
    !debt ||
    Boolean(error) ||
    isNaN(parsedDebtAmount) ||
    parsedDebtAmount <= 0 ||
    parsedDebtAmount > (debt?.remainingAmount ?? 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.debtModalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalKeyboardAvoiding}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.debtPaymentCard}
            onPress={(e) => {
              e.stopPropagation?.();
            }}
          >
            {/* Cabecera */}
            <View style={styles.debtPaymentHeader}>
              <View style={styles.debtPaymentBadge}>
                <Ionicons name="card-outline" size={16} color="#00FFA3" />
                <Text style={styles.debtPaymentBadgeText}>REGISTRAR PAGO DE DEUDA</Text>
              </View>
              <TouchableOpacity
                style={styles.debtPaymentCloseButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Subtítulo */}
            <View style={styles.debtPaymentInfoContainer}>
              <Text style={styles.debtPaymentTitle} numberOfLines={1}>
                {debt?.title}
                {debt?.entity ? ` (${debt.entity})` : ''}
              </Text>
              <Text style={styles.debtPaymentRemainingText}>
                Resta por pagar: {symbol}{formatAmount(debt?.remainingAmount ?? 0)}
              </Text>
            </View>

            {/* Selector de Modalidad de Pago */}
            <View style={styles.debtModeTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.debtModeTab,
                  mode === 'next' && styles.debtModeTabActive,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectMode('next')}
              >
                <Text
                  style={[
                    styles.debtModeTabText,
                    mode === 'next' && styles.debtModeTabTextActive,
                  ]}
                >
                  📅 Próxima Cuota
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.debtModeTab,
                  mode === 'last' && styles.debtModeTabActive,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectMode('last')}
              >
                <Text
                  style={[
                    styles.debtModeTabText,
                    mode === 'last' && styles.debtModeTabTextActive,
                  ]}
                >
                  ⏭️ Última(s) Cuota(s)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de cantidad de últimas cuotas si mode === 'last' */}
            {mode === 'last' && (
              <View style={styles.lastInstallmentsSelectorBox}>
                <View style={styles.lastInstallmentsCounterRow}>
                  <Text style={styles.lastInstallmentsLabel}>Cantidad de últimas cuotas:</Text>
                  <View style={styles.lastInstallmentsControls}>
                    <TouchableOpacity
                      style={[
                        styles.lastInstallmentStepBtn,
                        lastInstallmentsCount <= 1 && styles.lastInstallmentStepBtnDisabled,
                      ]}
                      activeOpacity={0.7}
                      disabled={lastInstallmentsCount <= 1}
                      onPress={() => handleChangeLastInstallmentsCount(-1)}
                    >
                      <Ionicons
                        name="remove"
                        size={16}
                        color={lastInstallmentsCount <= 1 ? '#555' : '#00FFA3'}
                      />
                    </TouchableOpacity>
                    <Text style={styles.lastInstallmentsCountValue}>{lastInstallmentsCount}</Text>
                    <TouchableOpacity
                      style={[
                        styles.lastInstallmentStepBtn,
                        lastInstallmentsCount >= maxRemainingInstallments &&
                          styles.lastInstallmentStepBtnDisabled,
                      ]}
                      activeOpacity={0.7}
                      disabled={lastInstallmentsCount >= maxRemainingInstallments}
                      onPress={() => handleChangeLastInstallmentsCount(1)}
                    >
                      <Ionicons
                        name="add"
                        size={16}
                        color={
                          lastInstallmentsCount >= maxRemainingInstallments
                            ? '#555'
                            : '#00FFA3'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.lastInstallmentsSummaryText}>
                  Liquidando las últimas {lastInstallmentsCount} cuota(s) (del final hacia adelante)
                </Text>
                <Text style={styles.lastInstallmentsNoteText}>
                  📌 Tu próxima cuota del mes sigue pendiente en su fecha habitual.
                </Text>
              </View>
            )}

            {/* Input de monto */}
            <View
              style={[
                styles.debtPaymentInputContainer,
                Boolean(error) && styles.debtPaymentInputContainerError,
              ]}
            >
              <Text style={styles.debtPaymentCurrencySymbol}>{symbol}</Text>
              <TextInput
                style={styles.debtPaymentInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                autoFocus={true}
              />
            </View>

            {/* Mensaje de error si aplica */}
            {Boolean(error) && (
              <View style={styles.debtPaymentErrorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#FF453A" />
                <Text style={styles.debtPaymentErrorText}>{error}</Text>
              </View>
            )}

            {/* Desglose en Vivo de Descuento y % de Ahorro */}
            {(() => {
              const countForCalc = mode === 'last' ? lastInstallmentsCount : 1;
              const nominalQuotaValue = debt?.monthlyPayment
                ? Math.min(
                    debt.remainingAmount,
                    Number((debt.monthlyPayment * countForCalc).toFixed(2))
                  )
                : 0;
              const enteredPaidVal = parseFloat(amount.replace(',', '.')) || 0;
              if (nominalQuotaValue > 0 && enteredPaidVal > 0) {
                const savedAmount = Math.max(
                  0,
                  Number((nominalQuotaValue - enteredPaidVal).toFixed(2))
                );
                const savedPct =
                  nominalQuotaValue > 0
                    ? Number(((savedAmount / nominalQuotaValue) * 100).toFixed(1))
                    : 0;
                return (
                  <View style={styles.debtLiveDiscountBox}>
                    <Text style={styles.debtLiveDiscountLine}>
                      Valor integral que baja de tu deuda ({countForCalc}{' '}
                      {countForCalc === 1 ? 'cuota' : 'cuotas'}):{' '}
                      <Text style={styles.debtLiveDiscountBold}>
                        {symbol}{formatAmount(nominalQuotaValue)}
                      </Text>
                    </Text>
                    <Text style={styles.debtLiveDiscountLine}>
                      Pago real que sale de tu cuenta:{' '}
                      <Text style={styles.debtLiveDiscountBold}>
                        {symbol}{formatAmount(enteredPaidVal)}
                      </Text>
                    </Text>
                    {savedAmount > 0 && (
                      <Text style={styles.debtLiveDiscountHighlightNeon}>
                        ✨ Descuento / Ahorro: {symbol}{formatAmount(savedAmount)} ({savedPct}% de ahorro)
                      </Text>
                    )}
                  </View>
                );
              }
              return null;
            })()}

            {/* Píldoras de selección rápida */}
            <View style={styles.debtPaymentPillsRow}>
              {debt?.monthlyPayment && debt.monthlyPayment > 0 ? (
                <TouchableOpacity
                  style={styles.debtPaymentPill}
                  activeOpacity={0.7}
                  onPress={handleSetSuggestedInstallment}
                >
                  <Text style={styles.debtPaymentPillText}>
                    {mode === 'last' && lastInstallmentsCount > 1
                      ? `${lastInstallmentsCount} cuotas (${symbol}${formatAmount(
                          Math.min(
                            debt.monthlyPayment * lastInstallmentsCount,
                            debt.remainingAmount
                          )
                        )})`
                      : `Cuota sugerida (${symbol}${formatAmount(
                          Math.min(
                            debt.monthlyPayment,
                            debt.remainingAmount
                          )
                        )})`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.debtPaymentPill}
                activeOpacity={0.7}
                onPress={handleSetFullDebtPayment}
              >
                <Text style={styles.debtPaymentPillText}>
                  Liquidar Total ({symbol}{formatAmount(debt?.remainingAmount ?? 0)})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de cuenta bancaria */}
            <View style={styles.modalBankSelectorSection}>
              <Text style={styles.modalBankSelectorLabel}>¿DE QUÉ CUENTA BANCARIA SE DEBITÓ EL PAGO?</Text>
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

            {/* Mensaje informativo sutil */}
            <View style={styles.debtPaymentHintContainer}>
              <Text style={styles.debtPaymentHintText}>
                💡 Este pago se registrará como gasto en tu historial de Movimientos. Si fue un error, puedes eliminarlo allí para restaurar el saldo de tu deuda automáticamente.
              </Text>
            </View>

            {/* Botón confirmar */}
            <TouchableOpacity
              style={[
                styles.debtPaymentConfirmButton,
                { backgroundColor: isDebtPaymentDisabled ? '#2C2C2E' : '#00FFA3' },
              ]}
              activeOpacity={0.8}
              disabled={isDebtPaymentDisabled}
              onPress={handleConfirm}
            >
              <Text
                style={[
                  styles.debtPaymentConfirmButtonText,
                  { color: isDebtPaymentDisabled ? '#8E8E93' : '#121212' },
                ]}
              >
                CONFIRMAR PAGO
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalKeyboardAvoiding: {
    width: '100%',
    alignItems: 'center',
  },
  debtModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debtPaymentCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  debtPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtPaymentBadge: {
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
  debtPaymentBadgeText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  debtPaymentCloseButton: {
    padding: 4,
  },
  debtPaymentInfoContainer: {
    gap: 4,
  },
  debtPaymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  debtPaymentRemainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6482',
  },
  debtModeTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#141416',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  debtModeTab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtModeTabActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.4)',
  },
  debtModeTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  debtModeTabTextActive: {
    color: '#00FFA3',
    fontWeight: '800',
  },
  lastInstallmentsSelectorBox: {
    backgroundColor: 'rgba(100, 210, 255, 0.06)',
    borderColor: 'rgba(100, 210, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  lastInstallmentsCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastInstallmentsLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lastInstallmentsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lastInstallmentStepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastInstallmentStepBtnDisabled: {
    backgroundColor: '#242426',
    borderColor: '#333336',
  },
  lastInstallmentsCountValue: {
    color: '#00FFA3',
    fontSize: 15,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  lastInstallmentsSummaryText: {
    color: '#64D2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  lastInstallmentsNoteText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  debtPaymentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  debtPaymentInputContainerError: {
    borderColor: '#FF453A',
  },
  debtPaymentCurrencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00FFA3',
  },
  debtPaymentInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
  },
  debtPaymentErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  debtPaymentErrorText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  debtLiveDiscountBox: {
    backgroundColor: 'rgba(0, 255, 163, 0.06)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  debtLiveDiscountLine: {
    color: '#D0D0D5',
    fontSize: 12,
  },
  debtLiveDiscountBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  debtLiveDiscountHighlightNeon: {
    color: '#00FFA3',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  debtPaymentPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  debtPaymentPill: {
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
  debtPaymentPillText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBankSelectorSection: {
    gap: 8,
  },
  modalBankSelectorLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalBankPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  modalBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modalBankPillActive: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
  },
  modalBankPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalBankPillTextActive: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  debtPaymentHintContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  debtPaymentHintText: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
  },
  debtPaymentConfirmButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  debtPaymentConfirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

export default PersonalDebtPaymentModal;

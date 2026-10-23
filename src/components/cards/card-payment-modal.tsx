import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useCardsStore, type CreditCard } from '../../store/cards-store';
import { useTransactionsStore } from '../../store/transactions-store';

type CardPaymentModalProps = {
  visible: boolean;
  card: CreditCard | null;
  monthDue: number;
  totalDue: number;
  onClose: () => void;
  onSuccess?: () => void;
};

const formatCurrency = (val: number): string => {
  return val.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const CardPaymentModal = ({
  visible,
  card,
  monthDue,
  totalDue,
  onClose,
  onSuccess,
}: CardPaymentModalProps): JSX.Element => {
  const [amount, setAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const banks = useCardsStore((state) => state.banks);
  const getBankComputedBalance = useTransactionsStore(
    (state) => state.getBankComputedBalance
  );
  const addTransaction = useTransactionsStore((state) => state.addTransaction);

  // Auto-seleccionar banco por defecto o por coincidencia con la tarjeta
  useEffect(() => {
    if (visible && banks.length > 0) {
      const matchingBank = banks.find(
        (b) =>
          card?.bankName &&
          b.name.toLowerCase().trim() === card.bankName.toLowerCase().trim()
      );
      setSelectedBankId(matchingBank ? matchingBank.id : banks[0].id);
      setAmount(monthDue > 0 ? monthDue.toString() : '');
      setValidationError(null);
    }
  }, [visible, card, banks, monthDue]);

  const selectedBank = banks.find((b) => b.id === selectedBankId);
  const selectedBankBalance = selectedBank
    ? getBankComputedBalance(selectedBank.id, selectedBank.initialBalance)
    : 0;

  const parsedAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const isOverBalance =
    selectedBank !== undefined &&
    parsedAmount > 0 &&
    parsedAmount > selectedBankBalance;

  const handleApplyShortcut = (value: number): void => {
    if (value <= 0) return;
    setAmount(value.toString());
    setValidationError(null);
  };

  const handleConfirmPayment = (): void => {
    if (!card) {
      setValidationError('No se ha especificado la tarjeta de crédito.');
      return;
    }

    if (!amount.trim() || parsedAmount <= 0) {
      setValidationError('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (!selectedBankId || !selectedBank) {
      setValidationError('Selecciona una cuenta bancaria de origen.');
      return;
    }

    if (parsedAmount > selectedBankBalance) {
      setValidationError(
        `Saldo insuficiente en ${selectedBank.name} ($${formatCurrency(selectedBankBalance)}).`
      );
      return;
    }

    // Determinar destino del abono contable
    let paymentTarget: 'statement' | 'partial' | 'total' = 'partial';
    if (parsedAmount === totalDue) {
      paymentTarget = 'total';
    } else if (parsedAmount === monthDue) {
      paymentTarget = 'statement';
    }

    // Registrar card_payment formal
    addTransaction({
      title: `Pago ${card.name}`,
      amount: parsedAmount,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      paymentMethod: 'cash_debit',
      bankId: selectedBankId,
      cardId: card.id,
      cardName: card.name,
      paymentTarget,
      date: new Date().toISOString(),
    });

    // Limpiar estado y notificar éxito
    setAmount('');
    setValidationError(null);
    onSuccess?.();
    onClose();
  };

  const paymentDayDisplay = card?.paymentDay
    ? `Día ${card.paymentDay}`
    : card?.cutOffDay
      ? `Corte día ${card.cutOffDay}`
      : 'No definido';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Cerrar modal"
          accessibilityRole="button"
        />

        <View style={styles.modalContent}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="card-outline" size={20} color="#0A84FF" />
            </View>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>PAGAR TARJETA</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {card?.name ?? 'Tarjeta'} • {card?.bankName ?? 'Entidad'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* HUD de Resumen Contable */}
            <View style={styles.hudContainer}>
              <View style={[styles.hudCard, styles.hudCardActive]}>
                <View style={styles.hudCardHeader}>
                  <Ionicons name="calendar-outline" size={13} color="#0A84FF" />
                  <Text style={styles.hudLabel}>A PAGAR ESTE MES</Text>
                </View>
                <Text style={styles.hudAmount}>
                  ${formatCurrency(monthDue)}
                </Text>
                <Text style={styles.hudSubtitle}>
                  Vence: {paymentDayDisplay}
                </Text>
              </View>

              <View style={styles.hudCard}>
                <View style={styles.hudCardHeader}>
                  <Ionicons name="pie-chart-outline" size={13} color={colors.primary} />
                  <Text style={styles.hudLabel}>DEUDA DIFERIDA</Text>
                </View>
                <Text style={[styles.hudAmount, { color: colors.primary }]}>
                  ${formatCurrency(totalDue)}
                </Text>
                <Text style={styles.hudSubtitle}>Total acumulado</Text>
              </View>
            </View>

            {/* Atajos Rápidos de Monto */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ATAJOS DE PAGO</Text>
              <View style={styles.shortcutsRow}>
                <TouchableOpacity
                  style={[
                    styles.shortcutPill,
                    parsedAmount === monthDue && monthDue > 0
                      ? styles.shortcutPillActive
                      : styles.shortcutPillInactive,
                  ]}
                  onPress={() => handleApplyShortcut(monthDue)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      parsedAmount === monthDue && monthDue > 0
                        ? styles.shortcutTextActive
                        : styles.shortcutTextInactive,
                    ]}
                  >
                    Mes Completo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shortcutPill,
                    parsedAmount === Math.round(monthDue / 2) && monthDue > 0
                      ? styles.shortcutPillActive
                      : styles.shortcutPillInactive,
                  ]}
                  onPress={() => handleApplyShortcut(Math.round(monthDue / 2))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      parsedAmount === Math.round(monthDue / 2) && monthDue > 0
                        ? styles.shortcutTextActive
                        : styles.shortcutTextInactive,
                    ]}
                  >
                    50% del Mes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shortcutPill,
                    parsedAmount === totalDue && totalDue > 0
                      ? styles.shortcutPillActive
                      : styles.shortcutPillInactive,
                  ]}
                  onPress={() => handleApplyShortcut(totalDue)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      parsedAmount === totalDue && totalDue > 0
                        ? styles.shortcutTextActive
                        : styles.shortcutTextInactive,
                    ]}
                  >
                    Deuda Total
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Input de Importe */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MONTO A DEBITAR</Text>
              <View
                style={[
                  styles.inputContainer,
                  isOverBalance ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    setValidationError(null);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#555"
                  accessibilityLabel="Monto a pagar"
                />
                {amount.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearInputButton}
                    onPress={() => {
                      setAmount('');
                      setValidationError(null);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Selector de Cuentas Bancarias */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CUENTA BANCARIA DE ORIGEN</Text>
              {banks.length === 0 ? (
                <View style={styles.noBanksCard}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.noBanksText}>
                    No hay bancos registrados. Agrega uno en Tarjetas y Bancos.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.banksScroll}
                >
                  {banks.map((b) => {
                    const balance = getBankComputedBalance(
                      b.id,
                      b.initialBalance
                    );
                    const isSelected = selectedBankId === b.id;
                    const insufficient =
                      isSelected && parsedAmount > 0 && parsedAmount > balance;

                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.bankCard,
                          isSelected ? styles.bankCardSelected : styles.bankCardUnselected,
                          insufficient ? styles.bankCardInsufficient : null,
                        ]}
                        onPress={() => {
                          setSelectedBankId(b.id);
                          setValidationError(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.bankTopRow}>
                          <Ionicons
                            name="business-outline"
                            size={16}
                            color={isSelected ? '#0A84FF' : colors.textSecondary}
                          />
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color={insufficient ? colors.error : '#00FFA3'}
                            />
                          )}
                        </View>
                        <Text style={styles.bankName} numberOfLines={1}>
                          {b.name}
                        </Text>
                        <Text
                          style={[
                            styles.bankBalance,
                            insufficient ? { color: colors.error } : null,
                          ]}
                        >
                          ${formatCurrency(balance)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Mensajes de Validación Inline (Cero Alerts nativos) */}
            {validationError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : isOverBalance ? (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>
                  Saldo insuficiente en {selectedBank?.name} ($
                  {formatCurrency(selectedBankBalance)}).
                </Text>
              </View>
            ) : null}

            {/* Botón de Confirmación Cyberpunk */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!card || parsedAmount <= 0 || isOverBalance)
                  ? styles.confirmButtonDisabled
                  : styles.confirmButtonActive,
              ]}
              onPress={handleConfirmPayment}
              disabled={!card || parsedAmount <= 0 || isOverBalance}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Confirmar pago de tarjeta"
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={!card || parsedAmount <= 0 || isOverBalance ? '#666' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.confirmButtonText,
                  (!card || parsedAmount <= 0 || isOverBalance)
                    ? styles.confirmButtonTextDisabled
                    : styles.confirmButtonTextActive,
                ]}
              >
                Confirmar Pago • ${formatCurrency(parsedAmount)}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 16,
  },
  hudContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  hudCard: {
    flex: 1,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  hudCardActive: {
    borderColor: 'rgba(10, 132, 255, 0.35)',
    backgroundColor: 'rgba(10, 132, 255, 0.06)',
  },
  hudCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  hudAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A84FF',
  },
  hudSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shortcutPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutPillActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderColor: '#0A84FF',
  },
  shortcutPillInactive: {
    backgroundColor: '#161616',
    borderColor: '#2A2A2A',
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutTextActive: {
    color: '#0A84FF',
    fontWeight: '700',
  },
  shortcutTextInactive: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputContainerError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(255, 69, 58, 0.06)',
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  clearInputButton: {
    padding: 4,
  },
  banksScroll: {
    gap: 10,
    paddingRight: 10,
  },
  bankCard: {
    width: 140,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  bankCardSelected: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
  },
  bankCardUnselected: {
    borderColor: '#2A2A2A',
  },
  bankCardInsufficient: {
    borderColor: colors.error,
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
  },
  bankTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  bankBalance: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  noBanksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
  },
  noBanksText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 4,
  },
  confirmButtonActive: {
    backgroundColor: '#0A84FF',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#333333',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmButtonTextActive: {
    color: '#FFFFFF',
  },
  confirmButtonTextDisabled: {
    color: '#666666',
  },
});

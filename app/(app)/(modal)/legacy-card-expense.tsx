import React, { useState, useMemo, useEffect } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { useCardsStore, type CreditCard } from '../../../src/store/cards-store';
import { useDebtsStore } from '../../../src/store/debts-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { getInstallmentProgressInfo } from '../../../src/utils/date-helpers';

const LegacyCardExpenseModal = (): JSX.Element => {
  const router = useRouter();

  // Stores
  const cards = useCardsStore((state) => state.cards);
  const addPersonalDebt = useDebtsStore((state) => state.addPersonalDebt);
  const currencyCode = useSettingsStore((state) => state.currency);

  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  // Selección de Tarjeta (preselecciona default o primera)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => {
    const defaultCard = cards.find((c) => c.isDefault);
    return defaultCard?.id ?? cards[0]?.id ?? null;
  });

  // Si se añade una tarjeta mientras el modal está abierto y no había seleccionada
  useEffect(() => {
    if (!selectedCardId && cards.length > 0) {
      const defaultCard = cards.find((c) => c.isDefault);
      setSelectedCardId(defaultCard?.id ?? cards[0]?.id ?? null);
    }
  }, [cards, selectedCardId]);

  const selectedCard = useMemo((): CreditCard | undefined => {
    return cards.find((c) => c.id === selectedCardId);
  }, [cards, selectedCardId]);

  // Estados del Formulario
  const [concept, setConcept] = useState<string>('');
  const [totalAmountInput, setTotalAmountInput] = useState<string>('');
  const [totalInstallmentsInput, setTotalInstallmentsInput] = useState<string>('12');
  const [paidInstallmentsInput, setPaidInstallmentsInput] = useState<string>('0');
  const [monthlyPaymentInput, setMonthlyPaymentInput] = useState<string>('');
  const [isMonthlyManuallyEdited, setIsMonthlyManuallyEdited] = useState<boolean>(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);

  // Normalización de texto numérico (coma a punto, sólo dígitos y un punto)
  const sanitizeDecimal = (text: string): string => {
    let sanitized = text.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = `${parts[0]}.${parts.slice(1).join('')}`;
    }
    return sanitized;
  };

  const sanitizeInteger = (text: string): string => {
    return text.replace(/[^0-9]/g, '');
  };

  // Recálculo automático de cuota mensual si no ha sido editada manualmente
  const recomputeMonthlyIfAuto = (totalStr: string, totalInstStr: string): void => {
    if (isMonthlyManuallyEdited) return;
    const total = parseFloat(totalStr);
    const installments = parseInt(totalInstStr, 10);
    if (!isNaN(total) && total > 0 && !isNaN(installments) && installments > 0) {
      const autoQuota = (total / installments).toFixed(2);
      setMonthlyPaymentInput(autoQuota);
    }
  };

  const handleTotalAmountChange = (text: string): void => {
    const sanitized = sanitizeDecimal(text);
    setTotalAmountInput(sanitized);
    recomputeMonthlyIfAuto(sanitized, totalInstallmentsInput);
  };

  const handleTotalInstallmentsChange = (text: string): void => {
    const sanitized = sanitizeInteger(text);
    setTotalInstallmentsInput(sanitized);
    recomputeMonthlyIfAuto(totalAmountInput, sanitized);
  };

  const handlePaidInstallmentsChange = (text: string): void => {
    const sanitized = sanitizeInteger(text);
    setPaidInstallmentsInput(sanitized);
  };

  const handleMonthlyPaymentChange = (text: string): void => {
    const sanitized = sanitizeDecimal(text);
    setIsMonthlyManuallyEdited(true);
    setMonthlyPaymentInput(sanitized);
  };

  // Parsing y cálculos
  const parsedTotal = parseFloat(totalAmountInput) || 0;
  const parsedTotalInst = parseInt(totalInstallmentsInput, 10) || 0;
  const parsedPaidInst = parseInt(paidInstallmentsInput, 10) || 0;
  const parsedMonthly = parseFloat(monthlyPaymentInput) || 0;

  const progressInfo = getInstallmentProgressInfo(parsedTotalInst, parsedPaidInst);
  const remainingInstallments = progressInfo.remainingInstallments;
  const deferredBalance = Math.max(0, remainingInstallments * parsedMonthly);

  // Validación
  const validationError = useMemo((): string | null => {
    if (!selectedCard) {
      return 'Debes seleccionar una tarjeta de crédito para vincular la compra.';
    }
    if (!concept.trim()) {
      return 'Ingresa el concepto de la compra (ej. Televisor Samsung 55).';
    }
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      return 'Ingresa un monto total original válido mayor a 0.';
    }
    if (isNaN(parsedTotalInst) || parsedTotalInst <= 0) {
      return 'El total de cuotas pactadas debe ser de al menos 1.';
    }
    if (isNaN(parsedPaidInst) || parsedPaidInst < 0) {
      return 'Las cuotas pagadas no pueden ser un valor negativo.';
    }
    if (parsedPaidInst > parsedTotalInst) {
      return 'Las cuotas pagadas no pueden ser mayores al total de cuotas pactadas.';
    }
    if (isNaN(parsedMonthly) || parsedMonthly <= 0) {
      return 'La cuota mensual a pagar debe ser mayor a 0.';
    }
    return null;
  }, [
    selectedCard,
    concept,
    parsedTotal,
    parsedTotalInst,
    parsedPaidInst,
    parsedMonthly,
  ]);

  const handleSave = (): void => {
    setHasAttemptedSubmit(true);
    if (validationError || !selectedCard) {
      return;
    }

    const dueDay = selectedCard.paymentDay ?? 5;
    const remainingAmount = Math.max(0, (parsedTotalInst - parsedPaidInst) * parsedMonthly);
    const isSettled = remainingAmount <= 0;

    addPersonalDebt({
      title: concept.trim(),
      entity: selectedCard.bankName || selectedCard.name,
      category: 'credit_card',
      debtType: 'credit_card',
      cardPaymentType: 'installments',
      cardId: selectedCard.id,
      totalAmount: parsedTotal,
      remainingAmount,
      totalInstallments: parsedTotalInst,
      paidInstallments: parsedPaidInst,
      monthlyPayment: parsedMonthly,
      dueDay,
      dueDate: `Día ${dueDay} de cada mes`,
      isPreexisting: true,
      settled: isSettled,
      icon: 'card-outline',
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
      >
        {/* Cabecera Cyberpunk */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>COMPRA HISTÓRICA EN TARJETA</Text>
            <Text style={styles.subtitle}>Calibrar cuotas preexistentes</Text>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Banner de Ayuda / Contexto */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#0A84FF" />
            <Text style={styles.infoBannerText}>
              Esta función te permite ingresar compras a cuotas de meses pasados sin registrar gastos hoy. Solo calibra el saldo diferido y la cuota mensual a pagar en tu tarjeta.
            </Text>
          </View>

          {/* Selector de Tarjeta de Crédito */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="card-outline" size={16} color="#0A84FF" />
              <Text style={styles.sectionLabel}>TARJETA DE CRÉDITO ASOCIADA</Text>
            </View>

            {cards.length === 0 ? (
              <View style={styles.noCardsContainer}>
                <Ionicons name="alert-circle-outline" size={32} color="#FF9F0A" />
                <Text style={styles.noCardsTitle}>Sin tarjetas registradas</Text>
                <Text style={styles.noCardsSubtitle}>
                  Para calibrar una compra histórica necesitas al menos una tarjeta de crédito en el sistema.
                </Text>
                <TouchableOpacity
                  style={styles.createCardButton}
                  onPress={() => router.push('/(app)/(modal)/cards-overview' as any)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#00FFA3" />
                  <Text style={styles.createCardButtonText}>Gestionar / Crear Tarjeta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {cards.map((card) => {
                  const isSelected = card.id === selectedCardId;
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.cardOption,
                        isSelected && styles.cardOptionSelected,
                      ]}
                      onPress={() => setSelectedCardId(card.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardOptionLeft}>
                        <View
                          style={[
                            styles.cardIconWrap,
                            isSelected && styles.cardIconWrapSelected,
                          ]}
                        >
                          <Ionicons
                            name="card"
                            size={18}
                            color={isSelected ? '#00FFA3' : '#0A84FF'}
                          />
                        </View>
                        <View style={styles.cardInfo}>
                          <Text
                            style={[
                              styles.cardNameText,
                              isSelected && styles.cardNameTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {card.name}
                            {card.lastFourDigits ? ` •••• ${card.lastFourDigits}` : ''}
                          </Text>
                          <Text style={styles.cardBankText} numberOfLines={1}>
                            {card.bankName}
                          </Text>
                          <Text style={styles.cardDaysText}>
                            Pago: Día {card.paymentDay ?? 5} • Corte: Día {card.closingDay ?? 20}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Formulario de Entrada */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="create-outline" size={16} color="#00FFA3" />
              <Text style={[styles.sectionLabel, { color: '#00FFA3' }]}>
                DETALLES DE LA COMPRA
              </Text>
            </View>

            {/* Concepto */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONCEPTO DE LA COMPRA</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Televisor Samsung 55, Pasajes..."
                placeholderTextColor="#666666"
                value={concept}
                onChangeText={setConcept}
                maxLength={60}
              />
            </View>

            {/* Monto Total Original */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                MONTO TOTAL ORIGINAL ({currencySymbol})
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor="#666666"
                value={totalAmountInput}
                onChangeText={handleTotalAmountChange}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputHelper}>
                Valor total original de la factura al momento de comprar
              </Text>
            </View>

            {/* Fila doble: Total Cuotas y Cuotas Pagadas */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>TOTAL CUOTAS</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="12"
                  placeholderTextColor="#666666"
                  value={totalInstallmentsInput}
                  onChangeText={handleTotalInstallmentsChange}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>CUOTAS YA PAGADAS</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor="#666666"
                  value={paidInstallmentsInput}
                  onChangeText={handlePaidInstallmentsChange}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            {/* Cuota Mensual */}
            <View style={styles.inputGroup}>
              <View style={styles.quotaHeaderRow}>
                <Text style={styles.inputLabel}>
                  CUOTA MENSUAL APROXIMADA ({currencySymbol})
                </Text>
                {isMonthlyManuallyEdited && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsMonthlyManuallyEdited(false);
                      recomputeMonthlyIfAuto(totalAmountInput, totalInstallmentsInput);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetQuotaText}>Auto-calcular</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor="#666666"
                value={monthlyPaymentInput}
                onChangeText={handleMonthlyPaymentChange}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputHelper}>
                Calculado como (Total ÷ Cuotas). Ajustable si el banco cobra intereses o seguros.
              </Text>
            </View>
          </View>

          {/* HUD Reactivo en Vivo */}
          <View style={styles.hudCard}>
            <View style={styles.hudHeader}>
              <Ionicons name="pulse-outline" size={14} color="#00FFA3" />
              <Text style={styles.hudBadgeText}>CALIBRACIÓN EN VIVO</Text>
            </View>

            {/* Badge / Texto neón */}
            {parsedTotalInst > 0 && (
              <View style={styles.hudInstallmentBadge}>
                <Ionicons name="flash-outline" size={13} color="#00FFA3" />
                <Text style={styles.hudInstallmentBadgeText}>
                  Facturando {progressInfo.currentInstallmentLabel} este mes
                </Text>
              </View>
            )}

            <View style={styles.hudMetricsGrid}>
              <View style={styles.hudMetricItem}>
                <Text style={styles.hudMetricLabel}>Cuota mensual a pagar</Text>
                <Text style={styles.hudMetricValueGreen}>
                  {currencySymbol}
                  {parsedMonthly.toLocaleString('es-CO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <View style={styles.hudDividerVertical} />

              <View style={styles.hudMetricItem}>
                <Text style={styles.hudMetricLabel}>Cuotas restantes</Text>
                <Text style={styles.hudMetricValueBlue}>
                  {remainingInstallments} de {parsedTotalInst}
                </Text>
              </View>
            </View>

            <View style={styles.hudDividerHorizontal} />

            <View style={styles.hudTotalRow}>
              <Text style={styles.hudTotalLabel}>Saldo diferido remanente:</Text>
              <Text style={styles.hudTotalValue}>
                {currencySymbol}
                {deferredBalance.toLocaleString('es-CO', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Desglose */}
            <View style={styles.hudBreakdownRow}>
              <Text style={styles.hudBreakdownText}>
                {progressInfo.progressLabel} · Saldo diferido: {currencySymbol}{((parsedTotalInst - parsedPaidInst) * parsedMonthly).toLocaleString('es-CO')}
              </Text>
            </View>
          </View>

          {/* Mensaje de Validación Inline */}
          {hasAttemptedSubmit && validationError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#FF453A" />
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}

          {/* Botón de Guardado */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              hasAttemptedSubmit && Boolean(validationError) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Guardar Compra Histórica"
          >
            <Ionicons name="save-outline" size={20} color="#121212" />
            <Text style={styles.saveButtonText}>Guardar Compra Histórica</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#121212',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0A84FF',
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    padding: 16,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  noCardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  noCardsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noCardsSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 16,
  },
  createCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderWidth: 1,
    borderColor: '#00FFA3',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 6,
  },
  createCardButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
  },
  cardsList: {
    gap: 10,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 10,
    padding: 12,
  },
  cardOptionSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: '#0A84FF',
  },
  cardOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapSelected: {
    backgroundColor: 'rgba(0, 255, 163, 0.15)',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardNameTextSelected: {
    color: '#00FFA3',
  },
  cardBankText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cardDaysText: {
    fontSize: 10,
    color: '#666666',
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#0A84FF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A84FF',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  textInput: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  inputHelper: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quotaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetQuotaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
  },
  hudCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
    padding: 16,
    gap: 12,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00FFA3',
    letterSpacing: 1,
  },
  hudMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  hudMetricItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  hudMetricLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  hudMetricValueGreen: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00FFA3',
  },
  hudMetricValueBlue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A84FF',
  },
  hudDividerVertical: {
    width: 1,
    height: 32,
    backgroundColor: '#2C2C2E',
  },
  hudDividerHorizontal: {
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  hudTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudTotalLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  hudTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hudInstallmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hudInstallmentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
  },
  hudBreakdownRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  hudBreakdownText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FF453A',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00FFA3',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#121212',
    letterSpacing: 0.5,
  },
});

export default LegacyCardExpenseModal;

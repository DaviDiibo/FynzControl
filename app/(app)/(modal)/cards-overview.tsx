import React, { useState } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { useDebtsStore, type PersonalDebt } from '../../../src/store/debts-store';
import { useCardsStore, type CreditCard, type Bank } from '../../../src/store/cards-store';
import { useTransactionsStore } from '../../../src/store/transactions-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { DeleteCardModal } from '../../../src/components/cards/delete-card-modal';
import { DeleteBankModal } from '../../../src/components/cards/delete-bank-modal';
import { CardPaymentModal } from '../../../src/components/cards/card-payment-modal';
import { getCardBillingCycleDates } from '../../../src/utils/date-helpers';

const CardsOverviewModal = (): JSX.Element => {
  const router = useRouter();

  // Stores
  const personalDebts = useDebtsStore((state) => state.personalDebts);
  const thirdPartyCharges = useDebtsStore((state) => state.thirdPartyCharges);
  const transactions = useTransactionsStore((state) => state.transactions);
  const getBankComputedBalance = useTransactionsStore((state) => state.getBankComputedBalance);
  const getBankCustodyAmount = useTransactionsStore((state) => state.getBankCustodyAmount);
  const cards = useCardsStore((state) => state.cards);
  const banks = useCardsStore((state) => state.banks);
  const addCard = useCardsStore((state) => state.addCard);
  const addBank = useCardsStore((state) => state.addBank);
  const setBankBalance = useCardsStore((state) => state.setBankBalance);
  const deleteBank = useCardsStore((state) => state.deleteBank);
  const setDefaultCard = useCardsStore((state) => state.setDefaultCard);
  const deleteCard = useCardsStore((state) => state.deleteCard);
  const currencyCode = useSettingsStore((state) => state.currency);

  // Estado local para eliminación protegida de tarjeta
  const [cardPendingDelete, setCardPendingDelete] = useState<CreditCard | null>(null);

  // Estado local para eliminación protegida de banco
  const [bankPendingDelete, setBankPendingDelete] = useState<Bank | null>(null);

  // Estado local para modal de pago de tarjeta
  const [payingCard, setPayingCard] = useState<CreditCard | null>(null);

  // Estado para colapso/expansión de sección de bancos y registro rápido
  const [isCreatingBank, setIsCreatingBank] = useState<boolean>(false);
  const [newBankInput, setNewBankInput] = useState<string>('');
  const [newBankBalanceInput, setNewBankBalanceInput] = useState<string>('');
  const [bankInputError, setBankInputError] = useState<string | null>(null);
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  // Estado para edición inline de saldo de cuenta bancaria
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBalanceInput, setEditingBalanceInput] = useState<string>('');

  // Estados locales para el formulario de alta
  const [isAddingNewCard, setIsAddingNewCard] = useState<boolean>(false);
  const [newCardName, setNewCardName] = useState<string>('');
  const [selectedBankForNewCard, setSelectedBankForNewCard] = useState<string>(
    banks[0]?.name || 'Banco Santander'
  );
  const [newCardClosingDay, setNewCardClosingDay] = useState<string>('20');
  const [newCardPaymentDay, setNewCardPaymentDay] = useState<string>('5');
  const [newCardCreditLimit, setNewCardCreditLimit] = useState<string>('');
  const [newCardIsDefault, setNewCardIsDefault] = useState<boolean>(cards.length === 0);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState<boolean>(false);
  const [isAddingNewBankInline, setIsAddingNewBankInline] = useState<boolean>(false);
  const [newBankNameInline, setNewBankNameInline] = useState<string>('');

  const currencySymbol =
    currencyCode === 'EUR' ? '€' : currencyCode === 'BRL' ? 'R$' : '$';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // Sanitización de fechas del ciclo
  const handleClosingDayChange = (text: string): void => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setNewCardClosingDay('');
      return;
    }
    const num = parseInt(cleaned, 10);
    if (num <= 31) {
      setNewCardClosingDay(cleaned);
    }
  };

  const handlePaymentDayChange = (text: string): void => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setNewCardPaymentDay('');
      return;
    }
    const num = parseInt(cleaned, 10);
    if (num <= 31) {
      setNewCardPaymentDay(cleaned);
    }
  };

  const handleCreditLimitChange = (text: string): void => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setNewCardCreditLimit(cleaned);
  };

  const handleCreateBank = (): void => {
    const trimmed = newBankInput.trim();
    if (!trimmed) {
      setBankInputError('Por favor ingresa el nombre de la entidad bancaria.');
      return;
    }
    const exists = banks.some((b) => b.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setBankInputError('Esta entidad bancaria ya se encuentra registrada.');
      return;
    }
    const clean = newBankBalanceInput.trim().replace(',', '.');
    const parsedInitial = clean ? parseFloat(clean) : undefined;
    const initialBal = parsedInitial !== undefined && !isNaN(parsedInitial) ? parsedInitial : undefined;

    addBank(trimmed, initialBal);
    setNewBankInput('');
    setNewBankBalanceInput('');
    setBankInputError(null);
    setIsCreatingBank(false);
  };

  const handleCancelCreateBank = (): void => {
    setNewBankInput('');
    setNewBankBalanceInput('');
    setBankInputError(null);
    setIsCreatingBank(false);
  };

  const handleStartEditBalance = (bank: Bank): void => {
    setEditingBankId(bank.id);
    setEditingBalanceInput(
      bank.initialBalance !== undefined && bank.initialBalance !== 0
        ? bank.initialBalance.toString()
        : ''
    );
  };

  const handleSaveBankBalance = (bankId: string): void => {
    const clean = editingBalanceInput.trim().replace(',', '.');
    const parsed = parseFloat(clean);
    const validBalance = isNaN(parsed) ? 0 : parsed;
    setBankBalance(bankId, validBalance);
    setEditingBankId(null);
    setEditingBalanceInput('');
  };

  const handleCancelEditBalance = (): void => {
    setEditingBankId(null);
    setEditingBalanceInput('');
  };

  const handleSaveBankInline = (): void => {
    const trimmed = newBankNameInline.trim();
    if (!trimmed) {
      setCardFormError('Por favor ingresa el nombre del banco.');
      return;
    }
    const createdBank = addBank(trimmed);
    setSelectedBankForNewCard(createdBank.name);
    setNewBankNameInline('');
    setIsAddingNewBankInline(false);
    setIsBankDropdownOpen(false);
    setCardFormError(null);
  };

  const handleSaveCard = (): void => {
    const name = newCardName.trim();
    if (!name) {
      setCardFormError('Por favor ingresa el nombre de la tarjeta.');
      return;
    }
    if (!selectedBankForNewCard.trim()) {
      setCardFormError('Por favor selecciona o registra un banco.');
      return;
    }
    const closing = parseInt(newCardClosingDay, 10);
    if (isNaN(closing) || closing < 1 || closing > 31) {
      setCardFormError('El día de cierre debe ser un número entre 1 y 31.');
      return;
    }
    const payment = parseInt(newCardPaymentDay, 10);
    if (isNaN(payment) || payment < 1 || payment > 31) {
      setCardFormError('El día de pago debe ser un número entre 1 y 31.');
      return;
    }
    const parsedLimit = parseFloat(newCardCreditLimit);

    addCard({
      name,
      bankName: selectedBankForNewCard,
      closingDay: closing,
      paymentDay: payment,
      cutOffDay: payment,
      creditLimit: !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined,
      isDefault: newCardIsDefault,
    });

    setCardFormError(null);
    setNewCardName('');
    setNewCardClosingDay('20');
    setNewCardPaymentDay('5');
    setNewCardCreditLimit('');
    setNewCardIsDefault(false);
    setIsAddingNewCard(false);
    setIsBankDropdownOpen(false);
    setIsAddingNewBankInline(false);
    setNewBankNameInline('');
  };

  const handleToggleAddCard = (): void => {
    if (!isAddingNewCard) {
      if (cards.length === 0) {
        setNewCardIsDefault(true);
      }
      if (!selectedBankForNewCard && banks.length > 0) {
        setSelectedBankForNewCard(banks[0].name);
      }
    }
    setIsAddingNewCard((prev) => !prev);
  };

  // Deudas bancarias y tarjetas activas (no saldadas)
  const activeDebts: PersonalDebt[] = personalDebts.filter((d) => !d.settled);

  // Total adeudado integral a bancos/tarjetas
  const totalLiabilities: number = activeDebts.reduce(
    (acc, d) => acc + (d.remainingAmount || 0),
    0
  );

  // Cálculo reactivo centralizado de compromisos y pagos de tarjeta
  const getCardDebtDetails = (card: CreditCard) => {
    const cardClosingDay = card.closingDay ?? card.cutOffDay ?? 20;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // A.1 Deudas personales vinculadas a la tarjeta
    const linkedPersonalDebts = personalDebts.filter(
      (d) =>
        (d.cardId === card.id ||
          (d.title && card.name && d.title.toLowerCase().includes(card.name.toLowerCase()))) &&
        !d.settled
    );

    const personalMonthDue = linkedPersonalDebts.reduce((acc, d) => {
      const rem = d.remainingAmount ?? 0;
      if (d.cardPaymentType === 'full_statement') {
        return acc + rem;
      }
      if (d.monthlyPayment && d.monthlyPayment > 0) {
        return acc + Math.min(rem, d.monthlyPayment);
      }
      return acc + rem;
    }, 0);

    // A.2 Consumos de terceros vinculados a la tarjeta
    const linkedThirdPartyCharges = thirdPartyCharges.filter(
      (c) =>
        (c.cardId === card.id ||
          (c.cardName && card.name && c.cardName.toLowerCase() === card.name.toLowerCase())) &&
        !c.settled
    );

    const thirdPartyMonthDue = linkedThirdPartyCharges.reduce((acc, c) => {
      const rem = c.remainingAmount ?? 0;
      const count = c.installmentsCount ?? 1;
      if (count <= 1) {
        return acc + rem;
      }
      const monthly =
        c.monthlyInstallmentAmount && c.monthlyInstallmentAmount > 0
          ? c.monthlyInstallmentAmount
          : rem;
      return acc + Math.min(rem, monthly);
    }, 0);

    // A.3 Compras directas del período de facturación actual de transactions
    const currentCycleTransactions = transactions
      .filter((t) => {
        if (t.type !== 'expense') return false;
        if (t.paymentMethod !== 'credit_card') return false;
        const isMatchingCard =
          t.cardId === card.id ||
          (t.cardName && card.name && t.cardName.toLowerCase() === card.name.toLowerCase());
        if (!isMatchingCard) return false;
        if (t.relatedDebtId || t.relatedChargeId || t.relatedLoanId) return false;

        const txDate = new Date(t.date);
        if (isNaN(txDate.getTime())) return false;
        const d = txDate.getDate();
        const m = txDate.getMonth();
        const y = txDate.getFullYear();

        let billMonth = m;
        let billYear = y;
        if (d >= cardClosingDay) {
          billMonth = m + 1;
          if (billMonth > 11) {
            billMonth = 0;
            billYear = y + 1;
          }
        }

        return billMonth === currentMonth && billYear === currentYear;
      })
      .reduce((acc, t) => acc + (t.amount ?? 0), 0);

    // Compromiso total del mes actual bruto
    const rawMonthDue = personalMonthDue + thirdPartyMonthDue + currentCycleTransactions;

    // B. Deuda total diferida bruta
    const cardThirdPartyChargesDebt = linkedThirdPartyCharges.reduce(
      (acc, c) => acc + (c.remainingAmount ?? 0),
      0
    );

    const cardPersonalDebtsDebt = linkedPersonalDebts.reduce(
      (acc, d) => acc + (d.remainingAmount ?? 0),
      0
    );

    const rawTotalDebt =
      cardThirdPartyChargesDebt + cardPersonalDebtsDebt + currentCycleTransactions;

    // Pagos card_payment efectuados a la tarjeta
    const cardPayments = transactions
      .filter((t) => t.type === 'card_payment' && t.cardId === card.id)
      .reduce((sum, t) => sum + t.amount, 0);

    // Deducir pagos del ciclo y del total
    const cardCurrentMonthDebt = Math.max(0, rawMonthDue - cardPayments);
    const cardTotalDebt = Math.max(0, rawTotalDebt - cardPayments);

    return {
      personalMonthDue,
      thirdPartyMonthDue,
      currentCycleTransactions,
      cardPayments,
      rawMonthDue,
      rawTotalDebt,
      cardCurrentMonthDebt,
      cardTotalDebt,
    };
  };

  // IDs de tarjetas con deuda activa pendiente (exigible del mes o diferida)
  const unpaidCardIds = cards
    .filter((c) => {
      const { cardCurrentMonthDebt, cardTotalDebt } = getCardDebtDetails(c);
      return cardCurrentMonthDebt > 0 || cardTotalDebt > 0;
    })
    .map((c) => c.id);


  // Dependencias contables para eliminación protegida de banco
  const associatedBankCardsCount = bankPendingDelete
    ? cards.filter(
        (c) => c.bankName.trim().toLowerCase() === bankPendingDelete.name.trim().toLowerCase()
      ).length
    : 0;

  const activeBankDebtsCount = bankPendingDelete
    ? personalDebts.filter(
        (d) =>
          d.entity.trim().toLowerCase() === bankPendingDelete.name.trim().toLowerCase() &&
          !d.settled &&
          (d.remainingAmount ?? 0) > 0.001
      ).length
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabecera del modal */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Tarjetas y Créditos</Text>
            <Text style={styles.subtitle}>
              Visión integral de pasivos y cupos bancarios
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Card: Total Pasivo Integral Adeudado */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#0A84FF" />
                <Text style={styles.heroBadgeText}>PASIVO INTEGRAL CONSOLIDADO</Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>
              {currencySymbol}
              {totalLiabilities.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.heroDescription}>
              Total exigible por entidades financieras y tarjetas de crédito
            </Text>
            <View style={styles.heroFooter}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Obligaciones activas</Text>
                <Text style={styles.heroStatValue}>{activeDebts.length}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Tarjetas asociadas</Text>
                <Text style={styles.heroStatValue}>{cards.length}</Text>
              </View>
            </View>
          </View>

          {/* Sección: Tarjetas de Crédito Registradas */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Ionicons name="card-outline" size={18} color="#0A84FF" />
                <Text style={styles.sectionTitle}>TARJETAS DE CRÉDITO</Text>
              </View>
              <TouchableOpacity
                style={styles.addCardButton}
                activeOpacity={0.7}
                onPress={handleToggleAddCard}
                accessibilityRole="button"
                accessibilityLabel="Nueva Tarjeta"
              >
                <Ionicons name="add-circle-outline" size={16} color="#00FFA3" />
                <Text style={styles.addCardButtonText}>+ Nueva Tarjeta</Text>
              </TouchableOpacity>
            </View>

            {/* Formulario colapsable para crear nueva tarjeta */}
            {isAddingNewCard && (
              <View style={styles.newCardForm}>
                <View style={styles.formHeaderRow}>
                  <View style={styles.formTitleRow}>
                    <Ionicons name="card-outline" size={18} color="#00FFA3" />
                    <Text style={styles.formTitle}>Nueva Tarjeta de Crédito</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.formCloseButton}
                    onPress={() => setIsAddingNewCard(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar formulario"
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Input: Nombre de la tarjeta */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formFieldLabel}>NOMBRE DE LA TARJETA</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newCardName}
                    onChangeText={setNewCardName}
                    placeholder="ej. Visa Infinite, Mastercard Black"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Selector desplegable de Banco */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formFieldLabel}>BANCO EMISOR</Text>
                  <TouchableOpacity
                    style={styles.bankDropdownTrigger}
                    activeOpacity={0.7}
                    onPress={() => setIsBankDropdownOpen((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar banco"
                  >
                    <View style={styles.bankTriggerLeft}>
                      <Ionicons name="business-outline" size={16} color="#00FFA3" />
                      <Text style={styles.bankTriggerText}>
                        {selectedBankForNewCard || 'Seleccionar banco'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isBankDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isBankDropdownOpen && (
                    <View style={styles.bankDropdownMenu}>
                      <ScrollView
                        style={styles.bankDropdownScroll}
                        nestedScrollEnabled={true}
                      >
                        {banks.map((bank: Bank) => {
                          const isSelected = bank.name === selectedBankForNewCard;
                          return (
                            <TouchableOpacity
                              key={bank.id}
                              style={[
                                styles.bankDropdownItem,
                                isSelected && styles.bankDropdownItemSelected,
                              ]}
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedBankForNewCard(bank.name);
                                setIsBankDropdownOpen(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.bankDropdownItemText,
                                  isSelected && styles.bankDropdownItemTextSelected,
                                ]}
                              >
                                {bank.name}
                              </Text>
                              {isSelected ? (
                                <Ionicons name="checkmark" size={16} color="#00FFA3" />
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* Botón registrar nuevo banco inline */}
                      <TouchableOpacity
                        style={styles.addBankDropdownButton}
                        activeOpacity={0.7}
                        onPress={() => setIsAddingNewBankInline(true)}
                      >
                        <Ionicons name="add-circle" size={16} color="#00FFA3" />
                        <Text style={styles.addBankDropdownButtonText}>
                          ➕ Registrar nuevo banco
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Subformulario de Banco Inline */}
                  {isAddingNewBankInline && (
                    <View style={styles.inlineBankForm}>
                      <Text style={styles.inlineBankTitle}>Registrar Nuevo Banco</Text>
                      <TextInput
                        style={styles.formInput}
                        value={newBankNameInline}
                        onChangeText={setNewBankNameInline}
                        placeholder="Nombre del banco"
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                      />
                      <View style={styles.inlineBankActions}>
                        <TouchableOpacity
                          style={styles.inlineBankCancelButton}
                          activeOpacity={0.7}
                          onPress={() => {
                            setNewBankNameInline('');
                            setIsAddingNewBankInline(false);
                          }}
                        >
                          <Text style={styles.inlineBankCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.inlineBankSaveButton}
                          activeOpacity={0.7}
                          onPress={handleSaveBankInline}
                        >
                          <Ionicons name="checkmark" size={14} color="#121212" />
                          <Text style={styles.inlineBankSaveText}>Guardar Banco</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Fila de 2 inputs numéricos para las fechas del ciclo */}
                <View style={styles.formRowTwoCols}>
                  <View style={styles.formCol}>
                    <Text style={styles.formFieldLabel}>DÍA DE CIERRE</Text>
                    <TextInput
                      style={styles.formInput}
                      value={newCardClosingDay}
                      onChangeText={handleClosingDayChange}
                      placeholder="20"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={2}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.formFieldHint}>Corte de factura (1-31)</Text>
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.formFieldLabel}>DÍA DE PAGO</Text>
                    <TextInput
                      style={styles.formInput}
                      value={newCardPaymentDay}
                      onChangeText={handlePaymentDayChange}
                      placeholder="5"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={2}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.formFieldHint}>Vencimiento límite (1-31)</Text>
                  </View>
                </View>

                {/* Input opcional: Límite / Cupo de Crédito */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formFieldLabel}>LÍMITE / CUPO DE CRÉDITO (OPCIONAL)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newCardCreditLimit}
                    onChangeText={handleCreditLimitChange}
                    placeholder="ej. 5000"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Fila con Switch: Establecer como tarjeta predeterminada */}
                <View style={styles.switchRowContainer}>
                  <View style={styles.switchTextCol}>
                    <Text style={styles.switchTitle}>Establecer como tarjeta predeterminada</Text>
                    <Text style={styles.switchDescription}>
                      Aparecerá seleccionada de primera en los gastos
                    </Text>
                  </View>
                  <Switch
                    value={newCardIsDefault}
                    onValueChange={setNewCardIsDefault}
                    trackColor={{ false: '#2C2C2E', true: 'rgba(0, 255, 163, 0.4)' }}
                    thumbColor={newCardIsDefault ? '#00FFA3' : '#8E8E93'}
                  />
                </View>

                {cardFormError ? (
                  <View style={styles.formErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#FF453A" />
                    <Text style={styles.formErrorText}>{cardFormError}</Text>
                  </View>
                ) : null}

                {/* Botón principal Guardar Tarjeta */}
                <TouchableOpacity
                  style={styles.submitCardButton}
                  activeOpacity={0.7}
                  onPress={handleSaveCard}
                  accessibilityRole="button"
                  accessibilityLabel="Guardar Tarjeta"
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#121212" />
                  <Text style={styles.submitCardButtonText}>Guardar Tarjeta</Text>
                </TouchableOpacity>
              </View>
            )}

            {cards.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="card-outline" size={28} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>
                  No tienes tarjetas de crédito registradas todavía
                </Text>
                <Text style={styles.emptySubtitle}>
                  Registra tus tarjetas bancarias para gestionar cupos y cortes de facturación.
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {cards.map((card: CreditCard) => {
                  const cardAccentColor = card.color || '#0A84FF';
                  const cardClosingDay = card.closingDay ?? card.cutOffDay ?? 20;
                  const cardPaymentDay = card.paymentDay ?? card.cutOffDay ?? 5;
                  const cycleDates = getCardBillingCycleDates(cardClosingDay, cardPaymentDay);

                  const {
                    personalMonthDue,
                    thirdPartyMonthDue,
                    currentCycleTransactions,
                    cardCurrentMonthDebt,
                    cardTotalDebt,
                  } = getCardDebtDetails(card);

                  return (
                    <View key={card.id} style={styles.cardItem}>
                      <View
                        style={[
                          styles.cardAccentBar,
                          { backgroundColor: cardAccentColor },
                        ]}
                      />
                      <View style={styles.cardBody}>
                        <View style={styles.cardTopRow}>
                          <View style={styles.cardInfoCol}>
                            <View style={styles.cardTitleLine}>
                              <Text style={styles.cardName}>{card.name}</Text>
                              {card.isDefault ? (
                                <View style={styles.defaultBadge}>
                                  <Text style={styles.defaultBadgeText}>★ Predeterminada</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.cardBank}>{card.bankName}</Text>
                          </View>
                          <View style={styles.cardActionsCol}>
                            <TouchableOpacity
                              style={styles.starButton}
                              activeOpacity={0.7}
                              onPress={() => !card.isDefault && setDefaultCard(card.id)}
                              accessibilityRole="button"
                              accessibilityLabel={
                                card.isDefault
                                    ? 'Tarjeta predeterminada'
                                    : 'Establecer como tarjeta predeterminada'
                              }
                            >
                              <Ionicons
                                name={card.isDefault ? 'star' : 'star-outline'}
                                size={20}
                                color={card.isDefault ? '#00FFA3' : '#8E8E93'}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteCardButton}
                              onPress={() => setCardPendingDelete(card)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel={`Eliminar tarjeta ${card.name}`}
                            >
                              <Ionicons name="trash-outline" size={17} color="#FF453A" />
                            </TouchableOpacity>
                            <View style={styles.cardBadge}>
                              <Ionicons name="card" size={14} color={cardAccentColor} />
                              <Text style={styles.cardLastDigits}>
                                •••• {card.lastFourDigits || '0000'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.cardDetailsRow}>
                          <View style={styles.cardDetailBox}>
                            <Text style={styles.cardDetailLabel}>📅 Cierre de Factura</Text>
                            <Text style={styles.cardDetailValue}>
                              Corte: {cycleDates.closingFormatted}
                            </Text>
                          </View>

                          <View style={styles.cardDetailBox}>
                            <Text style={styles.cardDetailLabel}>💳 Límite de Pago</Text>
                            <Text style={styles.cardDetailValue}>
                              Pago: {cycleDates.paymentDueFormatted}
                            </Text>
                          </View>

                          <View style={styles.cardDetailBox}>
                            <Text style={styles.cardDetailLabel}>Límite asignado</Text>
                            <Text style={styles.cardDetailValue}>
                              {card.creditLimit !== undefined && card.creditLimit > 0
                                ? `${currencySymbol}${card.creditLimit.toLocaleString('es-ES', {
                                    minimumFractionDigits: 0,
                                  })}`
                                : 'Sin límite fijado'}
                            </Text>
                          </View>
                        </View>

                        {/* Bloque destacado: Compromiso exigible del mes actual */}
                        <View style={styles.cardMonthDueBlock}>
                          <View style={styles.cardMonthDueHeader}>
                            <View style={styles.cardMonthDueTitleRow}>
                              <Ionicons
                                name="calendar-outline"
                                size={14}
                                color={cardCurrentMonthDebt > 0 ? '#FF453A' : '#00FFA3'}
                              />
                              <Text style={styles.cardMonthDueTitle}>A PAGAR ESTE MES</Text>
                            </View>
                            <Text style={styles.cardMonthDueSubtext}>
                              (Vence el {cycleDates.paymentDueFormatted})
                            </Text>
                          </View>

                          <View style={styles.cardMonthDueAmountRow}>
                            <Text
                              style={[
                                styles.cardMonthDueAmount,
                                cardCurrentMonthDebt > 0
                                  ? styles.cardMonthDueAmountOwed
                                  : styles.cardMonthDueAmountSettled,
                              ]}
                            >
                              {cardCurrentMonthDebt > 0
                                ? formatCurrency(cardCurrentMonthDebt)
                                : `${currencySymbol}0`}
                            </Text>
                            {cardCurrentMonthDebt === 0 && (
                              <View style={styles.settledBadge}>
                                <Ionicons name="checkmark-circle" size={13} color="#00FFA3" />
                                <Text style={styles.settledBadgeText}>✓ AL DÍA</Text>
                              </View>
                            )}
                          </View>

                          {/* Botón táctil de pago o adelanto */}
                          <View style={styles.cardPaymentActionsRow}>
                            {cardCurrentMonthDebt > 0 ? (
                              <TouchableOpacity
                                style={styles.payCardButton}
                                activeOpacity={0.7}
                                onPress={() => setPayingCard(card)}
                                accessibilityRole="button"
                                accessibilityLabel={`Pagar tarjeta ${card.name}`}
                              >
                                <Ionicons name="card-outline" size={15} color="#0A84FF" />
                                <Text style={styles.payCardButtonText}>💳 Pagar Tarjeta</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.advancePaymentButton}
                                activeOpacity={0.7}
                                onPress={() => setPayingCard(card)}
                                accessibilityRole="button"
                                accessibilityLabel={`Adelantar pago a ${card.name}`}
                              >
                                <Ionicons name="add-circle-outline" size={14} color="#00FFA3" />
                                <Text style={styles.advancePaymentButtonText}>+ Adelantar</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Micro-desglose sutil (solo si cardCurrentMonthDebt > 0) */}
                          {cardCurrentMonthDebt > 0 && (
                            <View style={styles.cardMonthBreakdownRow}>
                              <Text style={styles.cardMonthBreakdownText}>
                                Propio: {formatCurrency(personalMonthDue + currentCycleTransactions)} • Terceros: {formatCurrency(thirdPartyMonthDue)}
                              </Text>
                            </View>
                          )}

                          {/* Fila secundaria discreta: Deuda total diferida */}
                          <View style={styles.cardTotalDebtSecondaryRow}>
                            <Ionicons name="time-outline" size={13} color="#8E8E93" />
                            <Text style={styles.cardTotalDebtSecondaryText}>
                              Deuda total diferida: {formatCurrency(cardTotalDebt)}
                            </Text>
                          </View>

                          {/* Botón ver detalle y consumos */}
                          <TouchableOpacity
                            style={styles.viewDetailsButton}
                            onPress={() => router.push({ pathname: '/cards/[id]', params: { id: card.id } })}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Ver detalle y consumos de ${card.name}`}
                          >
                            <Ionicons name="receipt-outline" size={15} color="#0A84FF" />
                            <Text style={styles.viewDetailsButtonText}>Ver Detalle y Consumos</Text>
                            <Ionicons name="chevron-forward" size={14} color="#0A84FF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

        {/* Sección: Entidades Bancarias Registradas */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={18} color="#00FFA3" />
              <Text style={styles.sectionTitle}>ENTIDADES BANCARIAS</Text>
              <View style={styles.bankCountBadge}>
                <Text style={styles.bankCountBadgeText}>{banks.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addCardButton}
              activeOpacity={0.7}
              onPress={() => setIsCreatingBank((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Nuevo Banco"
            >
              <Ionicons name="add-circle-outline" size={16} color="#00FFA3" />
              <Text style={styles.addCardButtonText}>+ Banco</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.banksContentContainer}>
            {/* Formulario colapsable para crear nuevo banco */}
            {isCreatingBank && (
              <View style={styles.newBankForm}>
                <View style={styles.formHeaderRow}>
                  <View style={styles.formTitleRow}>
                    <Ionicons name="business-outline" size={18} color="#00FFA3" />
                    <Text style={styles.formTitle}>Nueva Entidad Bancaria</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.formCloseButton}
                    onPress={handleCancelCreateBank}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar formulario de banco"
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Input: Nombre del banco */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formFieldLabel}>NOMBRE DEL BANCO</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. Bancolombia, Galicia, BBVA..."
                    placeholderTextColor={colors.textSecondary}
                    value={newBankInput}
                    onChangeText={(text) => {
                      setNewBankInput(text);
                      if (bankInputError) setBankInputError(null);
                    }}
                    autoFocus
                  />
                </View>

                {/* Input: Saldo inicial opcional */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formFieldLabel}>SALDO INICIAL EN CUENTA (OPCIONAL)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={newBankBalanceInput}
                    onChangeText={(text) =>
                      setNewBankBalanceInput(
                        text
                          .replace(',', '.')
                          .replace(/[^0-9.]/g, '')
                          .replace(/(\..*?)\..*/g, '$1')
                      )
                    }
                  />
                  <Text style={styles.formFieldHint}>
                    Monto disponible actual en tus cuentas o ahorros
                  </Text>
                </View>

                {bankInputError ? (
                  <View style={styles.formErrorBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#FF453A" />
                    <Text style={styles.formErrorText}>{bankInputError}</Text>
                  </View>
                ) : null}

                {/* Botones de acción */}
                <View style={styles.bankFormActionsRow}>
                  <TouchableOpacity
                    style={styles.bankFormCancelButton}
                    activeOpacity={0.7}
                    onPress={handleCancelCreateBank}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar registro de banco"
                  >
                    <Text style={styles.bankFormCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bankFormSaveButton}
                    activeOpacity={0.7}
                    onPress={handleCreateBank}
                    accessibilityRole="button"
                    accessibilityLabel="Guardar Banco"
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#121212" />
                    <Text style={styles.bankFormSaveButtonText}>Guardar Banco</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

              {/* Lista de Bancos */}
              {banks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptySubtitle}>No hay entidades bancarias registradas</Text>
                </View>
              ) : (
                <View style={styles.banksList}>
                  {banks.map((b) => {
                    const bankNameLower = b.name.trim().toLowerCase();

                    // Tarjetas pertenecientes a este banco
                    const bankCards = cards.filter(
                      (c) => c.bankName.trim().toLowerCase() === bankNameLower
                    );
                    const bCards = bankCards.length;

                    // Deuda en tarjetas de ese banco
                    const bankCardsDebt = bankCards.reduce((acc, c) => {
                      const cThirdParty = thirdPartyCharges
                        .filter(
                          (tc) =>
                            (tc.cardId === c.id ||
                              (tc.cardName &&
                                c.name &&
                                tc.cardName.toLowerCase() === c.name.toLowerCase())) &&
                            !tc.settled
                        )
                        .reduce((sub, tc) => sub + (tc.remainingAmount ?? 0), 0);

                      const cPersonal = personalDebts
                        .filter(
                          (pd) =>
                            (pd.cardId === c.id ||
                              (pd.title &&
                                c.name &&
                                pd.title.toLowerCase().includes(c.name.toLowerCase()))) &&
                            !pd.settled
                        )
                        .reduce((sub, pd) => sub + (pd.remainingAmount ?? 0), 0);

                      return acc + cThirdParty + cPersonal;
                    }, 0);

                    const computedBalance = getBankComputedBalance(b.id, b.initialBalance);
                    const custodyAmount = getBankCustodyAmount(b.id, unpaidCardIds);

                    return (
                      <View key={b.id} style={styles.bankRowCard}>
                        <View style={styles.bankRowMain}>
                          <View style={styles.bankRowLeft}>
                            <View
                              style={[
                                styles.bankAvatarCircle,
                                bCards > 0 || (b.initialBalance ?? 0) > 0
                                  ? styles.bankAvatarActive
                                  : styles.bankAvatarInactive,
                              ]}
                            >
                              <Ionicons
                                name="business-outline"
                                size={18}
                                color={
                                  bCards > 0 || (b.initialBalance ?? 0) > 0
                                    ? '#00FFA3'
                                    : colors.textSecondary
                                }
                              />
                            </View>
                            <View style={styles.bankInfoCol}>
                              <View style={styles.bankTitleRow}>
                                <Text style={styles.bankNameText}>{b.name}</Text>
                                <View style={styles.bankActionButtons}>
                                  <TouchableOpacity
                                    style={styles.editBalanceIconBtn}
                                    onPress={() => handleStartEditBalance(b)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Ajustar saldo disponible de ${b.name}`}
                                  >
                                    <Ionicons name="wallet-outline" size={16} color="#00FFA3" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.deleteBankBtn}
                                    onPress={() => setBankPendingDelete(b)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Eliminar banco ${b.name}`}
                                  >
                                    <Ionicons name="trash-outline" size={16} color="#FF453A" />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Saldo Disponible en Cuenta */}
                              <View style={styles.bankBalanceRow}>
                                <Ionicons name="cash-outline" size={13} color="#00FFA3" />
                                <Text style={styles.bankBalanceLabel}>Saldo disponible:</Text>
                                <Text
                                  style={[
                                    styles.bankBalanceValue,
                                    computedBalance < 0 && styles.bankBalanceValueNegative,
                                  ]}
                                >
                                  {computedBalance !== 0
                                    ? `${formatCurrency(computedBalance)} disponible`
                                    : '$0 disponible'}
                                </Text>
                              </View>

                              {/* Alerta de fondos en custodia para tarjeta */}
                              {custodyAmount > 0 && (
                                <View style={styles.bankCustodyAlertChip}>
                                  <View style={styles.bankCustodyLine}>
                                    <Ionicons name="warning-outline" size={12} color="#FF9F0A" />
                                    <Text style={styles.bankCustodyText}>
                                      ⚠️ {formatCurrency(custodyAmount)} en custodia para tarjeta
                                    </Text>
                                  </View>
                                  <View style={styles.bankFreeBalanceLine}>
                                    <Ionicons name="shield-checkmark-outline" size={12} color="#0A84FF" />
                                    <Text style={styles.bankFreeBalanceText}>
                                      Saldo libre: {formatCurrency(computedBalance - custodyAmount)}
                                    </Text>
                                  </View>
                                </View>
                              )}

                              {/* Chips de productos y deudas de tarjeta */}
                              <View style={styles.bankChipsRow}>
                                <View style={styles.bankChip}>
                                  <Ionicons name="card-outline" size={12} color="#0A84FF" />
                                  <Text style={styles.bankChipText}>
                                    {bCards} {bCards === 1 ? 'tarjeta' : 'tarjetas'}
                                  </Text>
                                </View>
                                {bankCardsDebt > 0 && (
                                  <View style={styles.bankDebtChipCards}>
                                    <Ionicons name="card" size={11} color="#FF453A" />
                                    <Text style={styles.bankDebtChipCardsText}>
                                      Tarjetas: {formatCurrency(bankCardsDebt)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>

                        {/* Formulario Inline Cyberpunk para Ajuste de Saldo */}
                        {editingBankId === b.id && (
                          <View style={styles.inlineEditBalanceBox}>
                            <View style={styles.inlineEditBalanceHeader}>
                              <Ionicons name="wallet-outline" size={14} color="#00FFA3" />
                              <Text style={styles.inlineEditBalanceTitle}>
                                Definir Saldo en Cuenta ({b.name})
                              </Text>
                            </View>
                            <View style={styles.inlineEditBalanceRow}>
                              <View style={styles.inlineEditInputWrapper}>
                                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                                <TextInput
                                  style={styles.inlineEditBalanceInput}
                                  placeholder="0.00"
                                  placeholderTextColor={colors.textSecondary}
                                  keyboardType="decimal-pad"
                                  value={editingBalanceInput}
                                  onChangeText={(text) =>
                                    setEditingBalanceInput(
                                      text
                                        .replace(',', '.')
                                        .replace(/[^0-9.-]/g, '')
                                        .replace(/(\..*?)\..*/g, '$1')
                                    )
                                  }
                                  autoFocus
                                />
                              </View>
                              <TouchableOpacity
                                style={styles.inlineEditCancelBtn}
                                onPress={handleCancelEditBalance}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Cancelar ajuste de saldo"
                              >
                                <Text style={styles.inlineEditCancelText}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.inlineEditSaveBtn}
                                onPress={() => handleSaveBankBalance(b.id)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Guardar saldo"
                              >
                                <Ionicons name="checkmark" size={15} color="#121212" />
                                <Text style={styles.inlineEditSaveText}>Guardar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <DeleteCardModal
        visible={cardPendingDelete !== null}
        card={cardPendingDelete}
        activeTransactionsCount={
          transactions.filter((t) => t.cardId === cardPendingDelete?.id).length
        }
        activeDebtsCount={
          personalDebts.filter(
            (d) =>
              d.cardId === cardPendingDelete?.id &&
              !d.settled &&
              (d.remainingAmount ?? 0) > 0.001
          ).length
        }
        activeThirdPartyChargesCount={
          thirdPartyCharges.filter(
            (c) =>
              c.cardId === cardPendingDelete?.id &&
              !c.settled &&
              (c.remainingAmount ?? 0) > 0.001
          ).length
        }
        onClose={() => setCardPendingDelete(null)}
        onConfirmDelete={() => {
          if (cardPendingDelete) {
            deleteCard(cardPendingDelete.id);
            setCardPendingDelete(null);
          }
        }}
      />

      <DeleteBankModal
        bank={bankPendingDelete}
        associatedCardsCount={associatedBankCardsCount}
        activeDebtsCount={activeBankDebtsCount}
        onClose={() => setBankPendingDelete(null)}
        onConfirmDelete={(id: string) => {
          deleteBank(id);
          setBankPendingDelete(null);
        }}
      />

      <CardPaymentModal
        visible={!!payingCard}
        card={payingCard}
        monthDue={payingCard ? getCardDebtDetails(payingCard).cardCurrentMonthDebt : 0}
        totalDue={payingCard ? getCardDebtDetails(payingCard).cardTotalDebt : 0}
        onClose={() => setPayingCard(null)}
        onSuccess={() => setPayingCard(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addCardButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
  },
  newCardForm: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  formCloseButton: {
    padding: 4,
  },
  formFieldGroup: {
    gap: 6,
  },
  formFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  formInput: {
    backgroundColor: '#121212',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  formFieldHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bankDropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bankTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankTriggerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  bankDropdownMenu: {
    backgroundColor: '#161616',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    maxHeight: 180,
  },
  bankDropdownScroll: {
    maxHeight: 130,
  },
  bankDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  bankDropdownItemSelected: {
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
  },
  bankDropdownItemText: {
    fontSize: 13,
    color: colors.text,
  },
  bankDropdownItemTextSelected: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  addBankDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
  },
  addBankDropdownButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00FFA3',
  },
  inlineBankForm: {
    backgroundColor: '#161616',
    borderColor: 'rgba(10, 132, 255, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginTop: 6,
  },
  inlineBankTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.5,
  },
  inlineBankActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  inlineBankCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
  },
  inlineBankCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inlineBankSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#00FFA3',
  },
  inlineBankSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#121212',
  },
  formRowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
    gap: 6,
  },
  switchRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  switchDescription: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  submitCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00FFA3',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  submitCardButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#121212',
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardsList: {
    gap: 10,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardAccentBar: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfoCol: {
    flex: 1,
  },
  cardTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00FFA3',
  },
  cardActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  deleteCardButton: {
    padding: 4,
  },
  cardBank: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardLastDigits: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardDetailBox: {
    gap: 2,
  },
  cardDetailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  banksContentContainer: {
    gap: 12,
    marginTop: 8,
  },
  bankCountBadge: {
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  bankCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
  },
  newBankForm: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    marginBottom: 8,
  },
  bankFormActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  bankFormCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  bankFormCancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bankFormSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#00FFA3',
  },
  bankFormSaveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#121212',
  },
  banksList: {
    gap: 10,
  },
  bankRowCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  bankRowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bankRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  bankAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bankAvatarActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
  },
  bankAvatarInactive: {
    backgroundColor: '#2C2C2E',
  },
  bankInfoCol: {
    flex: 1,
    gap: 6,
  },
  bankTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  bankActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBalanceIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBankBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.2)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  bankBalanceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bankBalanceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
  },
  bankBalanceValueNegative: {
    color: '#FF453A',
  },
  bankChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#121212',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bankChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bankDebtChipCards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderColor: 'rgba(255, 69, 58, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bankDebtChipCardsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF453A',
  },
  inlineEditBalanceBox: {
    backgroundColor: '#161616',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  inlineEditBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineEditBalanceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
    letterSpacing: 0.5,
  },
  inlineEditBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineEditInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00FFA3',
    marginRight: 4,
  },
  inlineEditBalanceInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 6,
  },
  inlineEditCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
  },
  inlineEditCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inlineEditSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#00FFA3',
  },
  inlineEditSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#121212',
  },
  cardMonthDueBlock: {
    backgroundColor: '#161616',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  cardMonthDueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMonthDueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMonthDueTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  cardMonthDueSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardMonthDueAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  cardMonthDueAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardMonthDueAmountOwed: {
    color: '#FF453A',
  },
  cardMonthDueAmountSettled: {
    color: '#00FFA3',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  settledBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00FFA3',
    letterSpacing: 0.5,
  },
  cardPaymentActionsRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  payCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderColor: '#0A84FF',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  payCardButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A84FF',
  },
  advancePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  advancePaymentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00FFA3',
  },
  bankCustodyAlertChip: {
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
    alignSelf: 'stretch',
    marginTop: 2,
  },
  bankCustodyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bankCustodyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  bankFreeBalanceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bankFreeBalanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  cardMonthBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardMonthBreakdownText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardTotalDebtSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  cardTotalDebtSecondaryText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  formErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#FF453A',
    fontWeight: '600',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: '#0A84FF',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  viewDetailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A84FF',
  },
});

export default CardsOverviewModal;

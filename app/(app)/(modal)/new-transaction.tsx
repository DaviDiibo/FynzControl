import React, { useState, useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type CategoryItem,
} from '../../../src/constants/categories';
import { useTransactionsStore } from '../../../src/store/transactions-store';
import { useDebtsStore } from '../../../src/store/debts-store';
import { useCardsStore } from '../../../src/store/cards-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useIsWide } from '../../../src/hooks/use-responsive';

type OperationType = 'expense' | 'income';

const TYPE_CONFIG = {
  expense: {
    label: 'Gasto',
    color: '#FF453A',
    icon: 'arrow-up-circle' as const,
    textColor: '#FFFFFF',
  },
  income: {
    label: 'Ingreso',
    color: '#00FFA3',
    icon: 'arrow-down-circle' as const,
    textColor: '#000000',
  },
} as const;

const NewTransactionModal = (): JSX.Element => {
  const router = useRouter();
  const isWide = useIsWide(768);
  const { addTransaction } = useTransactionsStore();
  const {
    personalDebts,
    friendLoans,
    payPersonalDebt,
    collectFriendLoan,
  } = useDebtsStore();
  const { type: initialType } = useLocalSearchParams<{ type?: OperationType }>();

  const initialOpType: OperationType =
    initialType === 'income' ? 'income' : 'expense';

  const [operationType, setOperationType] = useState<OperationType>(initialOpType);
  const [amount, setAmount] = useState<string>('');
  const [concept, setConcept] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialOpType === 'income' ? INCOME_CATEGORIES[0].id : EXPENSE_CATEGORIES[0].id
  );
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          router.back();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [router]);

  const { cards, addCard, banks, addBank } = useCardsStore();
  const currency = useSettingsStore((state) => state.currency);
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'BRL' ? 'R$' : '$';

  const [selectedBankId, setSelectedBankId] = useState<string | null>(() => (banks.length > 0 ? banks[0].id : null));
  const [paymentMethod, setPaymentMethod] = useState<'cash_debit' | 'credit_card'>('cash_debit');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isCardDropdownOpen, setIsCardDropdownOpen] = useState(false);
  const [expenseInstallmentsCount, setExpenseInstallmentsCount] = useState<string>('1');
  const [isCustomInstallments, setIsCustomInstallments] = useState(false);
  const [isAddingNewCard, setIsAddingNewCard] = useState<boolean>(false);
  const [newCardName, setNewCardName] = useState<string>('');
  const [newCardClosingDay, setNewCardClosingDay] = useState<string>('20');
  const [newCardPaymentDay, setNewCardPaymentDay] = useState<string>('5');
  const [selectedBankForNewCard, setSelectedBankForNewCard] = useState<string>('');
  const [isBankDropdownOpenForNewCard, setIsBankDropdownOpenForNewCard] = useState<boolean>(false);
  const [isAddingNewBankInline, setIsAddingNewBankInline] = useState<boolean>(false);
  const [newBankNameInline, setNewBankNameInline] = useState<string>('');

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return 0;
    });
  }, [cards]);

  useEffect(() => {
    const defaultCard = cards.find((c) => c.isDefault) ?? cards[0];
    if (!selectedCardId && defaultCard) {
      setSelectedCardId(defaultCard.id);
    }
  }, [cards, selectedCardId]);

  useEffect(() => {
    if (!selectedBankForNewCard && banks && banks.length > 0) {
      setSelectedBankForNewCard(banks[0].id);
    }
  }, [banks, selectedBankForNewCard]);

  const handleSaveNewBankInline = (): void => {
    const trimmedBankName = newBankNameInline.trim();
    if (!trimmedBankName) {
      Alert.alert('Nombre requerido', 'Por favor ingresa el nombre del banco.');
      return;
    }
    const created = addBank(trimmedBankName);
    setSelectedBankForNewCard(created.id);
    setNewBankNameInline('');
    setIsAddingNewBankInline(false);
    setIsBankDropdownOpenForNewCard(false);
  };

  const handleSaveNewCard = (): void => {
    const trimmedName = newCardName.trim();
    if (!trimmedName) {
      Alert.alert('Nombre requerido', 'Por favor ingresa el nombre de la tarjeta.');
      return;
    }

    const parsedClosing = parseInt(newCardClosingDay, 10);
    if (isNaN(parsedClosing) || parsedClosing < 1 || parsedClosing > 31) {
      Alert.alert('Día de cierre inválido', 'El día de cierre de factura debe ser un número entre 1 y 31.');
      return;
    }

    const parsedPayment = parseInt(newCardPaymentDay, 10);
    if (isNaN(parsedPayment) || parsedPayment < 1 || parsedPayment > 31) {
      Alert.alert('Día de pago inválido', 'El día límite de pago debe ser un número entre 1 y 31.');
      return;
    }

    const bankObj =
      banks.find((b) => b.id === selectedBankForNewCard) ||
      banks.find((b) => b.name === selectedBankForNewCard);
    const bankName = bankObj?.name || 'Entidad Financiera';

    addCard({
      name: trimmedName,
      bankName,
      closingDay: parsedClosing,
      paymentDay: parsedPayment,
      cutOffDay: parsedPayment,
    });
    const latestCard = useCardsStore.getState().cards[0];
    if (latestCard) {
      setSelectedCardId(latestCard.id);
    }
    setNewCardName('');
    setNewCardClosingDay('20');
    setNewCardPaymentDay('5');
    setIsAddingNewCard(false);
    setIsCardDropdownOpen(false);
    setIsBankDropdownOpenForNewCard(false);
    setIsAddingNewBankInline(false);
    setNewBankNameInline('');
  };

  useEffect(() => {
    if (initialType === 'income' || initialType === 'expense') {
      setOperationType(initialType);
      setSelectedDebtId(null);
      setSelectedLoanId(null);
      if (initialType === 'expense') {
        setSelectedCategory(EXPENSE_CATEGORIES[0].id);
      } else if (initialType === 'income') {
        setSelectedCategory(INCOME_CATEGORIES[0].id);
      }
    }
  }, [initialType]);

  const activeColor = TYPE_CONFIG[operationType].color;

  const handleTypeChange = (type: OperationType): void => {
    setOperationType(type);
    setSelectedDebtId(null);
    setSelectedLoanId(null);
    if (type === 'expense') {
      setSelectedCategory(EXPENSE_CATEGORIES[0].id);
    } else if (type === 'income') {
      setSelectedCategory(INCOME_CATEGORIES[0].id);
    }
  };

  const handleCategoryChange = (categoryId: string): void => {
    setSelectedCategory(categoryId);
    if (categoryId !== 'pago-deudas') {
      setSelectedDebtId(null);
    }
    if (categoryId !== 'cobro-prestamo') {
      setSelectedLoanId(null);
    }
  };

  const categoriesToDisplay =
    operationType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const isDebtCategory =
    selectedCategory === 'pago-deudas' ||
    categoriesToDisplay.find((c) => c.id === selectedCategory)?.name.toLowerCase() === 'pago deudas';

  const isLoanCategory =
    selectedCategory === 'cobro-prestamo' ||
    categoriesToDisplay.find((c) => c.id === selectedCategory)?.name.toLowerCase() === 'cobro préstamo';

  const pendingPersonalDebts = personalDebts.filter((d) => d.remainingAmount > 0);
  const pendingFriendLoans = friendLoans.filter((l) => !l.settled && l.remainingAmount > 0);

  const handleSave = (): void => {
    const cleanAmount = amount.trim().replace(',', '.');
    const parsedAmount = parseFloat(cleanAmount);

    if (!cleanAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto numérico mayor a 0.');
      return;
    }

    const categoryItem = categoriesToDisplay.find((c) => c.id === selectedCategory);
    let defaultTitle = categoryItem ? categoryItem.name : selectedCategory;
    if (operationType === 'expense' && selectedDebtId) {
      const linkedDebt = personalDebts.find((d) => d.id === selectedDebtId);
      if (linkedDebt) {
        defaultTitle = `Pago: ${linkedDebt.title}`;
      }
    } else if (operationType === 'income' && selectedLoanId) {
      const linkedLoan = friendLoans.find((l) => l.id === selectedLoanId);
      if (linkedLoan) {
        defaultTitle = `Cobro: ${linkedLoan.friendName}`;
      }
    }

    const finalTitle = concept.trim() || defaultTitle;

    const selectedCardObj =
      operationType === 'expense'
        ? cards.find((c) => c.id === selectedCardId) ||
          cards.find((c) => c.isDefault) ||
          (cards.length > 0 ? cards[0] : undefined)
        : undefined;

    const parsedExpenseInstallments = parseInt(expenseInstallmentsCount, 10);

    const resolvedBankId =
      operationType === 'income' || (operationType === 'expense' && paymentMethod === 'cash_debit')
        ? selectedBankId || undefined
        : undefined;

    addTransaction({
      title: finalTitle,
      amount: parsedAmount,
      type: operationType,
      category: selectedCategory,
      cardName:
        operationType === 'expense' && paymentMethod === 'credit_card'
          ? selectedCardObj?.name
          : undefined,
      notes: notes.trim() || undefined,
      paymentMethod: operationType === 'expense' ? paymentMethod : undefined,
      cardId:
        operationType === 'expense' && paymentMethod === 'credit_card'
          ? selectedCardObj?.id || selectedCardId
          : undefined,
      bankId: resolvedBankId,
      installmentsCount:
        operationType === 'expense' &&
        paymentMethod === 'credit_card' &&
        parsedExpenseInstallments > 1
          ? parsedExpenseInstallments
          : undefined,
    });

    if (operationType === 'expense' && selectedDebtId) {
      payPersonalDebt(selectedDebtId, parsedAmount);
    } else if (operationType === 'income' && selectedLoanId) {
      collectFriendLoan(selectedLoanId, parsedAmount);
    }

    router.back();
  };

  const parsedAmountForEstimate = parseFloat(amount.trim().replace(',', '.')) || 0;
  const parsedInstallmentsForEstimate = parseInt(expenseInstallmentsCount || '1', 10);
  const activeSelectedCardObj =
    cards.find((c) => c.id === selectedCardId) ||
    cards.find((c) => c.isDefault) ||
    (cards.length > 0 ? cards[0] : undefined);
  const selectedBankObj =
    banks.find((b) => b.id === selectedBankForNewCard) ||
    banks.find((b) => b.name === selectedBankForNewCard);

  const modalFormContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
      style={styles.keyboardContainer}
    >
        {/* Drag Indicator Bar */}
        {!isWide && (
          <View style={styles.dragIndicatorContainer}>
            <View style={styles.dragIndicator} />
          </View>
        )}

        {/* Header Row */}
        <View style={[styles.header, isWide && styles.desktopHeader]}>
          <Text style={styles.headerTitle}>REGISTRAR OPERACIÓN</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityLabel="Cerrar modal"
            accessibilityRole="button"
          >
            <Ionicons name="close-outline" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Operation Type Selector */}
          <View style={styles.typeSelectorContainer}>
            {(['expense', 'income'] as const).map((type) => {
              const item = TYPE_CONFIG[type];
              const isSelected = operationType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typePill,
                    isSelected && {
                      borderColor: item.color,
                      backgroundColor: `${item.color}1F`,
                    },
                  ]}
                  onPress={() => handleTypeChange(type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isSelected ? item.color : colors.textSecondary}
                    style={styles.typeIcon}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      isSelected && { color: item.color, fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount Input */}
          <View style={[styles.amountCard, { borderColor: `${activeColor}40` }]}>
            <Text style={[styles.currencySymbol, { color: activeColor }]}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {/* Standard Fields: Expense & Income */}
          <View style={styles.sectionContainer}>
              <Text style={styles.fieldLabel}>CONCEPTO</Text>
              <TextInput
                style={styles.textInput}
                value={concept}
                onChangeText={setConcept}
                placeholder={
                  operationType === 'expense'
                    ? 'Ej. Supermercado, Almuerzo, Gasolina...'
                    : 'Ej. Nómina mensual, Factura cliente...'
                }
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>CATEGORÍA</Text>
              <View style={styles.pillsWrap}>
                {categoriesToDisplay.map((cat: CategoryItem) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryPill,
                        isSelected && {
                          borderColor: cat.color,
                          backgroundColor: `${cat.color}20`,
                        },
                      ]}
                      onPress={() => handleCategoryChange(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={16}
                        color={isSelected ? cat.color : colors.textSecondary}
                        style={styles.pillIcon}
                      />
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && { color: cat.color, fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selector de cuenta bancaria para Ingresos */}
              {operationType === 'income' && (
                <View style={styles.bankSourceSection}>
                  <Text style={styles.fieldLabel}>¿EN QUÉ CUENTA BANCARIA INGRESÓ?</Text>
                  <View style={styles.bankPillsRow}>
                    <TouchableOpacity
                      style={[
                        styles.bankPill,
                        selectedBankId === null && styles.bankPillActive,
                      ]}
                      onPress={() => setSelectedBankId(null)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={15}
                        color={selectedBankId === null ? '#00FFA3' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.bankPillText,
                          selectedBankId === null && styles.bankPillTextActive,
                        ]}
                      >
                        Efectivo en mano / Sin banco
                      </Text>
                    </TouchableOpacity>

                    {banks.map((b) => {
                      const isSelected = selectedBankId === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.bankPill,
                            isSelected && styles.bankPillActive,
                          ]}
                          onPress={() => setSelectedBankId(b.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="business-outline"
                            size={15}
                            color={isSelected ? '#00FFA3' : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.bankPillText,
                              isSelected && styles.bankPillTextActive,
                            ]}
                          >
                            {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Sección MÉTODO DE PAGO para Gastos */}
              {operationType === 'expense' && (
                <View style={styles.paymentMethodSection}>
                  <Text style={styles.fieldLabel}>MÉTODO DE PAGO</Text>
                  <View style={styles.paymentMethodRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodPill,
                        paymentMethod === 'cash_debit' && styles.paymentMethodPillActiveCash,
                      ]}
                      onPress={() => setPaymentMethod('cash_debit')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.paymentMethodPillEmoji}>💵</Text>
                      <Text
                        style={[
                          styles.paymentMethodPillText,
                          paymentMethod === 'cash_debit' && styles.paymentMethodPillTextActiveCash,
                        ]}
                      >
                        Efectivo / Débito
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentMethodPill,
                        paymentMethod === 'credit_card' && styles.paymentMethodPillActiveCredit,
                      ]}
                      onPress={() => setPaymentMethod('credit_card')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.paymentMethodPillEmoji}>💳</Text>
                      <Text
                        style={[
                          styles.paymentMethodPillText,
                          paymentMethod === 'credit_card' && styles.paymentMethodPillTextActiveCredit,
                        ]}
                      >
                        Tarjeta de Crédito
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Selector de cuenta bancaria para Gasto en Efectivo / Débito */}
                  {paymentMethod === 'cash_debit' && (
                    <View style={styles.bankSourceSection}>
                      <Text style={styles.subFieldLabel}>¿DE CUÁL CUENTA BANCARIA SALIÓ?</Text>
                      <View style={styles.bankPillsRow}>
                        <TouchableOpacity
                          style={[
                            styles.bankPill,
                            selectedBankId === null && styles.bankPillActive,
                          ]}
                          onPress={() => setSelectedBankId(null)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="cash-outline"
                            size={15}
                            color={selectedBankId === null ? '#00FFA3' : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.bankPillText,
                              selectedBankId === null && styles.bankPillTextActive,
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
                                styles.bankPill,
                                isSelected && styles.bankPillActive,
                              ]}
                              onPress={() => setSelectedBankId(b.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="business-outline"
                                size={15}
                                color={isSelected ? '#00FFA3' : colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.bankPillText,
                                  isSelected && styles.bankPillTextActive,
                                ]}
                              >
                                {b.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {paymentMethod === 'credit_card' && (
                    <View style={styles.creditCardContainer}>
                      {/* Selector colapsable de Tarjetas */}
                      <View style={styles.cardDropdownWrapper}>
                        <Text style={styles.subFieldLabel}>TARJETA DE CRÉDITO</Text>
                        <TouchableOpacity
                          style={styles.cardDropdownTrigger}
                          onPress={() => setIsCardDropdownOpen(!isCardDropdownOpen)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.cardDropdownTriggerLeft}>
                            <Ionicons name="card-outline" size={18} color="#BF5AF2" />
                            <View style={styles.cardDropdownTriggerContent}>
                              <Text style={styles.cardDropdownTriggerText} numberOfLines={1}>
                                {activeSelectedCardObj
                                  ? `${activeSelectedCardObj.name} • ${activeSelectedCardObj.bankName}`
                                  : 'Seleccionar tarjeta'}
                              </Text>
                              {activeSelectedCardObj && (
                                <Text style={styles.cardDropdownTriggerSubText} numberOfLines={1}>
                                  {`Cierre: Día ${activeSelectedCardObj.closingDay ?? activeSelectedCardObj.cutOffDay ?? 20} • Pago: Día ${activeSelectedCardObj.paymentDay ?? activeSelectedCardObj.cutOffDay ?? 5}`}
                                </Text>
                              )}
                            </View>
                            {activeSelectedCardObj?.isDefault && (
                              <View style={styles.defaultCardBadge}>
                                <Ionicons name="star" size={10} color="#00FFA3" />
                                <Text style={styles.defaultCardBadgeText}>Predeterminada</Text>
                              </View>
                            )}
                          </View>
                          <Ionicons
                            name={isCardDropdownOpen ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>

                        {isCardDropdownOpen && (
                          <View style={styles.cardDropdownMenu}>
                            {sortedCards && sortedCards.length > 0 ? (
                              sortedCards.map((c) => {
                                const isSelected = (activeSelectedCardObj?.id || selectedCardId) === c.id;
                                return (
                                  <TouchableOpacity
                                    key={c.id}
                                    style={[
                                      styles.cardDropdownItem,
                                      isSelected && styles.cardDropdownItemSelected,
                                    ]}
                                    onPress={() => {
                                      setSelectedCardId(c.id);
                                      setIsCardDropdownOpen(false);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.cardDropdownItemLeft}>
                                      <Ionicons
                                        name="card-outline"
                                        size={16}
                                        color={isSelected ? '#BF5AF2' : colors.textSecondary}
                                      />
                                      <View style={styles.cardDropdownItemContent}>
                                        <Text
                                          style={[
                                            styles.cardDropdownItemText,
                                            isSelected && styles.cardDropdownItemTextSelected,
                                          ]}
                                          numberOfLines={1}
                                        >
                                          {c.name} • {c.bankName}
                                        </Text>
                                        <Text style={styles.cardDropdownItemSubText} numberOfLines={1}>
                                          {`Cierre: Día ${c.closingDay ?? c.cutOffDay ?? 20} • Pago: Día ${c.paymentDay ?? c.cutOffDay ?? 5}`}
                                        </Text>
                                      </View>
                                      {c.isDefault && (
                                        <View style={styles.defaultCardBadge}>
                                          <Ionicons name="star" size={10} color="#00FFA3" />
                                          <Text style={styles.defaultCardBadgeText}>Predeterminada</Text>
                                        </View>
                                      )}
                                    </View>
                                    {isSelected && (
                                      <Ionicons name="checkmark-circle" size={16} color="#BF5AF2" />
                                    )}
                                  </TouchableOpacity>
                                );
                              })
                            ) : (
                              <View style={styles.dropdownEmpty}>
                                <Text style={styles.dropdownEmptyText}>
                                  No hay tarjetas registradas
                                </Text>
                              </View>
                            )}

                            {!isAddingNewCard ? (
                              <TouchableOpacity
                                style={styles.addNewCardButton}
                                onPress={() => setIsAddingNewCard(true)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="add-circle-outline" size={16} color="#BF5AF2" />
                                <Text style={styles.addNewCardButtonText}>
                                  ➕ Registrar nueva tarjeta
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.inlineCardForm}>
                                <View style={styles.inlineCardFormHeader}>
                                  <Text style={styles.inlineCardFormTitle}>REGISTRAR NUEVA TARJETA</Text>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setIsAddingNewCard(false);
                                      setIsBankDropdownOpenForNewCard(false);
                                      setIsAddingNewBankInline(false);
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                                  </TouchableOpacity>
                                </View>

                                <Text style={styles.inlineFieldLabel}>NOMBRE DE LA TARJETA</Text>
                                <TextInput
                                  style={styles.inlineCardInput}
                                  value={newCardName}
                                  onChangeText={setNewCardName}
                                  placeholder="Nombre (ej: Visa Infinite)"
                                  placeholderTextColor={colors.textSecondary}
                                />

                                {/* Selector colapsable de Bancos */}
                                <View style={styles.bankDropdownWrapper}>
                                  <Text style={styles.inlineFieldLabel}>BANCO EMISOR</Text>
                                  <TouchableOpacity
                                    style={styles.bankDropdownTrigger}
                                    onPress={() => setIsBankDropdownOpenForNewCard(!isBankDropdownOpenForNewCard)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.bankDropdownTriggerLeft}>
                                      <Ionicons name="business-outline" size={16} color="#BF5AF2" />
                                      <Text style={styles.bankDropdownTriggerText} numberOfLines={1}>
                                        {selectedBankObj?.name || 'Seleccionar banco'}
                                      </Text>
                                    </View>
                                    <Ionicons
                                      name={isBankDropdownOpenForNewCard ? 'chevron-up' : 'chevron-down'}
                                      size={16}
                                      color={colors.textSecondary}
                                    />
                                  </TouchableOpacity>

                                  {isBankDropdownOpenForNewCard && (
                                    <View style={styles.bankDropdownMenu}>
                                      {banks.map((b) => {
                                        const isSelected =
                                          selectedBankForNewCard === b.id || selectedBankForNewCard === b.name;
                                        return (
                                          <TouchableOpacity
                                            key={b.id}
                                            style={[
                                              styles.bankDropdownItem,
                                              isSelected && styles.bankDropdownItemSelected,
                                            ]}
                                            onPress={() => {
                                              setSelectedBankForNewCard(b.id);
                                              setIsBankDropdownOpenForNewCard(false);
                                            }}
                                            activeOpacity={0.7}
                                          >
                                            <View style={styles.bankDropdownItemLeft}>
                                              <Ionicons
                                                name="business-outline"
                                                size={14}
                                                color={isSelected ? '#BF5AF2' : colors.textSecondary}
                                              />
                                              <Text
                                                style={[
                                                  styles.bankDropdownItemText,
                                                  isSelected && styles.bankDropdownItemTextSelected,
                                                ]}
                                                numberOfLines={1}
                                              >
                                                {b.name}
                                              </Text>
                                            </View>
                                            {isSelected && (
                                              <Ionicons name="checkmark-circle" size={14} color="#BF5AF2" />
                                            )}
                                          </TouchableOpacity>
                                        );
                                      })}

                                      {!isAddingNewBankInline ? (
                                        <TouchableOpacity
                                          style={styles.addNewBankButton}
                                          onPress={() => setIsAddingNewBankInline(true)}
                                          activeOpacity={0.8}
                                        >
                                          <Ionicons name="add-circle-outline" size={14} color="#BF5AF2" />
                                          <Text style={styles.addNewBankButtonText}>
                                            ➕ Registrar nuevo banco
                                          </Text>
                                        </TouchableOpacity>
                                      ) : (
                                        <View style={styles.inlineBankForm}>
                                          <View style={styles.inlineBankFormHeader}>
                                            <Text style={styles.inlineBankFormTitle}>NUEVO BANCO</Text>
                                            <TouchableOpacity
                                              onPress={() => {
                                                setIsAddingNewBankInline(false);
                                                setNewBankNameInline('');
                                              }}
                                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                              <Ionicons
                                                name="close-circle-outline"
                                                size={16}
                                                color={colors.textSecondary}
                                              />
                                            </TouchableOpacity>
                                          </View>
                                          <TextInput
                                            style={styles.inlineBankInput}
                                            value={newBankNameInline}
                                            onChangeText={setNewBankNameInline}
                                            placeholder="Nombre del banco (ej. Scotia)"
                                            placeholderTextColor={colors.textSecondary}
                                            autoFocus
                                          />
                                          <TouchableOpacity
                                            style={styles.inlineBankSaveButton}
                                            onPress={handleSaveNewBankInline}
                                            activeOpacity={0.8}
                                          >
                                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                            <Text style={styles.inlineBankSaveButtonText}>Guardar Banco</Text>
                                          </TouchableOpacity>
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>

                                {/* Fila con Día de Cierre y Día de Pago */}
                                <View style={styles.inlineCardDaysRow}>
                                  <View style={styles.inlineCardDayCol}>
                                    <Text style={styles.inlineFieldLabel}>DÍA DE CIERRE</Text>
                                    <TextInput
                                      style={styles.inlineCardInput}
                                      value={newCardClosingDay}
                                      onChangeText={(val) => {
                                        const numOnly = val.replace(/[^0-9]/g, '');
                                        if (numOnly === '') {
                                          setNewCardClosingDay('');
                                          return;
                                        }
                                        const num = parseInt(numOnly, 10);
                                        if (num > 31) {
                                          setNewCardClosingDay('31');
                                        } else {
                                          setNewCardClosingDay(num.toString());
                                        }
                                      }}
                                      placeholder="20"
                                      placeholderTextColor={colors.textSecondary}
                                      keyboardType="number-pad"
                                      maxLength={2}
                                    />
                                  </View>

                                  <View style={styles.inlineCardDayCol}>
                                    <Text style={styles.inlineFieldLabel}>DÍA DE PAGO</Text>
                                    <TextInput
                                      style={styles.inlineCardInput}
                                      value={newCardPaymentDay}
                                      onChangeText={(val) => {
                                        const numOnly = val.replace(/[^0-9]/g, '');
                                        if (numOnly === '') {
                                          setNewCardPaymentDay('');
                                          return;
                                        }
                                        const num = parseInt(numOnly, 10);
                                        if (num > 31) {
                                          setNewCardPaymentDay('31');
                                        } else {
                                          setNewCardPaymentDay(num.toString());
                                        }
                                      }}
                                      placeholder="5"
                                      placeholderTextColor={colors.textSecondary}
                                      keyboardType="number-pad"
                                      maxLength={2}
                                    />
                                  </View>
                                </View>

                                <TouchableOpacity
                                  style={styles.inlineCardSaveButton}
                                  onPress={handleSaveNewCard}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                  <Text style={styles.inlineCardSaveButtonText}>Guardar Tarjeta</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Selector de Modalidad de Pago de la compra en la tarjeta */}
                      <View style={styles.installmentsSection}>
                        <Text style={styles.subFieldLabel}>MODALIDAD DE PAGO</Text>
                        <View style={styles.installmentOptionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.installmentOptionPill,
                              !isCustomInstallments && styles.installmentOptionPillActive,
                            ]}
                            onPress={() => {
                              setIsCustomInstallments(false);
                              setExpenseInstallmentsCount('1');
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={!isCustomInstallments ? '#BF5AF2' : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.installmentOptionText,
                                !isCustomInstallments && styles.installmentOptionTextActive,
                              ]}
                            >
                              1 cuota (Mes actual)
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.installmentOptionPill,
                              isCustomInstallments && styles.installmentOptionPillActive,
                            ]}
                            onPress={() => {
                              setIsCustomInstallments(true);
                              if (expenseInstallmentsCount === '1' || !expenseInstallmentsCount) {
                                setExpenseInstallmentsCount('3');
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="repeat-outline"
                              size={14}
                              color={isCustomInstallments ? '#BF5AF2' : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.installmentOptionText,
                                isCustomInstallments && styles.installmentOptionTextActive,
                              ]}
                            >
                              Diferido a cuotas
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {isCustomInstallments && (
                          <View style={styles.customInstallmentsWrap}>
                            <Text style={styles.installmentFieldLabel}>NÚMERO DE CUOTAS</Text>
                            <TextInput
                              style={styles.installmentInput}
                              value={expenseInstallmentsCount}
                              onChangeText={(val) => {
                                const numericOnly = val.replace(/[^0-9]/g, '');
                                setExpenseInstallmentsCount(numericOnly);
                              }}
                              placeholder="Ej: 3, 6, 12"
                              placeholderTextColor={colors.textSecondary}
                              keyboardType="number-pad"
                            />

                            {parsedAmountForEstimate > 0 && parsedInstallmentsForEstimate > 1 && (
                              <View style={styles.installmentLiveEstimateCard}>
                                <Ionicons name="calculator-outline" size={16} color="#BF5AF2" style={styles.estimateIcon} />
                                <Text style={styles.installmentLiveEstimateText}>
                                  Cuota estimada: {currencySymbol}{(parsedAmountForEstimate / parseInt(expenseInstallmentsCount || '1', 10)).toFixed(2)} / mes
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Flujo 1: Vincular con deuda pendiente (Gasto -> Pago Deudas) */}
              {operationType === 'expense' && isDebtCategory && pendingPersonalDebts.length > 0 && (
                <View style={styles.linkSectionContainer}>
                  <View style={styles.linkHeaderRow}>
                    <Ionicons name="card-outline" size={16} color="#FF453A" style={styles.linkHeaderIcon} />
                    <Text style={styles.linkHeaderTitle}>VINCULAR CON DEUDA PENDIENTE</Text>
                  </View>
                  <View style={styles.pillsWrap}>
                    {pendingPersonalDebts.map((debt) => {
                      const isSelected = selectedDebtId === debt.id;
                      const formattedRemaining = debt.remainingAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      });
                      return (
                        <TouchableOpacity
                          key={debt.id}
                          style={[
                            styles.linkedItemPill,
                            isSelected && styles.linkedDebtPillSelected,
                          ]}
                          onPress={() =>
                            setSelectedDebtId((prev) => (prev === debt.id ? null : debt.id))
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={debt.icon || 'card-outline'}
                            size={15}
                            color={isSelected ? '#FF453A' : colors.textSecondary}
                            style={styles.pillIcon}
                          />
                          <Text
                            style={[
                              styles.linkedItemText,
                              isSelected && styles.linkedDebtTextSelected,
                            ]}
                          >
                            {debt.title} (Resta: ${formattedRemaining})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Flujo 2: Vincular con préstamo por cobrar (Ingreso -> Cobro Préstamo) */}
              {operationType === 'income' && isLoanCategory && pendingFriendLoans.length > 0 && (
                <View style={styles.linkSectionContainer}>
                  <View style={styles.linkHeaderRow}>
                    <Ionicons name="arrow-undo-outline" size={16} color="#BF5AF2" style={styles.linkHeaderIcon} />
                    <Text style={styles.linkHeaderTitle}>VINCULAR CON PRÉSTAMO POR COBRAR</Text>
                  </View>
                  <View style={styles.pillsWrap}>
                    {pendingFriendLoans.map((loan) => {
                      const isSelected = selectedLoanId === loan.id;
                      const formattedRemaining = loan.remainingAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      });
                      return (
                        <TouchableOpacity
                          key={loan.id}
                          style={[
                            styles.linkedItemPill,
                            isSelected && styles.linkedLoanPillSelected,
                          ]}
                          onPress={() =>
                            setSelectedLoanId((prev) => (prev === loan.id ? null : loan.id))
                          }
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="arrow-undo-outline"
                            size={15}
                            color={isSelected ? '#BF5AF2' : colors.textSecondary}
                            style={styles.pillIcon}
                          />
                          <Text
                            style={[
                              styles.linkedItemText,
                              isSelected && styles.linkedLoanTextSelected,
                            ]}
                          >
                            {loan.friendName} (Por cobrar: ${formattedRemaining})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

          {/* Notes Input */}
          <View style={styles.sectionContainer}>
            <Text style={styles.fieldLabel}>NOTAS (OPCIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalles adicionales, recordatorio..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {/* Footer with Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: activeColor }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.saveButtonText,
                { color: TYPE_CONFIG[operationType].textColor },
              ]}
            >
              GUARDAR REGISTRO
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
  );

  if (isWide) {
    return (
      <View style={styles.desktopOverlay}>
        <TouchableOpacity
          style={styles.desktopBackdropTouchable}
          activeOpacity={1}
          onPress={() => router.back()}
          accessibilityLabel="Cerrar modal"
          accessibilityRole="button"
        />
        <View style={styles.desktopCardContainer}>
          {modalFormContent}
        </View>
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={styles.androidBackdrop}>
        <TouchableOpacity
          style={styles.androidBackdropTouchable}
          activeOpacity={1}
          onPress={() => router.back()}
          accessibilityLabel="Cerrar modal"
          accessibilityRole="button"
        />
        <View style={styles.androidSheetContainer}>
          {modalFormContent}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {modalFormContent}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  desktopOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  desktopBackdropTouchable: {
    ...StyleSheet.absoluteFill,
  },
  desktopCardContainer: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '92%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 16,
  },
  desktopHeader: {
    paddingTop: 16,
  },
  androidBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  androidBackdropTouchable: {
    height: 56,
  },
  androidSheetContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  keyboardContainer: {
    flex: 1,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 48 : 40,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeIcon: {
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 22,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 34,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    minWidth: 120,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillIcon: {
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  linkSectionContainer: {
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  linkHeaderIcon: {
    marginRight: 6,
  },
  linkHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  linkedItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkedDebtPillSelected: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.16)',
  },
  linkedDebtTextSelected: {
    color: '#FF453A',
    fontWeight: '700',
  },
  linkedLoanPillSelected: {
    borderColor: '#BF5AF2',
    backgroundColor: 'rgba(191, 90, 242, 0.16)',
  },
  linkedLoanTextSelected: {
    color: '#BF5AF2',
    fontWeight: '700',
  },
  linkedItemText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bankSourceSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  bankPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  bankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  bankPillActive: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  bankPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bankPillTextActive: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  paymentMethodSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  paymentMethodPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodPillActiveCash: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  paymentMethodPillActiveCredit: {
    borderColor: '#BF5AF2',
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
  },
  paymentMethodPillEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  paymentMethodPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentMethodPillTextActiveCash: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  paymentMethodPillTextActiveCredit: {
    color: '#BF5AF2',
    fontWeight: '700',
  },
  creditCardContainer: {
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
    gap: 14,
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardDropdownWrapper: {
    gap: 6,
  },
  cardDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardDropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardDropdownTriggerContent: {
    flex: 1,
  },
  cardDropdownTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cardDropdownTriggerSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDropdownMenu: {
    backgroundColor: '#18181A',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginTop: 6,
    gap: 6,
  },
  cardDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cardDropdownItemSelected: {
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
  },
  cardDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardDropdownItemContent: {
    flex: 1,
  },
  cardDropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cardDropdownItemSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDropdownItemTextSelected: {
    color: '#BF5AF2',
    fontWeight: '700',
  },
  defaultCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
  },
  defaultCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00FFA3',
  },
  dropdownEmpty: {
    padding: 12,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addNewCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(191, 90, 242, 0.08)',
    borderColor: 'rgba(191, 90, 242, 0.3)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  addNewCardButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BF5AF2',
  },
  inlineCardForm: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  inlineCardFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  inlineCardFormTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BF5AF2',
    letterSpacing: 0.6,
  },
  inlineCardInput: {
    backgroundColor: '#121212',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
  },
  inlineCardSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BF5AF2',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  inlineCardSaveButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inlineFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  bankDropdownWrapper: {
    marginTop: 2,
    gap: 4,
  },
  bankDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  bankDropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bankDropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  bankDropdownMenu: {
    backgroundColor: '#161618',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginTop: 4,
    gap: 4,
  },
  bankDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bankDropdownItemSelected: {
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
  },
  bankDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bankDropdownItemText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  bankDropdownItemTextSelected: {
    color: '#BF5AF2',
    fontWeight: '700',
  },
  addNewBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(191, 90, 242, 0.08)',
    borderColor: 'rgba(191, 90, 242, 0.25)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 4,
  },
  addNewBankButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BF5AF2',
  },
  inlineBankForm: {
    backgroundColor: '#1E1E20',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginTop: 4,
  },
  inlineBankFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineBankFormTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BF5AF2',
    letterSpacing: 0.6,
  },
  inlineBankInput: {
    backgroundColor: '#121212',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 12,
  },
  inlineBankSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BF5AF2',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  inlineBankSaveButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inlineCardDaysRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  inlineCardDayCol: {
    flex: 1,
  },
  installmentsSection: {
    marginTop: 4,
  },
  installmentOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  installmentOptionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  installmentOptionPillActive: {
    borderColor: '#BF5AF2',
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
  },
  installmentOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  installmentOptionTextActive: {
    color: '#BF5AF2',
    fontWeight: '700',
  },
  customInstallmentsWrap: {
    marginTop: 8,
    gap: 6,
  },
  installmentFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  installmentInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  installmentLiveEstimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(191, 90, 242, 0.1)',
    borderColor: 'rgba(191, 90, 242, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  estimateIcon: {
    marginRight: 8,
  },
  installmentLiveEstimateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E0A8FF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default NewTransactionModal;

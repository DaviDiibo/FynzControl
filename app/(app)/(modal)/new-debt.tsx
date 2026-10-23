import React, { useState } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { useDebtsStore } from '../../../src/store/debts-store';
import { useCardsStore } from '../../../src/store/cards-store';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useTransactionsStore } from '../../../src/store/transactions-store';

const formatAmount = (val: number): string =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type DebtTab = 'personal' | 'friend_loan' | 'card_charge';
type QuickTerm = '15d' | '1m' | '3m' | 'custom';

const QUICK_TERM_OPTIONS: { id: QuickTerm; label: string }[] = [
  { id: '15d', label: 'En 15 días' },
  { id: '1m', label: 'En 1 mes' },
  { id: '3m', label: 'En 3 meses' },
  { id: 'custom', label: 'Fecha personalizada' },
];

const MONTH_NAMES_FULL_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface FriendDueDateResult {
  isoString: string;
  formattedDate: string;
  daysRemaining: number;
  daysText: string;
  isValid: boolean;
}

const computeFriendDueDate = (
  quickTerm: QuickTerm,
  customDateText: string
): FriendDueDateResult => {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let targetDate: Date | null = null;

  if (quickTerm === '15d') {
    targetDate = new Date(todayMidnight);
    targetDate.setDate(targetDate.getDate() + 15);
  } else if (quickTerm === '1m') {
    targetDate = new Date(todayMidnight);
    targetDate.setMonth(targetDate.getMonth() + 1);
  } else if (quickTerm === '3m') {
    targetDate = new Date(todayMidnight);
    targetDate.setMonth(targetDate.getMonth() + 3);
  } else if (quickTerm === 'custom') {
    const parts = customDateText.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (
        !isNaN(d) &&
        !isNaN(m) &&
        !isNaN(y) &&
        y >= 2024 &&
        y <= 2099 &&
        m >= 0 &&
        m <= 11 &&
        d >= 1 &&
        d <= 31
      ) {
        const candidate = new Date(y, m, d);
        if (
          candidate.getFullYear() === y &&
          candidate.getMonth() === m &&
          candidate.getDate() === d
        ) {
          targetDate = candidate;
        }
      }
    }
  }

  if (!targetDate) {
    return {
      isoString: '',
      formattedDate: '',
      daysRemaining: 0,
      daysText: '',
      isValid: false,
    };
  }

  const msDiff = targetDate.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.round(msDiff / (1000 * 60 * 60 * 24));
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const isoString = `${year}-${month}-${day}`;

  const monthName = MONTH_NAMES_FULL_ES[targetDate.getMonth()] ?? '';
  const formattedDate = `${targetDate.getDate()} de ${monthName}, ${year}`;

  let daysText = '';
  if (daysRemaining > 1) {
    daysText = `en ${daysRemaining} días`;
  } else if (daysRemaining === 1) {
    daysText = 'mañana';
  } else if (daysRemaining === 0) {
    daysText = 'hoy';
  } else {
    daysText = `vencido hace ${Math.abs(daysRemaining)} días`;
  }

  return {
    isoString,
    formattedDate,
    daysRemaining,
    daysText,
    isValid: true,
  };
};

const TAB_CONFIG: Record<
  DebtTab,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  personal: {
    label: 'Deuda Propia',
    icon: 'business-outline',
    color: '#00FFA3',
  },
  friend_loan: {
    label: 'Préstamo a Amigo',
    icon: 'cash-outline',
    color: '#0A84FF',
  },
  card_charge: {
    label: 'Gasto en Tarjeta',
    icon: 'people-outline',
    color: '#00FFA3',
  },
};

const NewDebtModal = (): JSX.Element => {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isLegacyMode = params.mode === 'legacy';
  const addTransaction = useTransactionsStore((state) => state.addTransaction);

  const [activeTab, setActiveTab] = useState<DebtTab>('personal');

  // Moneda dinámica
  const currency = useSettingsStore((state) => state.currency);
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'BRL' ? 'R$' : '$';

  // Store actions and state
  const addPersonalDebt = useDebtsStore((state) => state.addPersonalDebt);
  const addFriendLoan = useDebtsStore((state) => state.addFriendLoan);
  const addThirdPartyCharge = useDebtsStore((state) => state.addThirdPartyCharge);
  const people = useDebtsStore((state) => state.people);
  const addPerson = useDebtsStore((state) => state.addPerson);

  // Cards store: bancos y tarjetas disponibles
  const banks = useCardsStore((state) => state.banks);
  const addBank = useCardsStore((state) => state.addBank);
  const cards = useCardsStore((state) => state.cards);
  const addCard = useCardsStore((state) => state.addCard);

  // Estado para Préstamos Bancarios (personal)
  const [selectedBankId, setSelectedBankId] = useState<string>(() =>
    banks && banks.length > 0 ? banks[0].id : ''
  );
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [isInlineBankFormOpen, setIsInlineBankFormOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');

  const [loanConcept, setLoanConcept] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanInstallmentsCount, setLoanInstallmentsCount] = useState('');
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState('');
  const [loanDueDay, setLoanDueDay] = useState('15');

  // Estados para cuota del mes ya pagada / cuotas adelantadas
  const [isCurrentMonthQuotaPaid, setIsCurrentMonthQuotaPaid] = useState<boolean>(false);
  const [initialAdvancePaidCount, setInitialAdvancePaidCount] = useState<string>('1');


  // Campos para 'friend_loan' (conservados intactos)
  const [friendName, setFriendName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [friendInterestRate, setFriendInterestRate] = useState('0');
  const [quickTerm, setQuickTerm] = useState<QuickTerm>('1m');
  const [customDateText, setCustomDateText] = useState('');
  const [selectedFriendSourceBankId, setSelectedFriendSourceBankId] = useState<string | null>(
    () => (banks && banks.length > 0 ? banks[0].id : null)
  );

  // Campos para 'card_charge'
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const [isAddingNewPersonInline, setIsAddingNewPersonInline] = useState(false);
  const [newPersonNameInline, setNewPersonNameInline] = useState('');
  const [selectedCardIdForCharge, setSelectedCardIdForCharge] = useState<string>('');
  const [isCardDropdownOpenForCharge, setIsCardDropdownOpenForCharge] = useState(false);
  const [chargeConcept, setChargeConcept] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeInstallmentsMode, setChargeInstallmentsMode] = useState<'single' | 'installments'>('single');
  const [chargeInstallmentsCount, setChargeInstallmentsCount] = useState<string>('3');

  // Estados para modo deuda antigua (isLegacyMode)
  const [legacyLoanPaidInstallments, setLegacyLoanPaidInstallments] = useState<string>('0');
  const [legacyChargePaidInstallments, setLegacyChargePaidInstallments] = useState<string>('0');
  const [legacyFriendPaidAmount, setLegacyFriendPaidAmount] = useState<string>('0');

  // Estados para el formulario inline de creación de tarjeta en card_charge
  const [isAddingNewCardForCharge, setIsAddingNewCardForCharge] = useState<boolean>(false);
  const [newCardNameForCharge, setNewCardNameForCharge] = useState<string>('');
  const [newCardCutOffDayForCharge, setNewCardCutOffDayForCharge] = useState<string>('20');
  const [selectedBankForNewCardCharge, setSelectedBankForNewCardCharge] = useState<string>('');
  const [isBankDropdownOpenForNewCardCharge, setIsBankDropdownOpenForNewCardCharge] = useState<boolean>(false);
  const [isAddingNewBankInlineForCardCharge, setIsAddingNewBankInlineForCardCharge] = useState<boolean>(false);
  const [newBankNameInlineForCardCharge, setNewBankNameInlineForCardCharge] = useState<string>('');

  // Selección efectiva de Person y Card con fallback automático
  const effectiveSelectedPerson =
    (people || []).find((p) => p.id === selectedPersonId) ?? (people && people.length > 0 ? people[0] : null);
  const effectiveSelectedCard =
    (cards || []).find((c) => c.id === selectedCardIdForCharge) ?? (cards && cards.length > 0 ? cards[0] : null);

  React.useEffect(() => {
    if (!selectedPersonId && people && people.length > 0) {
      setSelectedPersonId(people[0].id);
    }
  }, [selectedPersonId, people]);

  React.useEffect(() => {
    if (!selectedCardIdForCharge && cards && cards.length > 0) {
      setSelectedCardIdForCharge(cards[0].id);
    }
  }, [selectedCardIdForCharge, cards]);

  React.useEffect(() => {
    if (!selectedBankForNewCardCharge && banks && banks.length > 0) {
      setSelectedBankForNewCardCharge(banks[0].id);
    }
  }, [banks, selectedBankForNewCardCharge]);

  const selectedBankForNewCardChargeObj =
    banks.find((b) => b.id === selectedBankForNewCardCharge) ||
    banks.find((b) => b.name === selectedBankForNewCardCharge) ||
    (banks && banks.length > 0 ? banks[0] : null);

  // Banco actualmente seleccionado
  const selectedBank = (banks || []).find((b) => b.id === selectedBankId) ?? (banks || [])[0];

  // Estado de error inline
  const [formError, setFormError] = useState<string | null>(null);

  // Handler para día de pago de préstamo (1 - 31)
  const handleLoanDueDayChange = (text: string): void => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    if (numericOnly === '') {
      setLoanDueDay('');
      return;
    }
    const val = parseInt(numericOnly, 10);
    if (val > 31) {
      setLoanDueDay('31');
    } else {
      setLoanDueDay(numericOnly);
    }
  };

  // Registrar nuevo banco desde mini-formulario inline
  const handleCreateBankInline = (): void => {
    if (!newBankName.trim()) {
      setFormError('Por favor ingresa el nombre del banco.');
      return;
    }
    setFormError(null);
    const createdBank = addBank(newBankName.trim());
    setSelectedBankId(createdBank.id);
    setNewBankName('');
    setIsInlineBankFormOpen(false);
    setIsBankDropdownOpen(false);
  };

  // Registrar nueva persona desde mini-formulario inline
  const handleCreatePersonInline = (): void => {
    if (!newPersonNameInline.trim()) {
      setFormError('Por favor ingresa el nombre del contacto.');
      return;
    }
    setFormError(null);
    const created = addPerson(newPersonNameInline.trim());
    setSelectedPersonId(created.id);
    setNewPersonNameInline('');
    setIsAddingNewPersonInline(false);
    setIsPersonDropdownOpen(false);
  };

  // Manejador para guardar nuevo banco inline en card_charge
  const handleSaveNewBankInlineForCardCharge = (): void => {
    const trimmedBankName = newBankNameInlineForCardCharge.trim();
    if (!trimmedBankName) {
      setFormError('Por favor ingresa el nombre del banco.');
      return;
    }
    setFormError(null);
    const created = addBank(trimmedBankName);
    setSelectedBankForNewCardCharge(created.id);
    setNewBankNameInlineForCardCharge('');
    setIsAddingNewBankInlineForCardCharge(false);
    setIsBankDropdownOpenForNewCardCharge(false);
  };

  // Manejador para guardar nueva tarjeta inline en card_charge
  const handleSaveNewCardForCharge = (): void => {
    const trimmedName = newCardNameForCharge.trim();
    if (!trimmedName) {
      setFormError('Por favor ingresa el nombre de la tarjeta.');
      return;
    }

    const cutOffNum = parseInt(newCardCutOffDayForCharge, 10);
    if (isNaN(cutOffNum) || cutOffNum < 1 || cutOffNum > 31) {
      setFormError('El día de corte debe ser un número entre 1 y 31.');
      return;
    }

    setFormError(null);
    const bankObj =
      banks.find((b) => b.id === selectedBankForNewCardCharge) ||
      banks.find((b) => b.name === selectedBankForNewCardCharge);
    const bankName = bankObj?.name || 'Banco General';

    addCard({
      name: trimmedName,
      bankName,
      cutOffDay: cutOffNum || 20,
    });

    const latestCard = useCardsStore.getState().cards[0];
    if (latestCard) {
      setSelectedCardIdForCharge(latestCard.id);
    }

    setNewCardNameForCharge('');
    setNewCardCutOffDayForCharge('20');
    setIsAddingNewCardForCharge(false);
    setIsCardDropdownOpenForCharge(false);
    setIsBankDropdownOpenForNewCardCharge(false);
    setIsAddingNewBankInlineForCardCharge(false);
    setNewBankNameInlineForCardCharge('');
  };

  // Handler para fecha personalizada con máscara automática DD/MM/AAAA (friend_loan)
  const handleCustomDateChange = (text: string): void => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 8);
    let masked = digitsOnly;
    if (digitsOnly.length > 4) {
      masked = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
    } else if (digitsOnly.length > 2) {
      masked = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
    }
    setCustomDateText(masked);
  };

  // Cálculos en tiempo real para Préstamo Bancario
  const principal = parseFloat(loanPrincipal.replace(',', '.')) || 0;
  const numCuotas = parseInt(loanInstallmentsCount, 10) || 0;
  const cuota = parseFloat(loanMonthlyPayment.replace(',', '.')) || 0;
  const totalPagar = numCuotas * cuota;
  const interesTotal = Math.max(0, totalPagar - principal);
  const pctInteres = principal > 0 ? (interesTotal / principal) * 100 : 0;
  const parsedLegacyLoanPaidInstallments = Math.max(0, parseInt(legacyLoanPaidInstallments, 10) || 0);
  const effectivePaidInstallments = isLegacyMode
    ? parsedLegacyLoanPaidInstallments
    : isCurrentMonthQuotaPaid
    ? Math.max(1, parseInt(initialAdvancePaidCount, 10) || 1)
    : 0;
  const remainingLoanInstallments = Math.max(0, numCuotas - effectivePaidInstallments);
  const remainingLoanTotal = Number((remainingLoanInstallments * cuota).toFixed(2));

  // Cálculos en tiempo real para friend_loan
  const friendPrincipal = parseFloat(principalAmount.replace(',', '.')) || 0;
  const friendRate = parseFloat(friendInterestRate.replace(',', '.')) || 0;
  const friendInterestEarned = friendPrincipal * (friendRate / 100);
  const friendTotalToCollect = friendPrincipal + friendInterestEarned;
  const calculatedDueDate = computeFriendDueDate(quickTerm, customDateText);
  const parsedLegacyFriendPaid = Math.max(0, parseFloat(legacyFriendPaidAmount.replace(',', '.')) || 0);
  const remainingFriendToCollect = Math.max(0, Number((friendTotalToCollect - parsedLegacyFriendPaid).toFixed(2)));

  // Cálculos en tiempo real para card_charge
  const parsedChargeAmount = parseFloat(chargeAmount.replace(',', '.')) || 0;
  const parsedChargeInstallments =
    chargeInstallmentsMode === 'single'
      ? 1
      : Math.max(1, parseInt(chargeInstallmentsCount, 10) || 1);
  const monthlyChargeInstallment =
    parsedChargeInstallments > 0
      ? parsedChargeAmount / parsedChargeInstallments
      : parsedChargeAmount;
  const parsedLegacyChargePaidInstallments = Math.max(0, parseInt(legacyChargePaidInstallments, 10) || 0);
  const remainingChargeInstallments = Math.max(0, parsedChargeInstallments - parsedLegacyChargePaidInstallments);
  const remainingChargeAmount = Number(
    Math.max(0, parsedChargeAmount - parsedLegacyChargePaidInstallments * Number(monthlyChargeInstallment.toFixed(2))).toFixed(2)
  );


  const hasCompleteChargeMainFields =
    Boolean(chargeConcept.trim()) &&
    Boolean(chargeAmount.trim()) &&
    parsedChargeAmount > 0;

  const hasCompletePersonalLoanMainFields =
    Boolean(loanConcept.trim()) &&
    principal > 0 &&
    numCuotas > 0 &&
    cuota > 0;

  const handleSave = (): void => {
    setFormError(null);

    // Si está abierto el registro inline de persona y aún no se llenaron los campos principales del gasto
    if (
      activeTab === 'card_charge' &&
      isPersonDropdownOpen &&
      isAddingNewPersonInline &&
      !hasCompleteChargeMainFields
    ) {
      handleCreatePersonInline();
      return;
    }
    // Si está abierto el registro inline de banco para deuda propia y aún no se llenaron los campos principales
    if (
      activeTab === 'personal' &&
      isBankDropdownOpen &&
      isInlineBankFormOpen &&
      !hasCompletePersonalLoanMainFields
    ) {
      handleCreateBankInline();
      return;
    }
    // Si está abierto el registro inline de banco para la tarjeta y aún no se llenaron los campos principales
    if (
      activeTab === 'card_charge' &&
      isCardDropdownOpenForCharge &&
      isBankDropdownOpenForNewCardCharge &&
      isAddingNewBankInlineForCardCharge &&
      !hasCompleteChargeMainFields
    ) {
      handleSaveNewBankInlineForCardCharge();
      return;
    }
    // Si está abierto el registro inline de tarjeta y aún no se llenaron los campos principales
    if (
      activeTab === 'card_charge' &&
      isCardDropdownOpenForCharge &&
      isAddingNewCardForCharge &&
      !hasCompleteChargeMainFields
    ) {
      handleSaveNewCardForCharge();
      return;
    }

    if (activeTab === 'personal') {
      let bank = (banks || []).find((b) => b.id === selectedBankId)?.name || 'Entidad Financiera';
      if (isInlineBankFormOpen && newBankName.trim()) {
        const createdBank = addBank(newBankName.trim());
        setSelectedBankId(createdBank.id);
        setNewBankName('');
        setIsInlineBankFormOpen(false);
        setIsBankDropdownOpen(false);
        bank = createdBank.name;
      }

      if (!loanConcept.trim()) {
        setFormError('Por favor ingresa el concepto del préstamo.');
        return;
      }

      if (principal <= 0) {
        setFormError('Por favor ingresa un capital prestado válido mayor a 0.');
        return;
      }

      if (numCuotas <= 0) {
        setFormError('Por favor ingresa un número de cuotas válido mayor a 0.');
        return;
      }

      if (cuota <= 0) {
        setFormError('Por favor ingresa el monto de la cuota mensual mayor a 0.');
        return;
      }

      if (isLegacyMode) {
        const alreadyPaidInst = Math.max(0, parseInt(legacyLoanPaidInstallments, 10) || 0);
        const effectivePaid = isCurrentMonthQuotaPaid
          ? Math.max(1, alreadyPaidInst)
          : alreadyPaidInst;
        if (effectivePaid >= numCuotas) {
          setFormError('Las cuotas ya pagadas deben ser menores al total de cuotas.');
          return;
        }
        const remainingInst = numCuotas - effectivePaid;
        const remainingTotal = Number((remainingInst * cuota).toFixed(2));

        addPersonalDebt({
          title: loanConcept.trim(),
          entity: bank,
          category: 'loan',
          debtType: 'installment_loan',
          principalAmount: principal,
          totalAmount: totalPagar,
          remainingAmount: remainingTotal,
          totalInstallments: numCuotas,
          paidInstallments: effectivePaid,
          initialPaidInstallments: effectivePaid,
          lastPaymentDate:
            effectivePaid > 0 || isCurrentMonthQuotaPaid
              ? new Date().toISOString()
              : undefined,
          isPreexisting: true,
          monthlyPayment: cuota,
          dueDay: parseInt(loanDueDay, 10) || 1,
          dueDate: `Día ${loanDueDay || 1} de cada mes`,
          interestRate: parseFloat(pctInteres.toFixed(2)),
          icon: 'cash-outline',
        });
      } else {
        const advancePaid = isCurrentMonthQuotaPaid
          ? Math.max(1, parseInt(initialAdvancePaidCount, 10) || 1)
          : 0;

        if (advancePaid >= numCuotas && numCuotas > 0) {
          setFormError('Las cuotas ya pagadas deben ser menores al total de cuotas.');
          return;
        }

        const remainingInst = Math.max(0, numCuotas - advancePaid);
        const remainingTotal = advancePaid > 0
          ? Number((remainingInst * cuota).toFixed(2))
          : totalPagar;

        const createdDebt = addPersonalDebt({
          title: loanConcept.trim(),
          entity: bank,
          category: 'loan',
          debtType: 'installment_loan',
          principalAmount: principal,
          totalAmount: totalPagar,
          remainingAmount: remainingTotal,
          totalInstallments: numCuotas,
          paidInstallments: advancePaid,
          initialPaidInstallments: advancePaid,
          lastPaymentDate: advancePaid > 0 ? new Date().toISOString() : undefined,
          isPreexisting: false,
          monthlyPayment: cuota,
          dueDay: parseInt(loanDueDay, 10) || 1,
          dueDate: `Día ${loanDueDay || 1} de cada mes`,
          interestRate: parseFloat(pctInteres.toFixed(2)),
          icon: 'cash-outline',
        });

        addTransaction({
          title: `Desembolso: ${loanConcept.trim()} (${bank})`,
          amount: principal,
          type: 'income',
          category: 'Desembolso Préstamo',
          relatedDebtId: createdDebt.id,
          bankId: selectedBankId || undefined,
        });
      }

      router.back();
    } else if (activeTab === 'friend_loan') {
      if (!friendName.trim() || friendPrincipal <= 0) {
        setFormError('Por favor ingresa el nombre de la persona y un monto de capital válido mayor a 0.');
        return;
      }

      if (quickTerm === 'custom' && !calculatedDueDate.isValid) {
        setFormError('Por favor ingresa una fecha límite válida con formato DD/MM/AAAA.');
        return;
      }

      const finalDueDate = calculatedDueDate.isValid
        ? calculatedDueDate.isoString
        : new Date().toISOString().split('T')[0];

      if (isLegacyMode) {
        const alreadyPaidAmt = Math.max(0, parseFloat(legacyFriendPaidAmount.replace(',', '.')) || 0);
        if (alreadyPaidAmt >= friendTotalToCollect) {
          setFormError('El monto ya abonado debe ser menor al total a cobrar.');
          return;
        }

        addFriendLoan({
          friendName: friendName.trim(),
          principalAmount: friendPrincipal,
          interestRate: friendRate,
          dueDate: finalDueDate,
          initialPaidAmount: alreadyPaidAmt,
          isPreexisting: true,
        });
      } else {
        const createdLoan = addFriendLoan({
          friendName: friendName.trim(),
          principalAmount: friendPrincipal,
          interestRate: friendRate,
          dueDate: finalDueDate,
          initialPaidAmount: 0,
          isPreexisting: false,
        });

        addTransaction({
          title: `Préstamo a ${friendName.trim()}`,
          amount: friendPrincipal,
          type: 'expense',
          category: 'Préstamo Otorgado',
          relatedLoanId: createdLoan.id,
          personName: friendName.trim(),
          bankId: selectedFriendSourceBankId || undefined,
        });
      }

      router.back();
    } else if (activeTab === 'card_charge') {
      // Si el usuario tenía texto escrito en newPersonNameInline.trim() pero no pulsó registrar antes de enviar la compra completa:
      // Auto-crear la persona en addPerson(newPersonNameInline.trim()) y seleccionarla automáticamente para no perder el dato escrito.
      let selectedPersonObj = effectiveSelectedPerson;
      if (newPersonNameInline.trim()) {
        const autoCreatedPerson = addPerson(newPersonNameInline.trim());
        setSelectedPersonId(autoCreatedPerson.id);
        setNewPersonNameInline('');
        setIsAddingNewPersonInline(false);
        setIsPersonDropdownOpen(false);
        selectedPersonObj = autoCreatedPerson;
      }

      let selectedCardObj = effectiveSelectedCard;
      if (isAddingNewCardForCharge && newCardNameForCharge.trim()) {
        const cutOffNum = parseInt(newCardCutOffDayForCharge, 10);
        let resolvedBankName =
          banks.find((b) => b.id === selectedBankForNewCardCharge)?.name ||
          banks.find((b) => b.name === selectedBankForNewCardCharge)?.name ||
          'Banco General';
        if (isAddingNewBankInlineForCardCharge && newBankNameInlineForCardCharge.trim()) {
          const createdBank = addBank(newBankNameInlineForCardCharge.trim());
          resolvedBankName = createdBank.name;
        }
        addCard({
          name: newCardNameForCharge.trim(),
          bankName: resolvedBankName,
          cutOffDay: !isNaN(cutOffNum) && cutOffNum >= 1 && cutOffNum <= 31 ? cutOffNum : 20,
        });
        const latestCard = useCardsStore.getState().cards[0];
        if (latestCard) {
          setSelectedCardIdForCharge(latestCard.id);
          selectedCardObj = latestCard;
        }
        setNewCardNameForCharge('');
        setIsAddingNewCardForCharge(false);
        setIsCardDropdownOpenForCharge(false);
      }

      const parsedAmount = parseFloat(chargeAmount.replace(',', '.'));

      if (!selectedPersonObj) {
        setFormError('Por favor selecciona o registra a la persona responsable.');
        return;
      }

      if (!chargeConcept.trim()) {
        setFormError('Por favor ingresa el concepto de la compra.');
        return;
      }

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setFormError('Por favor ingresa un monto total válido mayor a 0.');
        return;
      }

      if (!selectedCardObj && cards && cards.length > 0) {
        setFormError('Por favor selecciona la tarjeta utilizada para la compra.');
        return;
      }

      const installments =
        chargeInstallmentsMode === 'single'
          ? 1
          : Math.max(1, parseInt(chargeInstallmentsCount, 10) || 1);

      if (isLegacyMode) {
        const alreadyPaidChargeInst = Math.max(0, parseInt(legacyChargePaidInstallments, 10) || 0);
        if (installments > 1 && alreadyPaidChargeInst >= installments) {
          setFormError('Las cuotas ya pagadas deben ser menores al total de cuotas.');
          return;
        }
        const monthlyAmt = Number((parsedAmount / installments).toFixed(2));
        const remAmt = Number(Math.max(0, parsedAmount - alreadyPaidChargeInst * monthlyAmt).toFixed(2));

        addThirdPartyCharge({
          personName: selectedPersonObj.name,
          personId: selectedPersonObj.id,
          cardName: selectedCardObj
            ? `${selectedCardObj.name} (${selectedCardObj.bankName})`
            : 'Tarjeta de Crédito',
          cardId: selectedCardObj?.id,
          concept: chargeConcept.trim(),
          amount: parsedAmount,
          installmentsCount: installments,
          paidInstallmentsCount: alreadyPaidChargeInst,
          remainingAmount: remAmt,
        });
      } else {
        addThirdPartyCharge({
          personName: selectedPersonObj.name,
          personId: selectedPersonObj.id,
          cardName: selectedCardObj
            ? `${selectedCardObj.name} (${selectedCardObj.bankName})`
            : 'Tarjeta de Crédito',
          cardId: selectedCardObj?.id,
          concept: chargeConcept.trim(),
          amount: parsedAmount,
          installmentsCount: installments,
        });
      }

      router.back();
    }
  };

  const activeColor = TAB_CONFIG[activeTab].color;
  const saveButtonLabel =
    activeTab === 'card_charge' &&
    isPersonDropdownOpen &&
    isAddingNewPersonInline &&
    !hasCompleteChargeMainFields
      ? 'REGISTRAR PERSONA'
      : activeTab === 'personal' &&
          isBankDropdownOpen &&
          isInlineBankFormOpen &&
          !hasCompletePersonalLoanMainFields
        ? 'GUARDAR BANCO'
        : activeTab === 'card_charge' &&
            isCardDropdownOpenForCharge &&
            isBankDropdownOpenForNewCardCharge &&
            isAddingNewBankInlineForCardCharge &&
            !hasCompleteChargeMainFields
          ? 'GUARDAR BANCO'
          : activeTab === 'card_charge' &&
              isCardDropdownOpenForCharge &&
              isAddingNewCardForCharge &&
              !hasCompleteChargeMainFields
            ? 'GUARDAR TARJETA'
            : activeTab === 'card_charge'
              ? 'GUARDAR CARGO EN TARJETA'
              : 'GUARDAR DEUDA';

  const modalFormContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}
      style={styles.keyboardContainer}
    >
      {/* Indicador de arrastre */}
      <View style={styles.dragIndicatorContainer}>
        <View style={styles.dragIndicator} />
      </View>

      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name={isLegacyMode ? 'time-outline' : 'add-circle'}
            size={22}
            color={isLegacyMode ? '#FF9F0A' : activeColor}
          />
          <Text style={styles.headerTitle}>
            {isLegacyMode ? 'DEUDA / COMPRA PREEXISTENTE' : 'NUEVA DEUDA'}
          </Text>
        </View>
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
        {isLegacyMode && (
          <View style={styles.legacyModeBanner}>
            <Text style={styles.legacyModeBannerText}>
              🕒 Modo Deuda Antigua: Registra préstamos o compras en curso de meses anteriores. No afectará tu saldo disponible de hoy; solo controlará las cuotas o saldos restantes.
            </Text>
          </View>
        )}
        {/* Selector de tipo principal / pestaña */}
        <View style={styles.tabSelectorContainer}>
          {(['personal', 'friend_loan', 'card_charge'] as const).map((tab) => {
            const isSelected = activeTab === tab;
            const tabInfo = TAB_CONFIG[tab];
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  isSelected && {
                    backgroundColor: `${tabInfo.color}1A`,
                    borderColor: tabInfo.color,
                  },
                ]}
                onPress={() => {
                  if (newPersonNameInline.trim()) {
                    const created = addPerson(newPersonNameInline.trim());
                    setSelectedPersonId(created.id);
                    setNewPersonNameInline('');
                  }
                  setIsPersonDropdownOpen(false);
                  setIsAddingNewPersonInline(false);
                  setIsCardDropdownOpenForCharge(false);
                  setIsAddingNewCardForCharge(false);
                  setIsBankDropdownOpenForNewCardCharge(false);
                  setIsAddingNewBankInlineForCardCharge(false);
                  setIsBankDropdownOpen(false);
                  setIsInlineBankFormOpen(false);
                  setActiveTab(tab);
                  setFormError(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tabInfo.icon}
                  size={16}
                  color={isSelected ? tabInfo.color : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    isSelected && { color: tabInfo.color, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {tabInfo.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PESTAÑA: DEUDA PROPIA */}
        {activeTab === 'personal' && (
          <View style={styles.sectionContainer}>

                {/* Selector Colapsable de Bancos */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>BANCO / ENTIDAD FINANCIERA *</Text>
                  <View style={styles.dropdownWrapper}>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => {
                        const nextOpen = !isBankDropdownOpen;
                        setIsBankDropdownOpen(nextOpen);
                        if (!nextOpen) {
                          setIsInlineBankFormOpen(false);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dropdownTriggerLeft}>
                        <View style={styles.bankIconCircle}>
                          <Ionicons name="business-outline" size={18} color="#00FFA3" />
                        </View>
                        <View style={styles.dropdownTriggerTextCol}>
                          <Text style={styles.dropdownTriggerTitle} numberOfLines={1}>
                            {selectedBank ? selectedBank.name : 'Selecciona un banco'}
                          </Text>
                          <Text style={styles.dropdownTriggerSubtitle}>
                            Entidad financiera vinculada
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={isBankDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isBankDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        {banks && banks.length > 0 ? (
                          banks.map((b) => {
                            const isSelected = selectedBank?.id === b.id;
                            return (
                              <TouchableOpacity
                                key={b.id}
                                style={[
                                  styles.dropdownItem,
                                  isSelected && styles.dropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setSelectedBankId(b.id);
                                  setIsBankDropdownOpen(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.dropdownItemLeft}>
                                  <Ionicons
                                    name="business-outline"
                                    size={16}
                                    color={isSelected ? '#00FFA3' : colors.textSecondary}
                                  />
                                  <Text
                                    style={[
                                      styles.dropdownItemName,
                                      isSelected && styles.dropdownItemNameActive,
                                    ]}
                                  >
                                    {b.name}
                                  </Text>
                                </View>
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color="#00FFA3"
                                  />
                                )}
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={styles.dropdownEmpty}>
                            <Text style={styles.dropdownEmptyText}>
                              No hay bancos registrados
                            </Text>
                          </View>
                        )}

                        {/* Opción inline al final: [ ➕ Registrar nuevo banco ] */}
                        {!isInlineBankFormOpen ? (
                          <TouchableOpacity
                            style={styles.addBankButton}
                            onPress={() => setIsInlineBankFormOpen(true)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add-circle" size={18} color="#00FFA3" />
                            <Text style={styles.addBankButtonText}>
                              ➕ Registrar nuevo banco
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.inlineFormContainer}>
                            <View style={styles.inlineFormHeader}>
                              <Text style={styles.inlineFormTitle}>
                                REGISTRAR NUEVO BANCO
                              </Text>
                              <TouchableOpacity
                                onPress={() => setIsInlineBankFormOpen(false)}
                              >
                                <Ionicons
                                  name="close-circle-outline"
                                  size={20}
                                  color={colors.textSecondary}
                                />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.inlineFormField}>
                              <Text style={styles.inlineFieldLabel}>
                                NOMBRE DEL BANCO
                              </Text>
                              <TextInput
                                style={styles.inlineInput}
                                value={newBankName}
                                onChangeText={setNewBankName}
                                placeholder="Ej: Banco Santander, Nubank"
                                placeholderTextColor={colors.textSecondary}
                              />
                            </View>

                            <TouchableOpacity
                              style={styles.saveBankInlineButton}
                              onPress={handleCreateBankInline}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="checkmark" size={16} color="#121212" />
                              <Text style={styles.saveBankInlineButtonText}>
                                Guardar Banco
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Concepto del Préstamo */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CONCEPTO DEL PRÉSTAMO *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={loanConcept}
                    onChangeText={setLoanConcept}
                    placeholder="Ej: Préstamo Personal, Crédito Vehicular, Libre Inversión"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Capital Prestado Original ($) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CAPITAL PRESTADO ($) *</Text>
                  <View style={styles.amountInputWrapper}>
                    <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                    <TextInput
                      style={[styles.textInput, styles.amountInput]}
                      value={loanPrincipal}
                      onChangeText={setLoanPrincipal}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Fila: Número de Cuotas y Monto de la Cuota Mensual */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>NÚMERO TOTAL DE CUOTAS *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={loanInstallmentsCount}
                      onChangeText={setLoanInstallmentsCount}
                      placeholder="Ej: 24, 36, 48"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>VALOR CUOTA MENSUAL ($) *</Text>
                    <View style={styles.amountInputWrapper}>
                      <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                      <TextInput
                        style={[styles.textInput, styles.amountInput]}
                        value={loanMonthlyPayment}
                        onChangeText={setLoanMonthlyPayment}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                {isLegacyMode && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>CUOTAS YA PAGADAS ANTES DE HOY</Text>
                    <TextInput
                      style={styles.textInput}
                      value={legacyLoanPaidInstallments}
                      onChangeText={(t) => setLegacyLoanPaidInstallments(t.replace(/[^0-9]/g, ''))}
                      placeholder="Ej: 4"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                )}

                {/* Día de Pago del Mes (1 - 31) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>DÍA DE PAGO MENSUAL (1 - 31) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={loanDueDay}
                    onChangeText={handleLoanDueDayChange}
                    placeholder="Ej: 5 o 20"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>

                {/* Selector Cyberpunk: ¿Cuota de este mes ya pagada? */}
                <View style={styles.advanceQuotaSwitchCard}>
                  <View style={styles.advanceQuotaSwitchHeader}>
                    <View style={styles.advanceQuotaSwitchLeft}>
                      <View
                        style={[
                          styles.advanceQuotaIconWrapper,
                          isCurrentMonthQuotaPaid && styles.advanceQuotaIconWrapperActive,
                        ]}
                      >
                        <Ionicons
                          name="checkmark-done-circle-outline"
                          size={18}
                          color={isCurrentMonthQuotaPaid ? '#00FFA3' : colors.textSecondary}
                        />
                      </View>
                      <View style={styles.advanceQuotaTextCol}>
                        <Text style={styles.advanceQuotaTitle}>
                          ¿Cuota de este mes ya pagada?
                        </Text>
                        <Text style={styles.advanceQuotaSubtitle}>
                          {isCurrentMonthQuotaPaid
                            ? 'Marcada como pagada. Se proyectará el próximo vencimiento al mes siguiente.'
                            : 'Márcalo si ya abonaste este mes para proyectar el próximo vencimiento.'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.cyberpunkSwitchTrack,
                        isCurrentMonthQuotaPaid && styles.cyberpunkSwitchTrackActive,
                      ]}
                      onPress={() => setIsCurrentMonthQuotaPaid(!isCurrentMonthQuotaPaid)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.cyberpunkSwitchThumb,
                          isCurrentMonthQuotaPaid && styles.cyberpunkSwitchThumbActive,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Sub-selector opcional de cuotas adelantadas si está activo y no es legacy */}
                  {isCurrentMonthQuotaPaid && !isLegacyMode && numCuotas > 1 && (
                    <View style={styles.advanceInstallmentSubBox}>
                      <View style={styles.advanceInstallmentRow}>
                        <Text style={styles.advanceInstallmentLabel}>
                          Cuotas pagadas hasta la fecha:
                        </Text>
                        <View style={styles.advanceInstallmentCounter}>
                          <TouchableOpacity
                            style={styles.advanceCounterBtn}
                            onPress={() => {
                              const curr = parseInt(initialAdvancePaidCount, 10) || 1;
                              if (curr > 1) {
                                setInitialAdvancePaidCount(String(curr - 1));
                              }
                            }}
                            disabled={(parseInt(initialAdvancePaidCount, 10) || 1) <= 1}
                          >
                            <Ionicons name="remove" size={14} color="#00FFA3" />
                          </TouchableOpacity>
                          <Text style={styles.advanceCounterValue}>
                            {initialAdvancePaidCount}
                          </Text>
                          <TouchableOpacity
                            style={styles.advanceCounterBtn}
                            onPress={() => {
                              const curr = parseInt(initialAdvancePaidCount, 10) || 1;
                              if (curr < numCuotas - 1) {
                                setInitialAdvancePaidCount(String(curr + 1));
                              }
                            }}
                            disabled={(parseInt(initialAdvancePaidCount, 10) || 1) >= numCuotas - 1}
                          >
                            <Ionicons name="add" size={14} color="#00FFA3" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.advanceInstallmentSubHint}>
                        {`Se descontarán ${currencySymbol}${formatAmount(
                          (parseInt(initialAdvancePaidCount, 10) || 1) * cuota
                        )} del saldo exigible sin generar egresos bancarios ficticios.`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Tarjeta de Cálculo en Vivo (Acento Neón #00FFA3 / #0A84FF) */}
                {principal > 0 && numCuotas > 0 && cuota > 0 && (
                  <View style={styles.loanCalculationCard}>
                    <View style={styles.calculationHeader}>
                      <Ionicons name="calculator-outline" size={18} color="#00FFA3" />
                      <Text style={styles.loanCalculationTitle}>
                        CÁLCULO EN VIVO DEL PRÉSTAMO
                      </Text>
                    </View>
                    <View style={styles.calculationDetailRow}>
                      <Text style={styles.calculationDetailLabel}>
                        Total a devolver al banco:
                      </Text>
                      <Text style={styles.loanTotalToPayText}>
                        {currencySymbol}{totalPagar.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.calculationDetailRow}>
                      <Text style={styles.calculationDetailLabel}>
                        Intereses generados (+{pctInteres.toFixed(1)}%):
                      </Text>
                      <Text style={styles.loanInterestText}>
                        +{currencySymbol}{interesTotal.toFixed(2)}
                      </Text>
                    </View>
                    {effectivePaidInstallments > 0 && (
                      <>
                        <View style={styles.calculationDetailRow}>
                          <Text style={styles.calculationDetailLabel}>
                            Cuotas ya amortizadas:
                          </Text>
                          <Text style={styles.loanUpToDateHighlightNeon}>
                            {effectivePaidInstallments} de {numCuotas} cuotas (Al día este mes)
                          </Text>
                        </View>
                        <View style={styles.calculationDetailRow}>
                          <Text style={styles.calculationDetailLabel}>
                            Saldo exigible que se registrará:
                          </Text>
                          <Text style={styles.loanTotalToPayText}>
                            {currencySymbol}{formatAmount(remainingLoanTotal)}
                          </Text>
                        </View>
                        <View style={styles.calculationDetailRow}>
                          <Text style={styles.calculationDetailLabel}>
                            Próximo vencimiento:
                          </Text>
                          <Text style={styles.loanUpToDateHighlightNeon}>
                            Proyectado al mes siguiente
                          </Text>
                        </View>
                      </>
                    )}
                    <View style={styles.calculationDetailRow}>
                      <Text style={styles.calculationDetailLabel}>
                        Día de pago:
                      </Text>
                      <Text style={styles.loanDueDayHighlight}>
                        {loanDueDay || '1'} de cada mes
                      </Text>
                    </View>
                    <Text style={styles.loanInstallmentSummary}>
                      {numCuotas} cuotas de {currencySymbol}{cuota.toFixed(2)}
                    </Text>
                    {!isLegacyMode && (
                      <View style={styles.cashflowIncomeNotice}>
                        <Text style={styles.cashflowIncomeNoticeText}>
                          {`💰 Al guardar, el capital prestado (+${currencySymbol}${formatAmount(principal)}) se acreditará como ingreso en tu balance disponible.`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.helperText}>
                  💡 Se configurará el seguimiento de amortización mensual con débito recurrente y proyección de saldo.
                </Text>
          </View>
        )}

        {/* PESTAÑA: PRÉSTAMO A AMIGO */}
        {activeTab === 'friend_loan' && (
          <View style={styles.sectionContainer}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOMBRE DE LA PERSONA / AMIGO *</Text>
              <TextInput
                style={styles.textInput}
                value={friendName}
                onChangeText={setFriendName}
                placeholder="ej: Andrés Gómez"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>CAPITAL PRESTADO *</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.textInput, styles.amountInput]}
                    value={principalAmount}
                    onChangeText={setPrincipalAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>% INTERÉS PACTADO</Text>
                <TextInput
                  style={styles.textInput}
                  value={friendInterestRate}
                  onChangeText={setFriendInterestRate}
                  placeholder="ej: 5.5"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {isLegacyMode && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {`MONTO YA ABONADO ANTES DE HOY (${currencySymbol})`}
                </Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.textInput, styles.amountInput]}
                    value={legacyFriendPaidAmount}
                    onChangeText={setLegacyFriendPaidAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}

            {!isLegacyMode && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>¿DE QUÉ CUENTA BANCARIA SALE EL DINERO PRESTADO?</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickTermScrollContent}
                >
                  <TouchableOpacity
                    style={[
                      styles.friendBankPill,
                      selectedFriendSourceBankId === null && styles.friendBankPillActive,
                    ]}
                    onPress={() => setSelectedFriendSourceBankId(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={14}
                      color={selectedFriendSourceBankId === null ? '#00FFA3' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.friendBankPillText,
                        selectedFriendSourceBankId === null && styles.friendBankPillTextActive,
                      ]}
                    >
                      Efectivo en mano
                    </Text>
                  </TouchableOpacity>

                  {banks.map((b) => {
                    const isSelected = selectedFriendSourceBankId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.friendBankPill,
                          isSelected && styles.friendBankPillActive,
                        ]}
                        onPress={() => setSelectedFriendSourceBankId(b.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color={isSelected ? '#00FFA3' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.friendBankPillText,
                            isSelected && styles.friendBankPillTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Plazo de cobro estimado / Píldoras horizontales */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PLAZO DE COBRO ESTIMADO</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickTermScrollContent}
              >
                {QUICK_TERM_OPTIONS.map((opt) => {
                  const isSelected = quickTerm === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.quickTermPill,
                        isSelected && styles.quickTermPillActive,
                      ]}
                      onPress={() => setQuickTerm(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.id === 'custom' ? 'calendar-outline' : 'time-outline'}
                        size={14}
                        color={isSelected ? '#0A84FF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.quickTermPillText,
                          isSelected && styles.quickTermPillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Input de fecha personalizada con máscara si quickTerm === 'custom' */}
            {quickTerm === 'custom' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>FECHA LÍMITE (DD/MM/AAAA) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={customDateText}
                  onChangeText={handleCustomDateChange}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            )}

            {/* Tarjeta informativa en tiempo real con acento azul */}
            <View style={styles.calculationCard}>
              <View style={styles.calculationHeader}>
                <Ionicons name="calculator-outline" size={18} color="#0A84FF" />
                <Text style={styles.calculationTitle}>CÁLCULO EN TIEMPO REAL</Text>
              </View>
              <Text style={styles.calculationDetailText}>
                Capital: {currencySymbol}{friendPrincipal.toFixed(2)} | Interés Ganado (+{friendRate.toFixed(2)}%): {currencySymbol}{friendInterestEarned.toFixed(2)}
              </Text>
              <Text style={styles.calculationTotalText}>
                TOTAL A COBRAR: {currencySymbol}{friendTotalToCollect.toFixed(2)}
              </Text>
              {isLegacyMode && (
                <Text style={styles.calculationTotalText}>
                  SALDO PENDIENTE REAL POR COBRAR: {currencySymbol}{formatAmount(remainingFriendToCollect)}
                </Text>
              )}
              <View style={styles.dueRealtimeRow}>
                <Ionicons name="calendar-outline" size={15} color="#0A84FF" />
                <Text style={styles.dueRealtimeText}>
                  {calculatedDueDate.isValid
                    ? `📅 Fecha de cobro acordada: ${calculatedDueDate.formattedDate} (${calculatedDueDate.daysText})`
                    : '📅 Fecha de cobro acordada: Por definir (ingresa fecha DD/MM/AAAA)'}
                </Text>
              </View>
              {!isLegacyMode && friendPrincipal > 0 && (
                <View style={styles.cashflowExpenseNotice}>
                  <Text style={styles.cashflowExpenseNoticeText}>
                    {`💸 Al guardar, el capital prestado (-${currencySymbol}${formatAmount(friendPrincipal)}) se descontará como salida en tus movimientos.`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PESTAÑA: GASTO COMPARTIDO EN TARJETA */}
        {activeTab === 'card_charge' && (
          <View style={styles.sectionContainer}>
            <View style={styles.bannerContainer}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#00FFA3"
                style={styles.bannerIcon}
              />
              <Text style={styles.bannerText}>
                Registra compras que hiciste con tu tarjeta de crédito para amigos o familiares y gestiona su reembolso al corte o en cuotas.
              </Text>
            </View>

            {/* 1. Selector Colapsable de Persona */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PERSONA RESPONSABLE / CONTACTO *</Text>
              <View style={styles.dropdownWrapper}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    const nextOpen = !isPersonDropdownOpen;
                    setIsPersonDropdownOpen(nextOpen);
                    if (!nextOpen) {
                      if (newPersonNameInline.trim()) {
                        const created = addPerson(newPersonNameInline.trim());
                        setSelectedPersonId(created.id);
                      }
                      setIsAddingNewPersonInline(false);
                      setNewPersonNameInline('');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownTriggerLeft}>
                    <View style={styles.personIconCircle}>
                      <Ionicons name="person-outline" size={18} color="#00FFA3" />
                    </View>
                    <View style={styles.dropdownTriggerTextCol}>
                      <Text style={styles.dropdownTriggerTitle} numberOfLines={1}>
                        {effectiveSelectedPerson ? effectiveSelectedPerson.name : 'Selecciona una persona'}
                      </Text>
                      <Text style={styles.dropdownTriggerSubtitle}>
                        Amigo o familiar a cargo del reembolso
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isPersonDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {isPersonDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {people && people.length > 0 ? (
                      people.map((p) => {
                        const isSelected = effectiveSelectedPerson?.id === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                            ]}
                            onPress={() => {
                              setSelectedPersonId(p.id);
                              setIsPersonDropdownOpen(false);
                              setIsAddingNewPersonInline(false);
                              setNewPersonNameInline('');
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.dropdownItemLeft}>
                              <Ionicons
                                name="person-outline"
                                size={16}
                                color={isSelected ? '#00FFA3' : colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.dropdownItemName,
                                  isSelected && styles.dropdownItemNameActive,
                                ]}
                              >
                                {p.name}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#00FFA3"
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.dropdownEmpty}>
                        <Text style={styles.dropdownEmptyText}>
                          No hay contactos registrados
                        </Text>
                      </View>
                    )}

                    {/* Opción inline: [ ➕ Registrar nueva persona ] */}
                    {!isAddingNewPersonInline ? (
                      <TouchableOpacity
                        style={styles.addBankButton}
                        onPress={() => setIsAddingNewPersonInline(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle" size={18} color="#00FFA3" />
                        <Text style={styles.addBankButtonText}>
                          ➕ Registrar nueva persona
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.inlineFormContainer}>
                        <View style={styles.inlineFormHeader}>
                          <Text style={styles.inlineFormTitle}>
                            REGISTRAR NUEVO CONTACTO
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setIsAddingNewPersonInline(false);
                              setNewPersonNameInline('');
                            }}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.inlineFormField}>
                          <Text style={styles.inlineFieldLabel}>
                            NOMBRE COMPLETO
                          </Text>
                          <TextInput
                            style={styles.inlineInput}
                            value={newPersonNameInline}
                            onChangeText={setNewPersonNameInline}
                            placeholder="Ej: Sofia Herrera"
                            placeholderTextColor={colors.textSecondary}
                            autoFocus={true}
                            returnKeyType="done"
                            onSubmitEditing={handleCreatePersonInline}
                          />
                        </View>

                        <View style={styles.inlineCardActionRow}>
                          <TouchableOpacity
                            style={styles.inlineCardCancelButton}
                            onPress={() => {
                              setIsAddingNewPersonInline(false);
                              setNewPersonNameInline('');
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.inlineCardCancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.inlineCardSaveButton}
                            onPress={handleCreatePersonInline}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark" size={16} color="#121212" />
                            <Text style={styles.inlineCardSaveButtonText}>Registrar Persona</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* 2. Selector Colapsable de Tarjeta */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TARJETA DE CRÉDITO UTILIZADA *</Text>
              <View style={styles.dropdownWrapper}>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => {
                    const nextOpen = !isCardDropdownOpenForCharge;
                    setIsCardDropdownOpenForCharge(nextOpen);
                    if (!nextOpen) {
                      setIsAddingNewCardForCharge(false);
                      setIsBankDropdownOpenForNewCardCharge(false);
                      setIsAddingNewBankInlineForCardCharge(false);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownTriggerLeft}>
                    <View style={styles.cardIconCircle}>
                      <Ionicons name="card-outline" size={18} color="#00FFA3" />
                    </View>
                    <View style={styles.dropdownTriggerTextCol}>
                      <Text style={styles.dropdownTriggerTitle} numberOfLines={1}>
                        {effectiveSelectedCard
                          ? `${effectiveSelectedCard.name} • ${effectiveSelectedCard.bankName}`
                          : 'Selecciona una tarjeta'}
                      </Text>
                      <Text style={styles.dropdownTriggerSubtitle}>
                        {effectiveSelectedCard
                          ? `Corte mensual: día ${effectiveSelectedCard.cutOffDay}`
                          : 'Tarjeta donde se efectuó la compra'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isCardDropdownOpenForCharge ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {isCardDropdownOpenForCharge && (
                  <View style={styles.dropdownMenu}>
                    {!isAddingNewCardForCharge ? (
                      <>
                        {cards && cards.length > 0 ? (
                          cards.map((c) => {
                            const isSelected = effectiveSelectedCard?.id === c.id;
                            return (
                              <TouchableOpacity
                                key={c.id}
                                style={[
                                  styles.dropdownItem,
                                  isSelected && styles.dropdownItemSelected,
                                ]}
                                onPress={() => {
                                  setSelectedCardIdForCharge(c.id);
                                  setIsCardDropdownOpenForCharge(false);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.dropdownItemLeft}>
                                  <Ionicons
                                    name="card-outline"
                                    size={16}
                                    color={isSelected ? '#00FFA3' : colors.textSecondary}
                                  />
                                  <View>
                                    <Text
                                      style={[
                                        styles.dropdownItemName,
                                        isSelected && styles.dropdownItemNameActive,
                                      ]}
                                    >
                                      {c.name}
                                    </Text>
                                    <Text style={styles.dropdownItemSub}>
                                      {c.bankName} • Corte día {c.cutOffDay}
                                    </Text>
                                  </View>
                                </View>
                                {isSelected && (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={18}
                                    color="#00FFA3"
                                  />
                                )}
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={styles.dropdownEmpty}>
                            <Text style={styles.dropdownEmptyText}>
                              No tienes tarjetas registradas
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.addBankButton}
                          onPress={() => setIsAddingNewCardForCharge(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add-circle" size={18} color="#00FFA3" />
                          <Text style={styles.addBankButtonText}>
                            ➕ Registrar nueva tarjeta
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.inlineFormContainer}>
                        <View style={styles.inlineFormHeader}>
                          <Text style={styles.inlineFormTitle}>
                            REGISTRAR NUEVA TARJETA
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setIsAddingNewCardForCharge(false);
                              setIsBankDropdownOpenForNewCardCharge(false);
                              setIsAddingNewBankInlineForCardCharge(false);
                              setNewCardNameForCharge('');
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Campo de texto: Nombre de la tarjeta */}
                        <View style={styles.inlineFormField}>
                          <Text style={styles.inlineFieldLabel}>
                            NOMBRE DE LA TARJETA
                          </Text>
                          <TextInput
                            style={styles.inlineInput}
                            value={newCardNameForCharge}
                            onChangeText={setNewCardNameForCharge}
                            placeholder="Ej: Visa Signature"
                            placeholderTextColor={colors.textSecondary}
                          />
                        </View>

                        {/* Selector desplegable para Banco Emisor */}
                        <View style={styles.inlineFormField}>
                          <Text style={styles.inlineFieldLabel}>BANCO EMISOR</Text>
                          <TouchableOpacity
                            style={styles.bankDropdownTrigger}
                            onPress={() =>
                              setIsBankDropdownOpenForNewCardCharge(!isBankDropdownOpenForNewCardCharge)
                            }
                            activeOpacity={0.7}
                          >
                            <View style={styles.bankDropdownTriggerLeft}>
                              <Ionicons name="business-outline" size={16} color="#00FFA3" />
                              <Text style={styles.bankDropdownTriggerText} numberOfLines={1}>
                                {selectedBankForNewCardChargeObj?.name || 'Seleccionar banco'}
                              </Text>
                            </View>
                            <Ionicons
                              name={isBankDropdownOpenForNewCardCharge ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>

                          {isBankDropdownOpenForNewCardCharge && (
                            <View style={styles.bankDropdownMenu}>
                              {banks.map((b) => {
                                const isSelected =
                                  selectedBankForNewCardCharge === b.id ||
                                  selectedBankForNewCardCharge === b.name;
                                return (
                                  <TouchableOpacity
                                    key={b.id}
                                    style={[
                                      styles.bankDropdownItem,
                                      isSelected && styles.bankDropdownItemSelected,
                                    ]}
                                    onPress={() => {
                                      setSelectedBankForNewCardCharge(b.id);
                                      setIsBankDropdownOpenForNewCardCharge(false);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.bankDropdownItemLeft}>
                                      <Ionicons
                                        name="business-outline"
                                        size={14}
                                        color={isSelected ? '#00FFA3' : colors.textSecondary}
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
                                      <Ionicons name="checkmark-circle" size={14} color="#00FFA3" />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}

                              {!isAddingNewBankInlineForCardCharge ? (
                                <TouchableOpacity
                                  style={styles.addNewBankButton}
                                  onPress={() => setIsAddingNewBankInlineForCardCharge(true)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="add-circle-outline" size={14} color="#00FFA3" />
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
                                        setIsAddingNewBankInlineForCardCharge(false);
                                        setNewBankNameInlineForCardCharge('');
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
                                    value={newBankNameInlineForCardCharge}
                                    onChangeText={setNewBankNameInlineForCardCharge}
                                    placeholder="Nombre del banco (ej. Scotia)"
                                    placeholderTextColor={colors.textSecondary}
                                    autoFocus
                                  />
                                  <TouchableOpacity
                                    style={styles.inlineBankSaveButton}
                                    onPress={handleSaveNewBankInlineForCardCharge}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="checkmark" size={14} color="#121212" />
                                    <Text style={styles.inlineBankSaveButtonText}>Guardar Banco</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          )}
                        </View>

                        {/* Campo de Día de Corte (1 al 31) */}
                        <View style={styles.inlineFormField}>
                          <Text style={styles.inlineFieldLabel}>DÍA DE CORTE (1 - 31)</Text>
                          <TextInput
                            style={styles.inlineInput}
                            value={newCardCutOffDayForCharge}
                            onChangeText={(val) => {
                              const numOnly = val.replace(/[^0-9]/g, '');
                              if (numOnly === '') {
                                setNewCardCutOffDayForCharge('');
                                return;
                              }
                              const num = parseInt(numOnly, 10);
                              if (num > 31) {
                                setNewCardCutOffDayForCharge('31');
                              } else {
                                setNewCardCutOffDayForCharge(num.toString());
                              }
                            }}
                            placeholder="20"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                        </View>

                        {/* Botones de acción: Cancelar y Guardar Tarjeta */}
                        <View style={styles.inlineCardActionRow}>
                          <TouchableOpacity
                            style={styles.inlineCardCancelButton}
                            onPress={() => {
                              setIsAddingNewCardForCharge(false);
                              setIsBankDropdownOpenForNewCardCharge(false);
                              setIsAddingNewBankInlineForCardCharge(false);
                              setNewCardNameForCharge('');
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.inlineCardCancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.inlineCardSaveButton}
                            onPress={handleSaveNewCardForCharge}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark" size={16} color="#121212" />
                            <Text style={styles.inlineCardSaveButtonText}>Guardar Tarjeta</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* 3. Concepto del Gasto */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONCEPTO DE LA COMPRA *</Text>
              <TextInput
                style={styles.textInput}
                value={chargeConcept}
                onChangeText={setChargeConcept}
                placeholder="Ej: Zapatillas Nike, Cena Cumpleaños, Boleto de avión..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* 4. Monto Total de la Compra */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MONTO TOTAL ($) *</Text>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                <TextInput
                  style={[styles.textInput, styles.amountInput]}
                  value={chargeAmount}
                  onChangeText={setChargeAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* 5. Modalidad de Pago de la Persona */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MODALIDAD DE COBRO A LA PERSONA *</Text>
              <View style={styles.installmentModeRow}>
                <TouchableOpacity
                  style={[
                    styles.installmentModePill,
                    chargeInstallmentsMode === 'single' && styles.installmentModePillActive,
                  ]}
                  onPress={() => setChargeInstallmentsMode('single')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="flash-outline"
                    size={16}
                    color={chargeInstallmentsMode === 'single' ? '#00FFA3' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.installmentModePillText,
                      chargeInstallmentsMode === 'single' && styles.installmentModePillTextActive,
                    ]}
                  >
                    1 Cuota (Cierre del mes)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.installmentModePill,
                    chargeInstallmentsMode === 'installments' && styles.installmentModePillActive,
                  ]}
                  onPress={() => setChargeInstallmentsMode('installments')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={chargeInstallmentsMode === 'installments' ? '#00FFA3' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.installmentModePillText,
                      chargeInstallmentsMode === 'installments' && styles.installmentModePillTextActive,
                    ]}
                  >
                    Diferido a Cuotas
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {chargeInstallmentsMode === 'installments' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NÚMERO DE CUOTAS MENSUALES *</Text>
                <TextInput
                  style={styles.textInput}
                  value={chargeInstallmentsCount}
                  onChangeText={(t) => setChargeInstallmentsCount(t.replace(/[^0-9]/g, ''))}
                  placeholder="Ej: 3, 6, 12"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            )}

            {isLegacyMode && parsedChargeInstallments > 1 && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CUOTAS YA PAGADAS EN MESES ANTERIORES</Text>
                <TextInput
                  style={styles.textInput}
                  value={legacyChargePaidInstallments}
                  onChangeText={(t) => setLegacyChargePaidInstallments(t.replace(/[^0-9]/g, ''))}
                  placeholder="Ej: 2"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            )}

            {/* 6. Tarjeta de Cálculo del Ciclo (Estética Neón Cyberpunk #00FFA3 / #0A84FF) */}
            {parsedChargeAmount > 0 && (
              <View style={styles.chargeCalculationCard}>
                <View style={styles.calculationHeader}>
                  <Ionicons name="calculator-outline" size={18} color="#00FFA3" />
                  <Text style={styles.chargeCalculationTitle}>
                    PROYECCIÓN DEL COBRO EN TARJETA
                  </Text>
                </View>

                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Persona responsable:</Text>
                  <Text style={styles.chargeCalculationPersonText}>
                    {effectiveSelectedPerson?.name ?? 'No seleccionada'}
                  </Text>
                </View>

                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Tarjeta utilizada:</Text>
                  <Text style={styles.chargeCalculationCardText}>
                    {effectiveSelectedCard
                      ? `${effectiveSelectedCard.name} (${effectiveSelectedCard.bankName})`
                      : 'Tarjeta de Crédito'}
                  </Text>
                </View>

                <View style={styles.calculationDetailRow}>
                  <Text style={styles.calculationDetailLabel}>Monto exigible próximo corte:</Text>
                  <Text style={styles.chargeDueAmountText}>
                    {chargeInstallmentsMode === 'single'
                      ? `${currencySymbol}${parsedChargeAmount.toFixed(2)} (100% al cierre)`
                      : `${currencySymbol}${monthlyChargeInstallment.toFixed(2)} / mes (${parsedChargeInstallments} cuotas)`}
                  </Text>
                </View>

                {isLegacyMode && parsedChargeInstallments > 1 && (
                  <>
                    <View style={styles.calculationDetailRow}>
                      <Text style={styles.calculationDetailLabel}>Cuotas que le faltan por pagar:</Text>
                      <Text style={styles.chargeCalculationCardText}>
                        {remainingChargeInstallments} de {parsedChargeInstallments} cuotas
                      </Text>
                    </View>
                    <View style={styles.calculationDetailRow}>
                      <Text style={styles.calculationDetailLabel}>Saldo restante activo:</Text>
                      <Text style={styles.chargeDueAmountText}>
                        {currencySymbol}{formatAmount(remainingChargeAmount)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante inferior */}
      <View
        style={[
          styles.footer,
          {
            marginBottom: Platform.OS === 'ios' ? 32 : 24,
          },
        ]}
      >
        {formError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorBannerText}>{formError}</Text>
            <TouchableOpacity
              onPress={() => setFormError(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: activeColor }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={activeColor === '#00FFA3' ? '#000000' : '#FFFFFF'}
          />
          <Text
            style={[
              styles.saveButtonText,
              { color: activeColor === '#00FFA3' ? '#000000' : '#FFFFFF' },
            ]}
          >
            {saveButtonLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  tabSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionContainer: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  helperText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: -4,
  },
  dropdownWrapper: {
    gap: 8,
  },
  dropdownTrigger: {
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
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bankIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTriggerTextCol: {
    flex: 1,
    gap: 2,
  },
  dropdownTriggerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  dropdownTriggerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dropdownMenu: {
    backgroundColor: '#18181A',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownItemNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropdownEmpty: {
    padding: 12,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  addBankButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  inlineFormContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  inlineFormTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  inlineFormField: {
    gap: 4,
  },
  inlineFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inlineInput: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
  },
  saveBankInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  saveBankInlineButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#121212',
  },
  textInput: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  loanCalculationCard: {
    backgroundColor: 'rgba(0, 255, 163, 0.06)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  calculationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loanCalculationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  calculationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculationDetailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  loanTotalToPayText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  loanInterestText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  loanDueDayHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00FFA3',
  },
  loanInstallmentSummary: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  calculationCard: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderColor: '#0A84FF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  calculationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A84FF',
    letterSpacing: 1,
  },
  calculationDetailText: {
    fontSize: 13,
    color: colors.text,
  },
  calculationTotalText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A84FF',
    marginTop: 2,
  },
  dueRealtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(10, 132, 255, 0.2)',
  },
  dueRealtimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A84FF',
    flexShrink: 1,
  },
  quickTermScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  quickTermPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quickTermPillActive: {
    borderColor: '#0A84FF',
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  quickTermPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickTermPillTextActive: {
    color: '#0A84FF',
    fontWeight: '800',
  },
  friendBankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  friendBankPillActive: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  friendBankPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  friendBankPillTextActive: {
    color: '#00FFA3',
    fontWeight: '800',
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  bannerIcon: {
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  personIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  installmentModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  installmentModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  installmentModePillActive: {
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
  },
  installmentModePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  installmentModePillTextActive: {
    color: '#00FFA3',
    fontWeight: '800',
  },
  chargeCalculationCard: {
    backgroundColor: 'rgba(0, 255, 163, 0.06)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  chargeCalculationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00FFA3',
    letterSpacing: 0.8,
  },
  chargeCalculationPersonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  chargeCalculationCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A84FF',
  },
  chargeDueAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00FFA3',
  },
  bankDropdownWrapper: {
    gap: 4,
  },
  bankDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBackground,
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
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
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
    color: '#00FFA3',
    fontWeight: '700',
  },
  addNewBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 4,
  },
  addNewBankButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
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
    color: '#00FFA3',
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
    backgroundColor: '#00FFA3',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  inlineBankSaveButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#121212',
  },
  inlineCardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  inlineCardCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderWidth: 1,
  },
  inlineCardCancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inlineCardSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FFA3',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  inlineCardSaveButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#121212',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderColor: 'rgba(255, 69, 58, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  legacyModeBanner: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  legacyModeBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9F0A',
    lineHeight: 17,
  },
  cashflowIncomeNotice: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 163, 0.25)',
  },
  cashflowIncomeNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
    lineHeight: 17,
  },
  cashflowExpenseNotice: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 159, 10, 0.3)',
  },
  cashflowExpenseNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9F0A',
    lineHeight: 17,
  },
  advanceQuotaSwitchCard: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  advanceQuotaSwitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  advanceQuotaSwitchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  advanceQuotaIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceQuotaIconWrapperActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.35)',
  },
  advanceQuotaTextCol: {
    flex: 1,
  },
  advanceQuotaTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  advanceQuotaSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  cyberpunkSwitchTrack: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 2,
    justifyContent: 'center',
  },
  cyberpunkSwitchTrackActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderColor: '#00FFA3',
  },
  cyberpunkSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textSecondary,
  },
  cyberpunkSwitchThumbActive: {
    backgroundColor: '#00FFA3',
    alignSelf: 'flex-end',
  },
  advanceInstallmentSubBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  advanceInstallmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  advanceInstallmentLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: '#FFFFFF',
  },
  advanceInstallmentCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 8,
  },
  advanceCounterBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
  },
  advanceCounterValue: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#00FFA3',
    minWidth: 20,
    textAlign: 'center',
  },
  advanceInstallmentSubHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#00FFA3',
    lineHeight: 15,
  },
  loanUpToDateHighlightNeon: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#00FFA3',
  },
});

export default NewDebtModal;

import { Ionicons } from '@expo/vector-icons';
import type { Transaction, TransactionType } from '../store/transactions-store';
import type { Bank, CreditCard } from '../store/cards-store';
import type {
  PersonalDebt,
  DebtCategory,
  DebtType,
  ThirdPartyCardCharge,
  ThirdPartyChargeAllocation,
  FriendLoan,
  PersonContact,
} from '../store/debts-store';

export type BankRow = {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreditCardRow = {
  id: string;
  user_id: string;
  bank_id: string | null;
  bank_name: string;
  name: string;
  closing_day: number;
  payment_day: number;
  last_four_digits: string | null;
  credit_limit: number | null;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PersonRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PersonalDebtRow = {
  id: string;
  user_id: string;
  title: string;
  entity: string;
  category: DebtCategory;
  debt_type: DebtType | null;
  card_payment_type: 'full_statement' | 'installments' | null;
  card_id: string | null;
  credit_card_id: string | null;
  bank_id: string | null;
  principal_amount: number | null;
  is_preexisting: boolean;
  total_amount: number;
  remaining_amount: number;
  due_day: number | null;
  due_date: string;
  interest_rate: number;
  monthly_payment: number | null;
  total_installments: number | null;
  paid_installments: number;
  initial_paid_installments: number;
  prepaid_last_installments: number;
  total_discount_saved: number;
  total_actual_paid: number;
  settled: boolean;
  settled_at: string | null;
  last_payment_date: string | null;
  icon: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type FriendLoanRow = {
  id: string;
  user_id: string;
  person_id: string | null;
  friend_name: string;
  principal_amount: number;
  interest_rate: number;
  total_to_collect: number;
  paid_amount: number;
  initial_paid_amount: number;
  remaining_amount: number;
  is_preexisting: boolean;
  status: 'active' | 'partial' | 'paid';
  notes: string | null;
  due_date: string;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ThirdPartyCardChargeRow = {
  id: string;
  user_id: string;
  person_id: string | null;
  person_name: string;
  card_id: string | null;
  card_name: string;
  concept: string;
  amount: number;
  total_amount: number;
  remaining_amount: number;
  installments_count: number;
  monthly_installment_amount: number;
  current_period_paid_amount: number;
  paid_installments_count: number;
  initial_paid_installments: number;
  is_preexisting: boolean;
  last_payment_date: string | null;
  date: string;
  settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  icon: string;
  date: string;
  payment_method: 'cash_debit' | 'credit_card' | null;
  card_id: string | null;
  card_name: string | null;
  bank_id: string | null;
  person_name: string | null;
  notes: string | null;
  related_debt_id: string | null;
  related_loan_id: string | null;
  related_charge_id: string | null;
  related_person_id: string | null;
  related_person_name: string | null;
  installments_count: number | null;
  debt_payment_mode: 'next' | 'last' | null;
  nominal_debt_amount: number | null;
  debt_installments_paid: number | null;
  debt_discount_saved: number | null;
  payment_target: string | null;
  third_party_allocations: ThirdPartyChargeAllocation[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

export const toDeterministicUuid = (input: string): string => {
  if (isValidUuid(input)) {
    return input;
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const h3 = Math.imul(h1 ^ 0x85ebca6b, 1597334677);
  const h4 = Math.imul(h2 ^ 0xc2b2ae35, 2654435761);
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');

  const raw = hex1 + hex2 + hex3 + hex4;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-4${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
};

const SPANISH_MONTHS: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const formatIsoToSpanishDate = (
  isoString: string
): { dateFormatted: string; dateGroup: string } => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return { dateFormatted: 'Hoy, 00:00', dateGroup: 'Hoy' };
  }
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const monthName = SPANISH_MONTHS[date.getMonth()] ?? '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const dateFormatted = isToday
    ? `Hoy, ${hours}:${minutes}`
    : `${day} ${monthName.slice(0, 3)}, ${hours}:${minutes}`;
  const dateGroup = isToday ? `Hoy, ${day} de ${monthName}` : `${day} de ${monthName}`;

  return { dateFormatted, dateGroup };
};

export const bankToRow = (bank: Bank, userId: string): BankRow => ({
  id: toDeterministicUuid(bank.id),
  user_id: userId,
  name: bank.name.trim(),
  initial_balance: bank.initialBalance !== undefined ? Number(bank.initialBalance) : 0,
  created_at: bank.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
});

export const rowToBank = (row: BankRow): Bank => ({
  id: row.id,
  name: row.name,
  initialBalance:
    row.initial_balance !== undefined && row.initial_balance !== null
      ? Number(row.initial_balance)
      : 0,
  createdAt: row.created_at,
});

export const cardToRow = (
  card: CreditCard,
  userId: string,
  resolvedBankId?: string | null
): CreditCardRow => ({
  id: toDeterministicUuid(card.id),
  user_id: userId,
  bank_id: resolvedBankId ? toDeterministicUuid(resolvedBankId) : null,
  bank_name: card.bankName,
  name: card.name,
  closing_day: card.closingDay ?? card.cutOffDay ?? 20,
  payment_day: card.paymentDay ?? 5,
  last_four_digits: card.lastFourDigits ?? null,
  credit_limit:
    card.creditLimit !== undefined && card.creditLimit !== null
      ? Number(card.creditLimit)
      : null,
  color: card.color ?? '#00FFA3',
  is_default: Boolean(card.isDefault),
  created_at: card.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
});

export const rowToCard = (row: CreditCardRow): CreditCard => ({
  id: row.id,
  name: row.name,
  bankName: row.bank_name,
  closingDay: row.closing_day,
  paymentDay: row.payment_day,
  cutOffDay: row.closing_day,
  lastFourDigits: row.last_four_digits ?? undefined,
  creditLimit:
    row.credit_limit !== null && row.credit_limit !== undefined
      ? Number(row.credit_limit)
      : undefined,
  color: row.color ?? '#00FFA3',
  isDefault: Boolean(row.is_default),
  createdAt: row.created_at,
});

export const personToRow = (person: PersonContact, userId: string): PersonRow => ({
  id: toDeterministicUuid(person.id),
  user_id: userId,
  name: person.name.trim(),
  phone: null,
  email: null,
  created_at: person.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
});

export const rowToPerson = (row: PersonRow): PersonContact => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

export const debtToRow = (
  debt: PersonalDebt,
  userId: string,
  validBankIds?: Set<string>,
  validCardIds?: Set<string>
): PersonalDebtRow => {
  const mappedBankId = debt.bankId ? toDeterministicUuid(debt.bankId) : null;
  const rawCardId = debt.creditCardId || debt.cardId;
  const mappedCardId = rawCardId ? toDeterministicUuid(rawCardId) : null;

  return {
    id: toDeterministicUuid(debt.id),
    user_id: userId,
    title: debt.title,
    entity: debt.entity,
    category: debt.category,
    debt_type: debt.debtType ?? 'installment_loan',
    card_payment_type: debt.cardPaymentType ?? null,
    card_id:
      mappedCardId && (!validCardIds || validCardIds.has(mappedCardId)) ? mappedCardId : null,
    credit_card_id:
      mappedCardId && (!validCardIds || validCardIds.has(mappedCardId)) ? mappedCardId : null,
    bank_id:
      mappedBankId && (!validBankIds || validBankIds.has(mappedBankId)) ? mappedBankId : null,
    principal_amount:
      debt.principalAmount !== undefined && debt.principalAmount !== null
        ? Number(debt.principalAmount)
        : null,
    is_preexisting: Boolean(debt.isPreexisting),
    total_amount: Number(debt.totalAmount),
    remaining_amount: Number(debt.remainingAmount),
    due_day: debt.dueDay ?? null,
    due_date: debt.dueDate,
    interest_rate: debt.interestRate !== undefined ? Number(debt.interestRate) : 0,
    monthly_payment:
      debt.monthlyPayment !== undefined && debt.monthlyPayment !== null
        ? Number(debt.monthlyPayment)
        : null,
    total_installments: debt.totalInstallments ?? null,
    paid_installments: debt.paidInstallments ?? 0,
    initial_paid_installments: debt.initialPaidInstallments ?? 0,
    prepaid_last_installments: debt.prepaidLastInstallments ?? 0,
    total_discount_saved: debt.totalDiscountSaved ?? 0,
    total_actual_paid: debt.totalActualPaid ?? 0,
    settled: Boolean(debt.settled),
    settled_at: debt.settledAt ?? null,
    last_payment_date: debt.lastPaymentDate ?? null,
    icon: debt.icon ?? 'cash-outline',
    created_at: debt.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
};

export const rowToDebt = (row: PersonalDebtRow): PersonalDebt => ({
  id: row.id,
  title: row.title,
  entity: row.entity,
  category: row.category,
  debtType: row.debt_type ?? undefined,
  cardPaymentType: row.card_payment_type ?? undefined,
  cardId: row.card_id ?? undefined,
  creditCardId: row.credit_card_id ?? row.card_id ?? undefined,
  bankId: row.bank_id ?? undefined,
  principalAmount:
    row.principal_amount !== null && row.principal_amount !== undefined
      ? Number(row.principal_amount)
      : undefined,
  isPreexisting: Boolean(row.is_preexisting),
  totalAmount: Number(row.total_amount),
  remainingAmount: Number(row.remaining_amount),
  dueDay: row.due_day ?? undefined,
  dueDate: row.due_date,
  interestRate: Number(row.interest_rate || 0),
  monthlyPayment:
    row.monthly_payment !== null && row.monthly_payment !== undefined
      ? Number(row.monthly_payment)
      : undefined,
  totalInstallments: row.total_installments ?? undefined,
  paidInstallments: Number(row.paid_installments || 0),
  initialPaidInstallments: Number(row.initial_paid_installments || 0),
  prepaidLastInstallments: Number(row.prepaid_last_installments || 0),
  totalDiscountSaved: Number(row.total_discount_saved || 0),
  totalActualPaid: Number(row.total_actual_paid || 0),
  settled: Boolean(row.settled),
  settledAt: row.settled_at ?? undefined,
  lastPaymentDate: row.last_payment_date ?? undefined,
  icon: (row.icon as keyof typeof Ionicons.glyphMap) ?? 'cash-outline',
  createdAt: row.created_at,
});

export const chargeToRow = (
  charge: ThirdPartyCardCharge,
  userId: string,
  validPersonIds?: Set<string>,
  validCardIds?: Set<string>
): ThirdPartyCardChargeRow => {
  const mappedPersonId = charge.personId ? toDeterministicUuid(charge.personId) : null;
  const mappedCardId = charge.cardId ? toDeterministicUuid(charge.cardId) : null;

  return {
    id: toDeterministicUuid(charge.id),
    user_id: userId,
    person_id:
      mappedPersonId && (!validPersonIds || validPersonIds.has(mappedPersonId))
        ? mappedPersonId
        : null,
    person_name: charge.personName,
    card_id:
      mappedCardId && (!validCardIds || validCardIds.has(mappedCardId)) ? mappedCardId : null,
    card_name: charge.cardName,
    concept: charge.concept,
    amount: Number(charge.amount),
    total_amount: Number(charge.totalAmount),
    remaining_amount: Number(charge.remainingAmount),
    installments_count: charge.installmentsCount || 1,
    monthly_installment_amount: Number(charge.monthlyInstallmentAmount),
    current_period_paid_amount: Number(charge.currentPeriodPaidAmount || 0),
    paid_installments_count: charge.paidInstallmentsCount || 0,
    initial_paid_installments: charge.initialPaidInstallments || 0,
    is_preexisting: Boolean(charge.isPreexisting),
    last_payment_date: charge.lastPaymentDate ?? null,
    date: charge.date || charge.createdAt || new Date().toISOString(),
    settled: Boolean(charge.settled),
    settled_at: charge.settledAt ?? null,
    created_at: charge.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
};

export const rowToCharge = (row: ThirdPartyCardChargeRow): ThirdPartyCardCharge => ({
  id: row.id,
  personName: row.person_name,
  personId: row.person_id ?? undefined,
  cardName: row.card_name,
  cardId: row.card_id ?? undefined,
  concept: row.concept,
  amount: Number(row.amount),
  totalAmount: Number(row.total_amount),
  remainingAmount: Number(row.remaining_amount),
  installmentsCount: Number(row.installments_count),
  monthlyInstallmentAmount: Number(row.monthly_installment_amount),
  currentPeriodPaidAmount: Number(row.current_period_paid_amount || 0),
  paidInstallmentsCount: Number(row.paid_installments_count || 0),
  initialPaidInstallments: Number(row.initial_paid_installments || 0),
  isPreexisting: Boolean(row.is_preexisting),
  lastPaymentDate: row.last_payment_date ?? undefined,
  date: row.date,
  settled: Boolean(row.settled),
  settledAt: row.settled_at ?? undefined,
  createdAt: row.created_at,
});

export const loanToRow = (
  loan: FriendLoan,
  userId: string,
  _validPersonIds?: Set<string>
): FriendLoanRow => ({
  id: toDeterministicUuid(loan.id),
  user_id: userId,
  person_id: null,
  friend_name: loan.friendName,
  principal_amount: Number(loan.principalAmount),
  interest_rate: Number(loan.interestRate || 0),
  total_to_collect: Number(loan.totalToCollect),
  paid_amount: Number(loan.paidAmount || 0),
  initial_paid_amount: Number(loan.initialPaidAmount || 0),
  remaining_amount: Number(loan.remainingAmount),
  is_preexisting: Boolean(loan.isPreexisting),
  status:
    loan.status ??
    (loan.settled ? 'paid' : (loan.paidAmount || 0) > 0 ? 'partial' : 'active'),
  notes: loan.notes ?? null,
  due_date: loan.dueDate,
  settled: Boolean(loan.settled),
  settled_at: loan.settledAt ?? null,
  created_at: loan.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
});

export const rowToLoan = (row: FriendLoanRow): FriendLoan => ({
  id: row.id,
  friendName: row.friend_name,
  principalAmount: Number(row.principal_amount),
  interestRate: Number(row.interest_rate),
  totalToCollect: Number(row.total_to_collect),
  totalAmount: Number(row.total_to_collect),
  paidAmount: Number(row.paid_amount || 0),
  initialPaidAmount: Number(row.initial_paid_amount || 0),
  remainingAmount: Number(row.remaining_amount),
  isPreexisting: Boolean(row.is_preexisting),
  status: row.status,
  notes: row.notes ?? undefined,
  dueDate: row.due_date,
  settled: Boolean(row.settled),
  settledAt: row.settled_at ?? undefined,
  createdAt: row.created_at,
});

export const transactionToRow = (
  tx: Transaction,
  userId: string,
  validIds?: {
    cardIds?: Set<string>;
    bankIds?: Set<string>;
    debtIds?: Set<string>;
    loanIds?: Set<string>;
    chargeIds?: Set<string>;
    personIds?: Set<string>;
  }
): TransactionRow => {
  const mappedCardId = tx.cardId ? toDeterministicUuid(tx.cardId) : null;
  const mappedBankId = tx.bankId ? toDeterministicUuid(tx.bankId) : null;
  const mappedDebtId = tx.relatedDebtId ? toDeterministicUuid(tx.relatedDebtId) : null;
  const mappedLoanId = tx.relatedLoanId ? toDeterministicUuid(tx.relatedLoanId) : null;
  const mappedChargeId = tx.relatedChargeId ? toDeterministicUuid(tx.relatedChargeId) : null;
  const mappedPersonId = tx.relatedPersonId ? toDeterministicUuid(tx.relatedPersonId) : null;

  return {
    id: toDeterministicUuid(tx.id),
    user_id: userId,
    title: tx.title,
    amount: Number(tx.amount),
    type: tx.type,
    category: tx.category,
    icon: tx.icon,
    date: tx.date || tx.createdAt || new Date().toISOString(),
    payment_method: tx.paymentMethod ?? null,
    card_id:
      mappedCardId && (!validIds?.cardIds || validIds.cardIds.has(mappedCardId))
        ? mappedCardId
        : null,
    card_name: tx.cardName ?? null,
    bank_id:
      mappedBankId && (!validIds?.bankIds || validIds.bankIds.has(mappedBankId))
        ? mappedBankId
        : null,
    person_name: tx.personName ?? null,
    notes: tx.notes ?? null,
    related_debt_id:
      mappedDebtId && (!validIds?.debtIds || validIds.debtIds.has(mappedDebtId))
        ? mappedDebtId
        : null,
    related_loan_id:
      mappedLoanId && (!validIds?.loanIds || validIds.loanIds.has(mappedLoanId))
        ? mappedLoanId
        : null,
    related_charge_id:
      mappedChargeId && (!validIds?.chargeIds || validIds.chargeIds.has(mappedChargeId))
        ? mappedChargeId
        : null,
    related_person_id:
      mappedPersonId && (!validIds?.personIds || validIds.personIds.has(mappedPersonId))
        ? mappedPersonId
        : null,
    related_person_name: tx.relatedPersonName ?? null,
    installments_count: tx.installmentsCount ?? null,
    debt_payment_mode: tx.debtPaymentMode ?? null,
    nominal_debt_amount:
      tx.nominalDebtAmount !== undefined && tx.nominalDebtAmount !== null
        ? Number(tx.nominalDebtAmount)
        : null,
    debt_installments_paid: tx.debtInstallmentsPaid ?? null,
    debt_discount_saved:
      tx.debtDiscountSaved !== undefined && tx.debtDiscountSaved !== null
        ? Number(tx.debtDiscountSaved)
        : null,
    payment_target: tx.paymentTarget ?? null,
    third_party_allocations: tx.thirdPartyAllocations ?? [],
    created_at: tx.createdAt || tx.date || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
};

export const rowToTransaction = (row: TransactionRow): Transaction => {
  const { dateFormatted, dateGroup } = formatIsoToSpanishDate(row.date);

  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    icon: (row.icon as keyof typeof Ionicons.glyphMap) ?? 'wallet-outline',
    date: row.date,
    createdAt: row.created_at,
    dateFormatted,
    dateGroup,
    personName: row.person_name ?? undefined,
    cardName: row.card_name ?? undefined,
    notes: row.notes ?? undefined,
    relatedLoanId: row.related_loan_id ?? undefined,
    relatedDebtId: row.related_debt_id ?? undefined,
    relatedChargeId: row.related_charge_id ?? undefined,
    relatedPersonId: row.related_person_id ?? undefined,
    relatedPersonName: row.related_person_name ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    cardId: row.card_id ?? undefined,
    bankId: row.bank_id ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    debtPaymentMode: row.debt_payment_mode ?? undefined,
    nominalDebtAmount:
      row.nominal_debt_amount !== null && row.nominal_debt_amount !== undefined
        ? Number(row.nominal_debt_amount)
        : undefined,
    debtInstallmentsPaid: row.debt_installments_paid ?? undefined,
    debtDiscountSaved:
      row.debt_discount_saved !== null && row.debt_discount_saved !== undefined
        ? Number(row.debt_discount_saved)
        : undefined,
    paymentTarget: (row.payment_target as 'statement' | 'partial' | 'total') ?? undefined,
    thirdPartyAllocations: row.third_party_allocations ?? [],
  };
};

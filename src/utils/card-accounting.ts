import type { CreditCard } from '../store/cards-store';
import type { Transaction } from '../store/transactions-store';
import type { PersonalDebt, ThirdPartyCardCharge } from '../store/debts-store';

export type CardBillingStatementParams = {
  card: CreditCard;
  transactions: Transaction[];
  personalDebts: PersonalDebt[];
  thirdPartyCharges: ThirdPartyCardCharge[];
  referenceDate?: Date;
};

export type CardBillingStatementResult = {
  cardCurrentMonthDebt: number; // Monto a pagar este mes después de restar pagos
  rawMonthDue: number; // Monto total facturado en el mes antes de pagos
  personalMonthDue: number; // Porción propia facturada este mes
  thirdPartyMonthDue: number; // Porción de terceros facturada este mes
  cardPayments: number; // Pagos registrados a la tarjeta en este ciclo
  cardTotalDebt: number; // Deuda total consolidada diferida
  rawTotalDebt: number; // Deuda total consolidada diferida antes de pagos
  isStatementPaid: boolean; // Si la factura del mes está saldada
  cycleTransactions: Transaction[]; // Transacciones directas del ciclo
  cycleTransactionsTotal: number; // Suma monetaria de transacciones directas del ciclo
  currentCycleTransactions: number; // Alias retrocompatible con el total monetario del ciclo
  linkedPersonalDebts: PersonalDebt[]; // Deudas personales vinculadas
  linkedThirdPartyCharges: ThirdPartyCardCharge[]; // Cargos de terceros en ciclo
};

/**
 * Función contable pura y determinista para liquidación de tarjetas de crédito.
 * Single Source of Truth para compromisos mensuales y deuda total diferida.
 */
export const computeCardBillingStatement = ({
  card,
  transactions,
  personalDebts,
  thirdPartyCharges,
  referenceDate = new Date(),
}: CardBillingStatementParams): CardBillingStatementResult => {
  const cardClosingDay = card.closingDay ?? card.cutOffDay ?? 20;
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  const cardNameLower = card.name?.toLowerCase().trim();

  const getDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

  const maxDays = getDaysInMonth(currentYear, currentMonth);
  const effectiveClosing = Math.min(Math.max(1, cardClosingDay), maxDays);

  const isMatchingCardName = (nameToCheck?: string): boolean => {
    if (!nameToCheck || !cardNameLower) return false;
    return nameToCheck.toLowerCase() === cardNameLower;
  };

  // 1. Deudas personales vinculadas a la tarjeta
  const linkedPersonalDebts = personalDebts.filter((d) => {
    const isMatchingCard =
      d.cardId === card.id ||
      d.creditCardId === card.id ||
      (cardNameLower &&
        Boolean(
          (d.category === 'credit_card' && d.entity && d.entity.toLowerCase().includes(cardNameLower)) ||
          (d.title && d.title.toLowerCase().includes(cardNameLower))
        ));

    return Boolean(isMatchingCard && !d.settled && (d.remainingAmount ?? 0) > 0);
  });

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

  // 2. Cargos de terceros vinculados a la tarjeta y verificación de ciclo
  const isDateInCurrentBillingCycle = (dateVal?: string | number | Date): boolean => {
    if (!dateVal) return false;
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return false;
    const d = dt.getDate();
    const m = dt.getMonth();
    const y = dt.getFullYear();
    const txMaxDays = getDaysInMonth(y, m);
    const txEffectiveClosing = Math.min(Math.max(1, cardClosingDay), txMaxDays);
    let billMonth = m;
    let billYear = y;
    if (d >= txEffectiveClosing) {
      billMonth = m + 1;
      if (billMonth > 11) {
        billMonth = 0;
        billYear = y + 1;
      }
    }
    return (
      (billMonth === currentMonth && billYear === currentYear) ||
      (m === currentMonth && y === currentYear)
    );
  };

  const linkedThirdPartyCharges = thirdPartyCharges.filter((c) => {
    const isMatchingCard = c.cardId === card.id || isMatchingCardName(c.cardName);
    if (!isMatchingCard) return false;

    const isUnsettledWithRemaining = !c.settled && (c.remainingAmount ?? 0) > 0;
    const isSettledInCurrentCycle =
      (c.settled || (c.remainingAmount ?? 0) <= 0) &&
      (isDateInCurrentBillingCycle(c.settledAt) ||
        isDateInCurrentBillingCycle(c.lastPaymentDate) ||
        (c.currentPeriodPaidAmount ?? 0) > 0);

    return isUnsettledWithRemaining || isSettledInCurrentCycle;
  });

  const thirdPartyMonthDue = linkedThirdPartyCharges.reduce((acc, c) => {
    if (!c.settled && (c.remainingAmount ?? 0) > 0) {
      const rem = c.remainingAmount ?? 0;
      const count = c.installmentsCount ?? 1;
      const normalQuota =
        count <= 1
          ? (c.totalAmount || c.amount || rem)
          : (c.monthlyInstallmentAmount && c.monthlyInstallmentAmount > 0
              ? c.monthlyInstallmentAmount
              : (c.totalAmount || c.amount || rem) / count);
      return acc + normalQuota;
    } else {
      const retainedQuota =
        c.currentPeriodPaidAmount && c.currentPeriodPaidAmount > 0
          ? c.currentPeriodPaidAmount
          : (c.installmentsCount ?? 1) <= 1
          ? (c.totalAmount || c.amount || 0)
          : (c.monthlyInstallmentAmount || c.totalAmount || c.amount || 0);
      return acc + retainedQuota;
    }
  }, 0);

  // 3. Compras directas de la tarjeta y cómputo de cuotas/deuda diferida
  const cycleTransactions: Transaction[] = [];
  let cycleTransactionsTotal = 0;
  let directInstallmentsRemainingTotal = 0;

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (t.paymentMethod !== 'credit_card') continue;
    const isMatchingCard = t.cardId === card.id || isMatchingCardName(t.cardName);
    if (!isMatchingCard) continue;
    if (t.relatedDebtId || t.relatedChargeId || t.relatedLoanId) continue;

    const txDate = new Date(t.date);
    if (isNaN(txDate.getTime())) continue;
    const d = txDate.getDate();
    const m = txDate.getMonth();
    const y = txDate.getFullYear();

    const txMaxDays = getDaysInMonth(y, m);
    const txEffectiveClosing = Math.min(effectiveClosing, txMaxDays);

    let firstBillMonth = m;
    let firstBillYear = y;
    if (d >= txEffectiveClosing) {
      firstBillMonth = m + 1;
      if (firstBillMonth > 11) {
        firstBillMonth = 0;
        firstBillYear = y + 1;
      }
    }

    const monthsDiff = (currentYear - firstBillYear) * 12 + (currentMonth - firstBillMonth);
    const amount = t.amount ?? 0;

    if (t.installmentsCount && t.installmentsCount > 1) {
      const quota = Math.round((amount / t.installmentsCount) * 100) / 100;

      // Cuota activa exigible
      if (monthsDiff >= 0 && monthsDiff < t.installmentsCount) {
        cycleTransactions.push(t);
        cycleTransactionsTotal += quota;
      }

      // Deuda diferida remanente de la transacción
      if (monthsDiff < 0) {
        directInstallmentsRemainingTotal += amount;
      } else if (monthsDiff < t.installmentsCount) {
        const remaining = (t.installmentsCount - monthsDiff) * quota;
        directInstallmentsRemainingTotal += remaining;
      }
      // Si monthsDiff >= t.installmentsCount: $0 (extinguida)
    } else {
      // Sin cuotas (!t.installmentsCount || t.installmentsCount <= 1)
      if (monthsDiff === 0) {
        cycleTransactions.push(t);
        cycleTransactionsTotal += amount;
        directInstallmentsRemainingTotal += amount;
      } else if (monthsDiff < 0) {
        // Compra post-corte diferida al mes siguiente o futuro
        directInstallmentsRemainingTotal += amount;
      }
      // Si monthsDiff > 0: $0
    }
  }

  cycleTransactionsTotal = Math.round(cycleTransactionsTotal * 100) / 100;
  directInstallmentsRemainingTotal = Math.round(directInstallmentsRemainingTotal * 100) / 100;

  // 4. Pagos registrados a la tarjeta
  const cardPayments = transactions
    .filter(
      (t) =>
        t.type === 'card_payment' &&
        (t.cardId === card.id || isMatchingCardName(t.cardName)) &&
        isDateInCurrentBillingCycle(t.date)
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  // 5. Consolidación contable bruta y neta
  const rawMonthDue = Math.round((personalMonthDue + thirdPartyMonthDue + cycleTransactionsTotal) * 100) / 100;
  const cardCurrentMonthDebt = Math.max(0, Math.round((rawMonthDue - cardPayments) * 100) / 100);

  const personalTotalRemaining = linkedPersonalDebts.reduce(
    (sum, d) => sum + (d.remainingAmount ?? 0),
    0
  );
  const thirdPartyTotalRemaining = linkedThirdPartyCharges.reduce(
    (sum, c) => sum + (c.remainingAmount ?? 0),
    0
  );
  const rawTotalDebt = Math.round((personalTotalRemaining + thirdPartyTotalRemaining + directInstallmentsRemainingTotal) * 100) / 100;
  const cardTotalDebt = Math.max(0, Math.round((rawTotalDebt - cardPayments) * 100) / 100);
  const isStatementPaid = cardCurrentMonthDebt === 0;

  return {
    cardCurrentMonthDebt,
    rawMonthDue,
    personalMonthDue,
    thirdPartyMonthDue,
    cardPayments,
    cardTotalDebt,
    rawTotalDebt,
    isStatementPaid,
    cycleTransactions,
    cycleTransactionsTotal,
    currentCycleTransactions: cycleTransactionsTotal,
    linkedPersonalDebts,
    linkedThirdPartyCharges,
  };
};

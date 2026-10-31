export interface RecurringCutDateResult {
  effectiveDate: Date;
  formattedDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  isToday: boolean;
  isDueSoon: boolean;
  effectiveDay?: number;
  nextDueDateFormatted?: string;
  fullFormatted?: string;
}

export type UrgencyLevel = 'overdue' | 'today' | 'soon' | 'normal';

export interface UrgencyStatus {
  level: UrgencyLevel;
  label: string;
  color: string;
  backgroundColor: string;
  text: string;
  badgeBg: string;
  badgeBorder: string;
}

export const MONTH_NAMES_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const calculateRecurringDueDate = (
  dueDay?: number,
  dueDateStr?: string,
  referenceDate: Date = new Date()
): RecurringCutDateResult => {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDate = referenceDate.getDate();

  let resolvedDueDay = dueDay;
  if (resolvedDueDay === undefined && dueDateStr) {
    const match = dueDateStr.match(/(?:día|dia)\s*(\d{1,2})/i);
    if (match) {
      resolvedDueDay = parseInt(match[1], 10);
    }
  }

  if (resolvedDueDay !== undefined && resolvedDueDay >= 1 && resolvedDueDay <= 31) {
    const lastDayThisMonth = new Date(refYear, refMonth + 1, 0).getDate();
    const effectiveDayThisMonth = Math.min(resolvedDueDay, lastDayThisMonth);

    let targetYear = refYear;
    let targetMonth = refMonth;
    let effectiveDay = effectiveDayThisMonth;

    if (refDate > effectiveDayThisMonth) {
      targetMonth = refMonth + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
      const lastDayNextMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      effectiveDay = Math.min(resolvedDueDay, lastDayNextMonth);
    }

    const effectiveDate = new Date(targetYear, targetMonth, effectiveDay);
    const refMidnight = new Date(refYear, refMonth, refDate, 0, 0, 0, 0);
    const targetMidnight = new Date(targetYear, targetMonth, effectiveDay, 0, 0, 0, 0);
    const msDiff = targetMidnight.getTime() - refMidnight.getTime();
    const daysRemaining = Math.round(msDiff / (1000 * 60 * 60 * 24));

    const monthName = MONTH_NAMES_ES[targetMonth] ?? '';
    const nextDueDateFormatted = `${effectiveDay} ${monthName}`;
    const formattedDate = `${effectiveDay} ${monthName} ${targetYear}`;

    return {
      effectiveDate,
      formattedDate,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      isToday: daysRemaining === 0,
      isDueSoon: daysRemaining > 0 && daysRemaining <= 3,
      effectiveDay,
      nextDueDateFormatted,
      fullFormatted: `Próximo corte: ${nextDueDateFormatted}`,
    };
  }

  if (dueDateStr) {
    const parts = dueDateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const effectiveDate = new Date(y, m, d);
        const refMidnight = new Date(refYear, refMonth, refDate, 0, 0, 0, 0);
        const targetMidnight = new Date(y, m, d, 0, 0, 0, 0);
        const msDiff = targetMidnight.getTime() - refMidnight.getTime();
        const daysRemaining = Math.round(msDiff / (1000 * 60 * 60 * 24));
        const monthName = MONTH_NAMES_ES[m] ?? '';
        const nextDueDateFormatted = `${d} ${monthName}`;

        return {
          effectiveDate,
          formattedDate: `${d} ${monthName} ${y}`,
          daysRemaining,
          isOverdue: daysRemaining < 0,
          isToday: daysRemaining === 0,
          isDueSoon: daysRemaining > 0 && daysRemaining <= 3,
          effectiveDay: d,
          nextDueDateFormatted,
          fullFormatted: `Próximo corte: ${nextDueDateFormatted}`,
        };
      }
    }
  }

  const fallbackDate = new Date(refYear, refMonth, refDate);
  const fallbackMonth = MONTH_NAMES_ES[refMonth] ?? '';
  const fallbackFormatted = dueDateStr ?? 'Pendiente';

  return {
    effectiveDate: fallbackDate,
    formattedDate: fallbackFormatted,
    daysRemaining: 0,
    isOverdue: false,
    isToday: true,
    isDueSoon: false,
    effectiveDay: refDate,
    nextDueDateFormatted: fallbackFormatted,
    fullFormatted: `Próximo corte: ${fallbackFormatted}`,
  };
};

export const getUrgencyStatus = (daysRemaining: number): UrgencyStatus => {
  if (daysRemaining < 0) {
    return {
      level: 'overdue',
      label: '¡Vencido!',
      color: '#FF453A',
      backgroundColor: 'rgba(255, 69, 58, 0.12)',
      text: '¡Vencido!',
      badgeBg: 'rgba(255, 69, 58, 0.12)',
      badgeBorder: 'rgba(255, 69, 58, 0.35)',
    };
  }

  if (daysRemaining === 0) {
    return {
      level: 'today',
      label: '¡Vence hoy!',
      color: '#FF453A',
      backgroundColor: 'rgba(255, 69, 58, 0.12)',
      text: '¡Vence hoy!',
      badgeBg: 'rgba(255, 69, 58, 0.12)',
      badgeBorder: 'rgba(255, 69, 58, 0.35)',
    };
  }

  if (daysRemaining <= 3) {
    return {
      level: 'soon',
      label: '¡Por vencer!',
      color: '#FF9F0A',
      backgroundColor: 'rgba(255, 159, 10, 0.12)',
      text: '¡Por vencer!',
      badgeBg: 'rgba(255, 159, 10, 0.12)',
      badgeBorder: 'rgba(255, 159, 10, 0.35)',
    };
  }

  return {
    level: 'normal',
    label: 'En plazo',
    color: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    text: 'En plazo',
    badgeBg: 'rgba(0, 255, 163, 0.12)',
    badgeBorder: 'rgba(0, 255, 163, 0.35)',
  };
};

export const FULL_MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export type CardCyclePhase = 'accumulating' | 'payment_pending';

export interface CardBillingCycleDates {
  closingDate: Date;
  closingFormatted: string; // ej. "21 Oct 2026"
  daysUntilClosing: number;
  paymentDueDate: Date;
  paymentDueFormatted: string; // ej. "2 Nov 2026"
  daysUntilPayment: number;
  phase: CardCyclePhase;
  phaseLabel: string;
  cycleStatementMonthName: string; // ej. "Extracto Octubre 2026"
  urgencyStatus: UrgencyStatus;
}

export interface InstallmentProgressInfo {
  currentInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  remainingInstallments: number;
  isSettled: boolean;
  currentInstallmentLabel: string; // ej. "Cuota 4 de 5"
  progressLabel: string; // ej. "3 pagadas · Restan 2 cuotas"
  progressPercent: number; // 0 - 100
}

export interface CardBillingPeriodInput {
  closingDay?: number;
  paymentDay?: number;
  cutOffDay?: number;
}

export interface ProjectedBillingPeriodResult extends CardBillingCycleDates {
  offsetMonths: number;
  statementMonth: number; // 0 a 11
  statementYear: number;
  statementMonthName: string; // ej. "Octubre"
  periodLabel: string; // ej. "Actual", "Próximo Mes", "+2 Meses"
}

export const getProjectedCardBillingPeriod = (
  card: CardBillingPeriodInput,
  offsetMonths: number = 0,
  baseDate: Date = new Date()
): ProjectedBillingPeriodResult => {
  const refYear = baseDate.getFullYear();
  const refMonth = baseDate.getMonth();
  const refDay = baseDate.getDate();

  const closingDay = card.closingDay ?? card.cutOffDay ?? 20;
  const paymentDay = card.paymentDay ?? card.cutOffDay ?? 5;

  const getLastDayOfMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

  let targetClosingMonth = refMonth + offsetMonths;
  let targetClosingYear = refYear;
  while (targetClosingMonth > 11) {
    targetClosingMonth -= 12;
    targetClosingYear += 1;
  }
  while (targetClosingMonth < 0) {
    targetClosingMonth += 12;
    targetClosingYear -= 1;
  }

  const maxDayClosingMonth = getLastDayOfMonth(targetClosingYear, targetClosingMonth);
  const effectiveClosingDay = Math.min(closingDay, maxDayClosingMonth);
  const closingDate = new Date(targetClosingYear, targetClosingMonth, effectiveClosingDay);

  let targetPaymentMonth = targetClosingMonth;
  let targetPaymentYear = targetClosingYear;

  if (paymentDay <= closingDay) {
    targetPaymentMonth += 1;
    if (targetPaymentMonth > 11) {
      targetPaymentMonth = 0;
      targetPaymentYear += 1;
    }
  }

  const maxDayPaymentMonth = getLastDayOfMonth(targetPaymentYear, targetPaymentMonth);
  const effectivePaymentDay = Math.min(paymentDay, maxDayPaymentMonth);
  const paymentDueDate = new Date(targetPaymentYear, targetPaymentMonth, effectivePaymentDay);

  const refMidnight = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);
  const closingMidnight = new Date(
    closingDate.getFullYear(),
    closingDate.getMonth(),
    closingDate.getDate(),
    0, 0, 0, 0
  );
  const paymentMidnight = new Date(
    paymentDueDate.getFullYear(),
    paymentDueDate.getMonth(),
    paymentDueDate.getDate(),
    0, 0, 0, 0
  );

  const daysUntilClosing = Math.round(
    (closingMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilPayment = Math.round(
    (paymentMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  const closingFormatted = `${effectiveClosingDay} ${MONTH_NAMES_ES[targetClosingMonth] ?? ''} ${targetClosingYear}`;
  const paymentDueFormatted = `${effectivePaymentDay} ${MONTH_NAMES_ES[targetPaymentMonth] ?? ''} ${targetPaymentYear}`;
  const statementMonthName = FULL_MONTH_NAMES_ES[targetClosingMonth] ?? '';
  const cycleStatementMonthName = `Extracto ${statementMonthName} ${targetClosingYear}`;
  const urgencyStatus = getUrgencyStatus(daysUntilPayment);

  const phase: CardCyclePhase =
    offsetMonths === 0
      ? refDay <= effectiveClosingDay
        ? 'accumulating'
        : 'payment_pending'
      : 'accumulating';

  const phaseLabel =
    offsetMonths === 0
      ? phase === 'accumulating'
        ? 'Acumulando consumos'
        : 'Pago pendiente'
      : 'Proyección futura';

  const periodLabel =
    offsetMonths === 0
      ? 'Actual'
      : offsetMonths === 1
      ? 'Próximo Mes'
      : `+${offsetMonths} Meses`;

  return {
    closingDate,
    closingFormatted,
    daysUntilClosing,
    paymentDueDate,
    paymentDueFormatted,
    daysUntilPayment,
    phase,
    phaseLabel,
    cycleStatementMonthName,
    urgencyStatus,
    offsetMonths,
    statementMonth: targetClosingMonth,
    statementYear: targetClosingYear,
    statementMonthName,
    periodLabel,
  };
};

export const isOneTimeExpenseInPeriod = (
  expenseDate: string | Date,
  closingDay: number,
  offsetMonths: number = 0,
  referenceDate: Date = new Date()
): boolean => {
  const txDate = typeof expenseDate === 'string' ? new Date(expenseDate) : expenseDate;
  if (isNaN(txDate.getTime())) return false;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();

  let targetStatementMonth = refMonth + offsetMonths;
  let targetStatementYear = refYear;
  while (targetStatementMonth > 11) {
    targetStatementMonth -= 12;
    targetStatementYear += 1;
  }
  while (targetStatementMonth < 0) {
    targetStatementMonth += 12;
    targetStatementYear -= 1;
  }

  const d = txDate.getDate();
  const m = txDate.getMonth();
  const y = txDate.getFullYear();

  let billMonth = m;
  let billYear = y;
  if (d >= closingDay) {
    billMonth = m + 1;
    if (billMonth > 11) {
      billMonth = 0;
      billYear = y + 1;
    }
  }

  return billMonth === targetStatementMonth && billYear === targetStatementYear;
};

export interface ProjectedInstallmentInfo {
  isActiveInPeriod: boolean;
  installmentNumber: number;
  totalInstallments: number;
  projectedAmount: number;
  badgeLabel: string;
  periodLabel: string;
}

export const getEffectivePaidInstallments = (
  totalAmount: number,
  remainingAmount: number,
  monthlyAmount: number,
  totalInstallments: number,
  storedPaidCount?: number
): number => {
  if (totalInstallments <= 0) return 0;
  if (remainingAmount <= 0.0001) return totalInstallments;
  const rawStored = Math.max(0, storedPaidCount ?? 0);
  if (monthlyAmount <= 0) return Math.min(totalInstallments, rawStored);
  const amortized = Math.max(0, totalAmount - remainingAmount);
  const paidByAmount = Math.round(parseFloat((amortized / monthlyAmount).toFixed(4)));
  return Math.min(totalInstallments, Math.max(rawStored, paidByAmount));
};

export const getProjectedInstallmentInfo = (
  totalInstallments: number,
  paidInstallmentsCount: number = 0,
  monthlyAmount: number,
  offsetMonths: number = 0,
  settled: boolean = false,
  isCurrentPeriodPaid?: boolean
): ProjectedInstallmentInfo => {
  const periodLabel =
    offsetMonths === 0 ? 'Actual' : offsetMonths === 1 ? 'Próximo Mes' : `+${offsetMonths} Meses`;

  if (settled || totalInstallments <= 0) {
    return {
      isActiveInPeriod: false,
      installmentNumber: 0,
      totalInstallments,
      projectedAmount: 0,
      badgeLabel: '',
      periodLabel,
    };
  }

  const effectivePaidCount = isCurrentPeriodPaid
    ? Math.max(1, paidInstallmentsCount)
    : paidInstallmentsCount;

  if (offsetMonths === 0) {
    const isTerminated = paidInstallmentsCount >= totalInstallments;
    const installmentNumber = isCurrentPeriodPaid
      ? effectivePaidCount
      : Math.min(totalInstallments, Math.max(1, paidInstallmentsCount + 1));

    const badgeLabel =
      isCurrentPeriodPaid === true
        ? `Cuota ${installmentNumber} de ${totalInstallments} • Cubierta`
        : isCurrentPeriodPaid === false
        ? `Cuota ${installmentNumber} de ${totalInstallments} • Pendiente`
        : `Cuota ${installmentNumber} de ${totalInstallments}`;

    return {
      isActiveInPeriod: !isTerminated,
      installmentNumber,
      totalInstallments,
      projectedAmount: isTerminated ? 0 : monthlyAmount,
      badgeLabel,
      periodLabel,
    };
  }

  const installmentNumber = isCurrentPeriodPaid
    ? effectivePaidCount + offsetMonths
    : paidInstallmentsCount + offsetMonths + 1;

  const isActive = installmentNumber <= totalInstallments;

  const badgeLabel = isActive
    ? `Cuota ${installmentNumber} de ${totalInstallments} • ${periodLabel}`
    : '';

  return {
    isActiveInPeriod: isActive,
    installmentNumber: isActive ? installmentNumber : 0,
    totalInstallments,
    projectedAmount: isActive ? monthlyAmount : 0,
    badgeLabel,
    periodLabel,
  };
};

export const getCardBillingCycleDates = (
  closingDay: number,
  paymentDay: number,
  referenceDate: Date = new Date()
): CardBillingCycleDates => {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  const getLastDayOfMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

  const maxDayThisMonth = getLastDayOfMonth(refYear, refMonth);
  const effectiveClosingDay = Math.min(closingDay, maxDayThisMonth);

  const phase: CardCyclePhase =
    refDay <= effectiveClosingDay ? 'accumulating' : 'payment_pending';
  const phaseLabel =
    phase === 'accumulating' ? 'Acumulando consumos' : 'Pago pendiente';

  const closingYear = refYear;
  const closingMonth = refMonth;
  const closingDate = new Date(closingYear, closingMonth, effectiveClosingDay);

  let paymentYear = refYear;
  let paymentMonth = refMonth;

  if (paymentDay <= closingDay) {
    paymentMonth = refMonth + 1;
    if (paymentMonth > 11) {
      paymentMonth = 0;
      paymentYear += 1;
    }
  }

  const maxDayPaymentMonth = getLastDayOfMonth(paymentYear, paymentMonth);
  const effectivePaymentDay = Math.min(paymentDay, maxDayPaymentMonth);
  const paymentDueDate = new Date(paymentYear, paymentMonth, effectivePaymentDay);

  const refMidnight = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);
  const closingMidnight = new Date(
    closingDate.getFullYear(),
    closingDate.getMonth(),
    closingDate.getDate(),
    0, 0, 0, 0
  );
  const paymentMidnight = new Date(
    paymentDueDate.getFullYear(),
    paymentDueDate.getMonth(),
    paymentDueDate.getDate(),
    0, 0, 0, 0
  );

  const daysUntilClosing = Math.round(
    (closingMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysUntilPayment = Math.round(
    (paymentMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  const closingFormatted = `${effectiveClosingDay} ${MONTH_NAMES_ES[closingMonth] ?? ''} ${closingYear}`;
  const paymentDueFormatted = `${effectivePaymentDay} ${MONTH_NAMES_ES[paymentMonth] ?? ''} ${paymentYear}`;
  const cycleStatementMonthName = `Extracto ${FULL_MONTH_NAMES_ES[closingMonth] ?? ''} ${closingYear}`;
  const urgencyStatus = getUrgencyStatus(daysUntilPayment);

  return {
    closingDate,
    closingFormatted,
    daysUntilClosing,
    paymentDueDate,
    paymentDueFormatted,
    daysUntilPayment,
    phase,
    phaseLabel,
    cycleStatementMonthName,
    urgencyStatus,
  };
};

export const getInstallmentProgressInfo = (
  totalInstallments: number,
  paidInstallments: number = 0,
  isCurrentPeriodPaid?: boolean
): InstallmentProgressInfo => {
  const isSettled = totalInstallments > 0 && paidInstallments >= totalInstallments;

  let currentInstallment: number;
  let currentInstallmentLabel: string;
  const effectivePaid = isCurrentPeriodPaid
    ? Math.min(totalInstallments, Math.max(1, paidInstallments || 0))
    : paidInstallments || 0;

  if (isSettled) {
    currentInstallment = totalInstallments;
    currentInstallmentLabel = `${totalInstallments} de ${totalInstallments} cubiertas`;
  } else if (isCurrentPeriodPaid === true) {
    currentInstallment = Math.max(1, paidInstallments);
    currentInstallmentLabel = `Cuota ${currentInstallment} de ${totalInstallments} • Cubierta`;
  } else if (isCurrentPeriodPaid === false) {
    currentInstallment = Math.min(totalInstallments, Math.max(1, (paidInstallments || 0) + 1));
    currentInstallmentLabel = `Cuota ${currentInstallment} de ${totalInstallments} • Pendiente`;
  } else {
    currentInstallment = Math.min(totalInstallments, Math.max(1, (paidInstallments || 0) + 1));
    currentInstallmentLabel = `Cuota ${currentInstallment} de ${totalInstallments}`;
  }

  const remainingInstallments = isSettled
    ? 0
    : isCurrentPeriodPaid
    ? Math.max(0, totalInstallments - effectivePaid)
    : Math.max(0, totalInstallments - (paidInstallments || 0));

  const progressPercent =
    totalInstallments > 0
      ? Math.min(
          100,
          Math.round(
            ((isCurrentPeriodPaid ? effectivePaid : (paidInstallments || 0)) / totalInstallments) * 100
          )
        )
      : 0;

  const progressLabel = isSettled
    ? 'Completada'
    : isCurrentPeriodPaid
    ? `${effectivePaid} pagadas · Restan ${remainingInstallments} cuotas`
    : `${paidInstallments} pagadas · Restan ${remainingInstallments} cuotas`;

  return {
    currentInstallment,
    totalInstallments,
    paidInstallments: isCurrentPeriodPaid ? effectivePaid : paidInstallments,
    remainingInstallments,
    isSettled,
    currentInstallmentLabel,
    progressLabel,
    progressPercent,
  };
};

export type DebtDueStatusLevel =
  | 'up_to_date'
  | 'overdue'
  | 'today'
  | 'urgent'
  | 'warning'
  | 'normal';

export type DebtDueStatus = {
  status: DebtDueStatusLevel;
  statusText: string;
  isUpToDateThisMonth: boolean;
  daysRemaining: number;
  nextDueDate: Date;
  nextDueDateFormatted: string;
  fullFormatted: string;
  urgency: 'overdue' | 'today' | 'urgent' | 'warning' | 'normal';
  urgencyStatus: {
    color: string;
    text: string;
    bg: string;
    border: string;
  };
  shouldAlertInDashboard: boolean;
};

export const getDebtDueStatus = (
  dueDay: number,
  lastPaymentDate?: string,
  refDate: Date = new Date()
): DebtDueStatus => {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();

  const safeDueDay = Math.max(1, Math.min(31, Math.round(dueDay || 1)));

  let isUpToDateThisMonth = false;
  if (lastPaymentDate) {
    const paymentDate = new Date(lastPaymentDate);
    if (!isNaN(paymentDate.getTime())) {
      const pYear = paymentDate.getFullYear();
      const pMonth = paymentDate.getMonth();
      isUpToDateThisMonth =
        pYear > refYear || (pYear === refYear && pMonth >= refMonth);
    }
  }

  const lastDayThisMonth = new Date(refYear, refMonth + 1, 0).getDate();
  const effectiveDayThisMonth = Math.min(safeDueDay, lastDayThisMonth);

  let targetYear = refYear;
  let targetMonth = refMonth;
  let targetDay = effectiveDayThisMonth;

  if (isUpToDateThisMonth) {
    targetMonth = refMonth + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const lastDayNextMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    targetDay = Math.min(safeDueDay, lastDayNextMonth);
  } else {
    targetYear = refYear;
    targetMonth = refMonth;
    targetDay = effectiveDayThisMonth;
  }

  const nextDueDate = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
  const refMidnight = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);
  const msDiff = nextDueDate.getTime() - refMidnight.getTime();
  const daysRemaining = Math.round(msDiff / (1000 * 60 * 60 * 24));

  let urgency: DebtDueStatus['urgency'] = 'normal';
  if (daysRemaining < 0) {
    urgency = 'overdue';
  } else if (daysRemaining === 0) {
    urgency = 'today';
  } else if (daysRemaining <= 3) {
    urgency = 'urgent';
  } else if (daysRemaining <= 7) {
    urgency = 'warning';
  } else {
    urgency = 'normal';
  }

  let status: DebtDueStatusLevel = 'normal';
  let statusText = 'En plazo';

  if (isUpToDateThisMonth) {
    status = 'up_to_date';
    statusText = 'Al día este mes';
  } else if (daysRemaining < 0) {
    status = 'overdue';
    statusText = '¡Vencido!';
  } else if (daysRemaining === 0) {
    status = 'today';
    statusText = '¡Vence hoy!';
  } else if (daysRemaining <= 3) {
    status = 'urgent';
    statusText = '¡Por vencer!';
  } else if (daysRemaining <= 7) {
    status = 'warning';
    statusText = 'Próximo a vencer';
  } else {
    status = 'normal';
    statusText = 'En plazo';
  }

  const shouldAlertInDashboard = !isUpToDateThisMonth && daysRemaining <= 7;

  const monthName = MONTH_NAMES_ES[targetMonth] ?? '';
  const nextDueDateFormatted = `${targetDay} ${monthName}`;
  const fullFormatted = `Próximo vencimiento: ${nextDueDateFormatted}`;

  const urgencyStatus = {
    color: isUpToDateThisMonth
      ? '#00FFA3'
      : urgency === 'overdue' || urgency === 'today'
      ? '#FF453A'
      : urgency === 'urgent'
      ? '#FF9F0A'
      : urgency === 'warning'
      ? '#FFD60A'
      : '#00FFA3',
    text: statusText,
    bg: isUpToDateThisMonth
      ? 'rgba(0, 255, 163, 0.12)'
      : urgency === 'overdue' || urgency === 'today'
      ? 'rgba(255, 69, 58, 0.12)'
      : urgency === 'urgent'
      ? 'rgba(255, 159, 10, 0.12)'
      : urgency === 'warning'
      ? 'rgba(255, 214, 10, 0.12)'
      : 'rgba(0, 255, 163, 0.12)',
    border: isUpToDateThisMonth
      ? 'rgba(0, 255, 163, 0.35)'
      : urgency === 'overdue' || urgency === 'today'
      ? 'rgba(255, 69, 58, 0.35)'
      : urgency === 'urgent'
      ? 'rgba(255, 159, 10, 0.35)'
      : urgency === 'warning'
      ? 'rgba(255, 214, 10, 0.35)'
      : 'rgba(0, 255, 163, 0.35)',
  };

  return {
    status,
    statusText,
    isUpToDateThisMonth,
    daysRemaining,
    nextDueDate,
    nextDueDateFormatted,
    fullFormatted,
    urgency,
    urgencyStatus,
    shouldAlertInDashboard,
  };
};

export const getNextDebtDueDate = (
  dueDay?: number,
  lastPaymentDate?: string,
  refDate: Date = new Date(),
  dueDateStr?: string
): RecurringCutDateResult & {
  isUpToDateThisMonth: boolean;
  status: DebtDueStatusLevel;
  statusText: string;
} => {
  let resolvedDueDay = dueDay;
  if (resolvedDueDay === undefined && dueDateStr) {
    const match = dueDateStr.match(/(?:día|dia)\s*(\d{1,2})/i);
    if (match) {
      resolvedDueDay = parseInt(match[1], 10);
    }
  }

  const safeDay =
    resolvedDueDay && resolvedDueDay >= 1 && resolvedDueDay <= 31 ? resolvedDueDay : 1;
  const debtStatus = getDebtDueStatus(safeDay, lastPaymentDate, refDate);

  const monthName = MONTH_NAMES_ES[debtStatus.nextDueDate.getMonth()] ?? '';
  const day = debtStatus.nextDueDate.getDate();
  const nextDueDateFormatted = `${day} ${monthName}`;
  const formattedDate = `${day} ${monthName} ${debtStatus.nextDueDate.getFullYear()}`;

  return {
    effectiveDate: debtStatus.nextDueDate,
    formattedDate,
    daysRemaining: debtStatus.daysRemaining,
    isOverdue: debtStatus.daysRemaining < 0 && !debtStatus.isUpToDateThisMonth,
    isToday: debtStatus.daysRemaining === 0 && !debtStatus.isUpToDateThisMonth,
    isDueSoon:
      debtStatus.daysRemaining > 0 &&
      debtStatus.daysRemaining <= 3 &&
      !debtStatus.isUpToDateThisMonth,
    effectiveDay: day,
    nextDueDateFormatted,
    fullFormatted: `Próximo débito: ${nextDueDateFormatted}`,
    isUpToDateThisMonth: debtStatus.isUpToDateThisMonth,
    status: debtStatus.status,
    statusText: debtStatus.statusText,
  };
};

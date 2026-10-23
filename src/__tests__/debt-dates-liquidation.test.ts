import {
  calculateRecurringDueDate,
  getUrgencyStatus,
  getCardBillingCycleDates,
  getInstallmentProgressInfo,
  getDebtDueStatus,
  getNextDebtDueDate,
} from '../utils/date-helpers';
import {
  useDebtsStore,
  groupPersonalDebtsByBank,
  groupThirdPartyChargesByCard,
  getThirdPartyCoverageInfo,
  type PersonalDebt,
  type ThirdPartyCardCharge,
} from '../store/debts-store';

describe('Vencimientos Recurrentes, Semáforo de Urgencia y Liquidación de Deudas', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useDebtsStore.getState().clearAllDebts();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Caso 1: Semáforo "En plazo" (con 10 días de margen)', () => {
    // Deuda con dueDay = 20. Referencia: 2026-10-10
    const refDate = new Date('2026-10-10T12:00:00Z');
    const recurring = calculateRecurringDueDate(20, undefined, refDate);
    const urgency = getUrgencyStatus(recurring.daysRemaining);

    expect(recurring.daysRemaining).toBe(10);
    expect(recurring.isOverdue).toBe(false);
    expect(recurring.isToday).toBe(false);
    expect(recurring.isDueSoon).toBe(false);
    expect(urgency.level).toBe('normal');
    expect(urgency.label).toBe('En plazo');
    expect(urgency.color).toBe('#00FFA3');
  });

  it('Caso 2: Semáforo "¡Por vencer!" (3 días antes)', () => {
    // Referencia: 2026-10-17. dueDay = 20
    const refDate = new Date('2026-10-17T12:00:00Z');
    const recurring = calculateRecurringDueDate(20, undefined, refDate);
    const urgency = getUrgencyStatus(recurring.daysRemaining);

    expect(recurring.daysRemaining).toBe(3);
    expect(recurring.isDueSoon).toBe(true);
    expect(recurring.isToday).toBe(false);
    expect(urgency.level).toBe('soon');
    expect(urgency.label).toBe('¡Por vencer!');
    expect(urgency.color).toBe('#FF9F0A');
  });

  it('Caso 3: Semáforo "¡Vence hoy!" (Día límite)', () => {
    // Referencia: 2026-10-20. dueDay = 20
    const refDate = new Date('2026-10-20T08:00:00Z');
    const recurring = calculateRecurringDueDate(20, undefined, refDate);
    const urgency = getUrgencyStatus(recurring.daysRemaining);

    expect(recurring.daysRemaining).toBe(0);
    expect(recurring.isToday).toBe(true);
    expect(recurring.isOverdue).toBe(false);
    expect(urgency.level).toBe('today');
    expect(urgency.label).toBe('¡Vence hoy!');
    expect(urgency.color).toBe('#FF453A');
  });

  it('Caso 4: Rollover automático al día siguiente (d > dueDay)', () => {
    // Referencia: 2026-10-21 (el día 20 ya pasó). dueDay = 20
    const refDate = new Date('2026-10-21T12:00:00Z');
    const recurring = calculateRecurringDueDate(20, undefined, refDate);
    const urgency = getUrgencyStatus(recurring.daysRemaining);

    // La fecha calculada salta al 20 de Noviembre (2026-11-20)
    expect(recurring.effectiveDate.getFullYear()).toBe(2026);
    expect(recurring.effectiveDate.getMonth()).toBe(10); // Noviembre (0-indexed)
    expect(recurring.effectiveDate.getDate()).toBe(20);
    // Días restantes: Octubre tiene 31 días. Del 21 al 31 son 10 días + 20 días de Noviembre = 30 días
    expect(recurring.daysRemaining).toBe(30);
    expect(urgency.level).toBe('normal');
    expect(urgency.label).toBe('En plazo');
  });

  it('Caso 5: Ajuste por longitud de meses (Día 31 en Febrero y Abril)', () => {
    // Deuda con dueDay = 31
    // Febrero 2026 (año no bisiesto, 28 días)
    const refFeb = new Date('2026-02-10T12:00:00Z');
    const recurringFeb = calculateRecurringDueDate(31, undefined, refFeb);
    expect(recurringFeb.effectiveDate.getFullYear()).toBe(2026);
    expect(recurringFeb.effectiveDate.getMonth()).toBe(1); // Febrero
    expect(recurringFeb.effectiveDate.getDate()).toBe(28);

    // Abril 2026 (mes de 30 días)
    const refApr = new Date('2026-04-10T12:00:00Z');
    const recurringApr = calculateRecurringDueDate(31, undefined, refApr);
    expect(recurringApr.effectiveDate.getFullYear()).toBe(2026);
    expect(recurringApr.effectiveDate.getMonth()).toBe(3); // Abril
    expect(recurringApr.effectiveDate.getDate()).toBe(30);
  });

  it('Caso 6: Salto de año en vencimientos (Diciembre -> Enero)', () => {
    // Deuda con dueDay = 15. Referencia: 2026-12-20 (ya pasó el 15)
    const refDec = new Date('2026-12-20T12:00:00Z');
    const recurring = calculateRecurringDueDate(15, undefined, refDec);

    expect(recurring.effectiveDate.getFullYear()).toBe(2027);
    expect(recurring.effectiveDate.getMonth()).toBe(0); // Enero
    expect(recurring.effectiveDate.getDate()).toBe(15);
  });

  it('Caso 7: Amortización Progresiva y Liquidación en el tiempo (debts-store)', () => {
    // Crear deuda personal de $1200 a 12 cuotas fijas ($100 c/u)
    const debt = useDebtsStore.getState().addPersonalDebt({
      title: 'Préstamo Auto',
      entity: 'Banco Santander',
      category: 'loan',
      debtType: 'installment_loan',
      totalAmount: 1200,
      remainingAmount: 1200,
      monthlyPayment: 100,
      totalInstallments: 12,
      paidInstallments: 0,
      dueDay: 15,
      dueDate: 'Día 15 de cada mes',
      icon: 'cash-outline',
    });

    const getDebt = () =>
      useDebtsStore.getState().personalDebts.find((d) => d.id === debt.id)!;

    // Simular Mes 1 (Octubre): payPersonalDebt de $100
    useDebtsStore.getState().payPersonalDebt(debt.id, 100);
    let current = getDebt();
    expect(current.paidInstallments).toBe(1);
    expect(current.remainingAmount).toBe(1100);
    expect(current.settled).toBe(false);

    // Simular Mes 2 (Noviembre): payPersonalDebt de $100
    useDebtsStore.getState().payPersonalDebt(debt.id, 100);
    current = getDebt();
    expect(current.paidInstallments).toBe(2);
    expect(current.remainingAmount).toBe(1000);
    expect(current.settled).toBe(false);

    // Simular adelanto de última cuota con descuento: payPersonalDebt con mode: 'last', nominal $100 con descuento $20 (pago de $80)
    useDebtsStore.getState().payPersonalDebt(debt.id, 80, {
      mode: 'last',
      installmentsCount: 1,
      nominalAmountExtinguished: 100,
      discountSaved: 20,
    });
    current = getDebt();
    expect(current.remainingAmount).toBe(900);
    expect(current.totalDiscountSaved).toBe(20);
    expect(current.settled).toBe(false);

    // Liquidar el total remanente ($900)
    useDebtsStore.getState().payPersonalDebt(debt.id, 900, {
      installmentsCount: 9,
      nominalAmountExtinguished: 900,
    });
    current = getDebt();
    expect(current.remainingAmount).toBe(0);
    expect(current.settled).toBe(true);
    expect(current.settledAt).toBeDefined();

    // Revertir el último pago ($900)
    useDebtsStore.getState().revertPersonalDebtPayment(debt.id, 900, {
      installmentsCount: 9,
      nominalAmountExtinguished: 900,
    });
    current = getDebt();
    expect(current.remainingAmount).toBe(900);
    expect(current.settled).toBe(false);
    expect(current.settledAt).toBeUndefined();
  });

  it('Caso 8: getCardBillingCycleDates antes del corte (fase accumulating)', () => {
    // 15 de Octubre 2026 con corte 21 y pago 2
    const refDate = new Date('2026-10-15T12:00:00Z');
    jest.setSystemTime(refDate);

    const cycle = getCardBillingCycleDates(21, 2, refDate);

    expect(cycle.phase).toBe('accumulating');
    expect(cycle.phaseLabel).toBe('Acumulando consumos');
    expect(cycle.closingFormatted).toBe('21 Oct 2026');
    expect(cycle.closingDate.getFullYear()).toBe(2026);
    expect(cycle.closingDate.getMonth()).toBe(9); // Octubre (0-indexed)
    expect(cycle.closingDate.getDate()).toBe(21);
    expect(cycle.daysUntilClosing).toBe(6);

    expect(cycle.paymentDueFormatted).toBe('2 Nov 2026');
    expect(cycle.paymentDueDate.getFullYear()).toBe(2026);
    expect(cycle.paymentDueDate.getMonth()).toBe(10); // Noviembre (0-indexed)
    expect(cycle.paymentDueDate.getDate()).toBe(2);
    expect(cycle.daysUntilPayment).toBe(18);

    expect(cycle.cycleStatementMonthName).toBe('Extracto Octubre 2026');
    expect(cycle.urgencyStatus.level).toBe('normal');
  });

  it('Caso 9: getCardBillingCycleDates después del corte (fase payment_pending)', () => {
    // 25 de Octubre 2026 con corte 21 y pago 2
    const refDate = new Date('2026-10-25T12:00:00Z');
    jest.setSystemTime(refDate);

    const cycle = getCardBillingCycleDates(21, 2, refDate);

    expect(cycle.phase).toBe('payment_pending');
    expect(cycle.phaseLabel).toBe('Pago pendiente');
    expect(cycle.closingFormatted).toBe('21 Oct 2026');
    expect(cycle.closingDate.getFullYear()).toBe(2026);
    expect(cycle.closingDate.getMonth()).toBe(9);
    expect(cycle.closingDate.getDate()).toBe(21);
    expect(cycle.daysUntilClosing).toBe(-4);

    expect(cycle.paymentDueFormatted).toBe('2 Nov 2026');
    expect(cycle.paymentDueDate.getFullYear()).toBe(2026);
    expect(cycle.paymentDueDate.getMonth()).toBe(10);
    expect(cycle.paymentDueDate.getDate()).toBe(2);
    expect(cycle.daysUntilPayment).toBe(8);

    expect(cycle.cycleStatementMonthName).toBe('Extracto Octubre 2026');
    expect(cycle.urgencyStatus.level).toBe('normal');
  });

  it('Caso 10: getCardBillingCycleDates con salto de año en Diciembre (Diciembre -> Enero)', () => {
    // 15 de Diciembre 2026 con corte 21 y pago 2
    const refDate = new Date('2026-12-15T12:00:00Z');
    jest.setSystemTime(refDate);

    const cycle = getCardBillingCycleDates(21, 2, refDate);

    expect(cycle.closingFormatted).toBe('21 Dic 2026');
    expect(cycle.closingDate.getFullYear()).toBe(2026);
    expect(cycle.closingDate.getMonth()).toBe(11); // Diciembre
    expect(cycle.closingDate.getDate()).toBe(21);

    expect(cycle.paymentDueFormatted).toBe('2 Ene 2027');
    expect(cycle.paymentDueDate.getFullYear()).toBe(2027);
    expect(cycle.paymentDueDate.getMonth()).toBe(0); // Enero
    expect(cycle.paymentDueDate.getDate()).toBe(2);

    expect(cycle.cycleStatementMonthName).toBe('Extracto Diciembre 2026');
  });

  it('Caso 11: getInstallmentProgressInfo con 5 cuotas y 3 pagadas (progreso parcial)', () => {
    const progress = getInstallmentProgressInfo(5, 3);

    expect(progress.totalInstallments).toBe(5);
    expect(progress.paidInstallments).toBe(3);
    expect(progress.currentInstallment).toBe(4);
    expect(progress.remainingInstallments).toBe(2);
    expect(progress.isSettled).toBe(false);
    expect(progress.currentInstallmentLabel).toBe('Cuota 4 de 5');
    expect(progress.progressLabel).toBe('3 pagadas · Restan 2 cuotas');
    expect(progress.progressPercent).toBe(60);
  });

  it('Caso 12: getInstallmentProgressInfo con cuotas saldadas (5 de 5)', () => {
    const progress = getInstallmentProgressInfo(5, 5);

    expect(progress.totalInstallments).toBe(5);
    expect(progress.paidInstallments).toBe(5);
    expect(progress.currentInstallment).toBe(5);
    expect(progress.remainingInstallments).toBe(0);
    expect(progress.isSettled).toBe(true);
    expect(progress.currentInstallmentLabel).toBe('5 de 5 cubiertas');
    expect(progress.progressLabel).toBe('Completada');
    expect(progress.progressPercent).toBe(100);
  });

  it('Caso 13: getDebtDueStatus - cuota del mes pagada (al día, próximo mes, sin alerta en dashboard)', () => {
    // Hoy es 15 de Octubre 2026. dueDay es 6.
    // lastPaymentDate corresponde al 6 de Octubre 2026 (mes actual)
    const refDate = new Date('2026-10-15T10:00:00Z');
    const lastPaymentDate = '2026-10-06T12:00:00.000Z';
    const status = getDebtDueStatus(6, lastPaymentDate, refDate);

    expect(status.isUpToDateThisMonth).toBe(true);
    // Próximo vencimiento: 6 de Noviembre 2026
    expect(status.nextDueDate.getFullYear()).toBe(2026);
    expect(status.nextDueDate.getMonth()).toBe(10); // Noviembre (0-indexed)
    expect(status.nextDueDate.getDate()).toBe(6);
    // Días restantes: del 15 Oct al 6 Nov = 22 días
    expect(status.daysRemaining).toBe(22);
    expect(status.urgency).toBe('normal');
    expect(status.shouldAlertInDashboard).toBe(false);
  });

  it('Caso 14: getDebtDueStatus - cuota vencida este mes vs vence hoy', () => {
    // 1. Vencida: Hoy es 15 de Octubre 2026. dueDay es 6.
    // lastPaymentDate fue en Septiembre (no pagada este mes)
    const refDate = new Date('2026-10-15T10:00:00Z');
    const oldPaymentDate = '2026-09-06T12:00:00.000Z';
    const overdueStatus = getDebtDueStatus(6, oldPaymentDate, refDate);

    expect(overdueStatus.isUpToDateThisMonth).toBe(false);
    expect(overdueStatus.daysRemaining).toBe(-9);
    expect(overdueStatus.urgency).toBe('overdue');
    expect(overdueStatus.shouldAlertInDashboard).toBe(true);

    // 2. Vence hoy: Hoy es 6 de Octubre 2026. dueDay es 6. Sin pago aún este mes.
    const todayRef = new Date('2026-10-06T10:00:00Z');
    const todayStatus = getDebtDueStatus(6, undefined, todayRef);

    expect(todayStatus.isUpToDateThisMonth).toBe(false);
    expect(todayStatus.daysRemaining).toBe(0);
    expect(todayStatus.urgency).toBe('today');
    expect(todayStatus.shouldAlertInDashboard).toBe(true);
  });

  it('Caso 15: getDebtDueStatus - ventana de proximidad (<= 3 días urgent, <= 7 días warning, > 7 días normal)', () => {
    // Hoy es 1 de Octubre 2026.
    const refDate = new Date('2026-10-01T10:00:00Z');

    // dueDay = 3 -> faltan 2 días (<= 3 días) -> urgent, alerta
    const urgentStatus = getDebtDueStatus(3, undefined, refDate);
    expect(urgentStatus.daysRemaining).toBe(2);
    expect(urgentStatus.urgency).toBe('urgent');
    expect(urgentStatus.shouldAlertInDashboard).toBe(true);

    // dueDay = 6 -> faltan 5 días (<= 7 días) -> warning, alerta
    const warningStatus = getDebtDueStatus(6, undefined, refDate);
    expect(warningStatus.daysRemaining).toBe(5);
    expect(warningStatus.urgency).toBe('warning');
    expect(warningStatus.shouldAlertInDashboard).toBe(true);

    // dueDay = 25 -> faltan 24 días (> 7 días) -> normal, NO alerta
    const normalStatus = getDebtDueStatus(25, undefined, refDate);
    expect(normalStatus.daysRemaining).toBe(24);
    expect(normalStatus.urgency).toBe('normal');
    expect(normalStatus.shouldAlertInDashboard).toBe(false);
  });

  it('Caso 16: Asignación de lastPaymentDate en store y consolidación en UpcomingDebtsCard', () => {
    jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));

    // 1. Al crear deuda con paidInstallments > 0 sin lastPaymentDate explícito, asigna fecha actual
    const debt1 = useDebtsStore.getState().addPersonalDebt({
      title: 'Crédito Moto',
      entity: 'Banco Falabella',
      category: 'loan',
      debtType: 'installment_loan',
      totalAmount: 1000,
      remainingAmount: 800,
      monthlyPayment: 100,
      totalInstallments: 10,
      paidInstallments: 2,
      dueDay: 6,
      dueDate: 'Día 6 de cada mes',
      icon: 'cash-outline',
    });

    expect(debt1.lastPaymentDate).toBeDefined();
    expect(new Date(debt1.lastPaymentDate!).getMonth()).toBe(9); // Octubre

    // 2. Al consultar getDebtDueStatus con la deuda, como está al día en Octubre y vence el 6 de Nov (22 días),
    // shouldAlertInDashboard debe ser false y isUpToDateThisMonth true
    const debt1Status = getDebtDueStatus(
      debt1.dueDay ?? 1,
      debt1.lastPaymentDate,
      new Date('2026-10-15T12:00:00Z')
    );

    expect(debt1Status.isUpToDateThisMonth).toBe(true);
    expect(debt1Status.shouldAlertInDashboard).toBe(false);
    expect(debt1Status.daysRemaining).toBe(22);
    expect(debt1Status.urgency).toBe('normal');

    // 3. Crear deuda sin pagos previos y con vencimiento pasado (dueDay = 10, hoy es 15)
    const debt2 = useDebtsStore.getState().addPersonalDebt({
      title: 'Préstamo Urgente',
      entity: 'Prestamista',
      category: 'loan',
      totalAmount: 500,
      remainingAmount: 500,
      dueDay: 10,
      dueDate: 'Día 10 de cada mes',
      icon: 'cash-outline',
    });
    expect(debt2.lastPaymentDate).toBeUndefined();

    // 4. Procesar pago en debt2 -> actualiza lastPaymentDate automáticamente
    useDebtsStore.getState().payPersonalDebt(debt2.id, 100);
    const updatedDebt2 = useDebtsStore.getState().personalDebts.find((d) => d.id === debt2.id);
    expect(updatedDebt2?.lastPaymentDate).toBeDefined();
  });

  it('Caso 17: getDebtDueStatus y getNextDebtDueDate retornan status "up_to_date" y proyectan vencimiento al mes siguiente', () => {
    // Hoy es 15 de Octubre 2026.
    const refDate = new Date('2026-10-15T12:00:00Z');
    jest.setSystemTime(refDate);

    // Vencimiento original el día 30. Cuota de octubre ya pagada el 10 de octubre.
    const lastPaymentDate = '2026-10-10T15:30:00.000Z';
    const status = getDebtDueStatus(30, lastPaymentDate, refDate);

    expect(status.status).toBe('up_to_date');
    expect(status.statusText).toBe('Al día este mes');
    expect(status.isUpToDateThisMonth).toBe(true);
    // Próximo vencimiento debe ser el 30 de Noviembre de 2026
    expect(status.nextDueDate.getFullYear()).toBe(2026);
    expect(status.nextDueDate.getMonth()).toBe(10); // Noviembre (0-indexed)
    expect(status.nextDueDate.getDate()).toBe(30);
    expect(status.nextDueDateFormatted).toBe('30 Nov');
    expect(status.fullFormatted).toBe('Próximo vencimiento: 30 Nov');
    expect(status.urgencyStatus.color).toBe('#00FFA3');
    expect(status.shouldAlertInDashboard).toBe(false);

    // Probar getNextDebtDueDate con end-of-month clamping (día 31 en Noviembre que tiene 30 días)
    const nextDue = getNextDebtDueDate(31, lastPaymentDate, refDate, 'Día 31 de cada mes');
    expect(nextDue.status).toBe('up_to_date');
    expect(nextDue.isUpToDateThisMonth).toBe(true);
    expect(nextDue.effectiveDay).toBe(30); // 31 clamped to 30 Nov
    expect(nextDue.nextDueDateFormatted).toBe('30 Nov');
    expect(nextDue.fullFormatted).toBe('Próximo débito: 30 Nov');
    expect(nextDue.isOverdue).toBe(false);
  });

  it('Caso 18: Alta de préstamo con cuota del mes en curso ya pagada (cuotas adelantadas)', () => {
    jest.setSystemTime(new Date('2026-10-15T10:00:00Z'));

    const numCuotas = 12;
    const cuota = 100;
    const totalPagar = 1200;
    const advancePaid = 1; // Cuota del mes actual marcada como pagada
    const remainingTotal = totalPagar - (advancePaid * cuota); // 1100

    const newLoan = useDebtsStore.getState().addPersonalDebt({
      title: 'Préstamo Auto',
      entity: 'Banco Santander',
      category: 'loan',
      debtType: 'installment_loan',
      principalAmount: 1000,
      totalAmount: totalPagar,
      remainingAmount: remainingTotal,
      totalInstallments: numCuotas,
      paidInstallments: advancePaid,
      initialPaidInstallments: advancePaid,
      lastPaymentDate: new Date().toISOString(),
      isPreexisting: false,
      monthlyPayment: cuota,
      dueDay: 20,
      dueDate: 'Día 20 de cada mes',
      icon: 'cash-outline',
    });

    // 1. Validar integridad de estado
    expect(newLoan.paidInstallments).toBe(1);
    expect(newLoan.initialPaidInstallments).toBe(1);
    expect(newLoan.remainingAmount).toBe(1100);
    expect(newLoan.lastPaymentDate).toBeDefined();

    // 2. Validar que getDebtDueStatus lo reconozca inmediatamente como "up_to_date"
    const status = getDebtDueStatus(newLoan.dueDay ?? 1, newLoan.lastPaymentDate);
    expect(status.status).toBe('up_to_date');
    expect(status.isUpToDateThisMonth).toBe(true);
    // Vence el 20 de Noviembre
    expect(status.nextDueDate.getMonth()).toBe(10); // Noviembre
    expect(status.nextDueDate.getDate()).toBe(20);
    expect(status.nextDueDateFormatted).toBe('20 Nov');
  });
});

describe('Agrupación Bancaria, Ordenamiento Menor a Mayor y Cobertura Visual de Deudas', () => {
  it('Debe agrupar deudas personales por entidad bancaria y ordenar de menor a mayor saldo restante', () => {
    const debts: PersonalDebt[] = [
      {
        id: 'debt-1',
        title: 'Préstamo Auto',
        entity: 'Banco Santander',
        category: 'loan',
        totalAmount: 10000,
        remainingAmount: 8000,
        dueDate: 'Día 10 de cada mes',
        icon: 'cash-outline',
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'debt-2',
        title: 'Préstamo Personal Menor',
        entity: 'BBVA',
        category: 'loan',
        totalAmount: 2000,
        remainingAmount: 500,
        dueDate: 'Día 15 de cada mes',
        icon: 'cash-outline',
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'debt-3',
        title: 'Préstamo Moto Santander',
        entity: 'Banco Santander',
        category: 'loan',
        totalAmount: 5000,
        remainingAmount: 1200,
        dueDate: 'Día 10 de cada mes',
        icon: 'cash-outline',
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'debt-4',
        title: 'Préstamo Hipotecario BBVA',
        entity: 'BBVA',
        category: 'mortgage',
        totalAmount: 50000,
        remainingAmount: 45000,
        dueDate: 'Día 20 de cada mes',
        icon: 'cash-outline',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];

    const grouped = groupPersonalDebtsByBank(debts);

    expect(grouped).toHaveLength(2);

    const santanderGroup = grouped.find((g) => g.entityName === 'Banco Santander');
    expect(santanderGroup).toBeDefined();
    expect(santanderGroup?.totalRemaining).toBe(9200);
    expect(santanderGroup?.debts).toHaveLength(2);
    // Ordenado de menor a mayor saldo: 1200 antes que 8000
    expect(santanderGroup?.debts[0].remainingAmount).toBe(1200);
    expect(santanderGroup?.debts[1].remainingAmount).toBe(8000);

    const bbvaGroup = grouped.find((g) => g.entityName === 'BBVA');
    expect(bbvaGroup).toBeDefined();
    expect(bbvaGroup?.totalRemaining).toBe(45500);
    expect(bbvaGroup?.debts).toHaveLength(2);
    // Ordenado de menor a mayor saldo: 500 antes que 45000
    expect(bbvaGroup?.debts[0].remainingAmount).toBe(500);
    expect(bbvaGroup?.debts[1].remainingAmount).toBe(45000);
  });

  it('Debe agrupar cargos de terceros por tarjeta y ordenar de menor a mayor saldo restante', () => {
    const charges: ThirdPartyCardCharge[] = [
      {
        id: 'c-1',
        personName: 'Carlos',
        cardName: 'Visa Oro',
        concept: 'Cena Restaurante',
        amount: 300,
        totalAmount: 300,
        remainingAmount: 200,
        installmentsCount: 1,
        monthlyInstallmentAmount: 300,
        currentPeriodPaidAmount: 100,
        paidInstallmentsCount: 0,
        date: '2026-10-05T00:00:00Z',
        settled: false,
        createdAt: '2026-10-05T00:00:00Z',
      },
      {
        id: 'c-2',
        personName: 'Carlos',
        cardName: 'Mastercard Black',
        concept: 'Vuelo',
        amount: 1500,
        totalAmount: 1500,
        remainingAmount: 1500,
        installmentsCount: 3,
        monthlyInstallmentAmount: 500,
        currentPeriodPaidAmount: 0,
        paidInstallmentsCount: 0,
        date: '2026-10-06T00:00:00Z',
        settled: false,
        createdAt: '2026-10-06T00:00:00Z',
      },
      {
        id: 'c-3',
        personName: 'Carlos',
        cardName: 'Visa Oro',
        concept: 'Café',
        amount: 50,
        totalAmount: 50,
        remainingAmount: 25,
        installmentsCount: 1,
        monthlyInstallmentAmount: 50,
        currentPeriodPaidAmount: 25,
        paidInstallmentsCount: 0,
        date: '2026-10-07T00:00:00Z',
        settled: false,
        createdAt: '2026-10-07T00:00:00Z',
      },
    ];

    const cardGroups = groupThirdPartyChargesByCard(charges);
    expect(cardGroups).toHaveLength(2);

    const visaGroup = cardGroups.find((g) => g.cardName === 'Visa Oro');
    expect(visaGroup).toBeDefined();
    expect(visaGroup?.charges).toHaveLength(2);
    expect(visaGroup?.totalRemaining).toBe(225);
    // Ordenado menor a mayor: 25 antes que 200
    expect(visaGroup?.charges[0].remainingAmount).toBe(25);
    expect(visaGroup?.charges[1].remainingAmount).toBe(200);

    const masterGroup = cardGroups.find((g) => g.cardName === 'Mastercard Black');
    expect(masterGroup).toBeDefined();
    expect(masterGroup?.charges).toHaveLength(1);
    expect(masterGroup?.charges[0].remainingAmount).toBe(1500);
  });

  it('Debe clasificar correctamente los indicadores visuales de cobertura: CUBIERTO, EN AMORTIZACIÓN y POR CUBRIR', () => {
    // 1. Caso CUBIERTO: saldo restante 0 o settled true
    const coveredCharge: ThirdPartyCardCharge = {
      id: 'cov-1',
      personName: 'Laura',
      cardName: 'Visa',
      concept: 'Zapatillas',
      amount: 100,
      totalAmount: 100,
      remainingAmount: 0,
      installmentsCount: 1,
      monthlyInstallmentAmount: 100,
      currentPeriodPaidAmount: 100,
      paidInstallmentsCount: 1,
      date: '2026-10-01',
      settled: true,
      createdAt: '2026-10-01',
    };
    const infoCovered = getThirdPartyCoverageInfo(coveredCharge);
    expect(infoCovered.status).toBe('covered');
    expect(infoCovered.badgeLabel).toBe('CUBIERTO');
    expect(infoCovered.color).toBe('#00FFA3');
    expect(infoCovered.remainingAmount).toBe(0);

    // 2. Caso EN AMORTIZACIÓN: 0 < remainingAmount < amount
    const amortizingCharge: ThirdPartyCardCharge = {
      id: 'cov-2',
      personName: 'Laura',
      cardName: 'Visa',
      concept: 'Celular',
      amount: 1000,
      totalAmount: 1000,
      remainingAmount: 400,
      installmentsCount: 5,
      monthlyInstallmentAmount: 200,
      currentPeriodPaidAmount: 200,
      paidInstallmentsCount: 3,
      date: '2026-10-01',
      settled: false,
      createdAt: '2026-10-01',
    };
    const infoAmortizing = getThirdPartyCoverageInfo(amortizingCharge);
    expect(infoAmortizing.status).toBe('amortizing');
    expect(infoAmortizing.badgeLabel).toBe('EN AMORTIZACIÓN');
    expect(infoAmortizing.color).toBe('#FF9F0A');
    expect(infoAmortizing.amortizedAmount).toBe(600);
    expect(infoAmortizing.remainingAmount).toBe(400);

    // 3. Caso POR CUBRIR: remainingAmount === amount (sin abonos aplicados aún)
    const pendingCharge: ThirdPartyCardCharge = {
      id: 'cov-3',
      personName: 'Laura',
      cardName: 'Visa',
      concept: 'Curso Online',
      amount: 350,
      totalAmount: 350,
      remainingAmount: 350,
      installmentsCount: 1,
      monthlyInstallmentAmount: 350,
      currentPeriodPaidAmount: 0,
      paidInstallmentsCount: 0,
      date: '2026-10-01',
      settled: false,
      createdAt: '2026-10-01',
    };
    const infoPending = getThirdPartyCoverageInfo(pendingCharge);
    expect(infoPending.status).toBe('pending');
    expect(infoPending.badgeLabel).toBe('POR CUBRIR');
    expect(infoPending.color).toBe('#FF453A');
    expect(infoPending.remainingAmount).toBe(350);
    expect(infoPending.amortizedAmount).toBe(0);
  });
});

describe('Transición Automática y Reseteo de Ciclo Mensual para Compras de Terceros', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useDebtsStore.getState().clearAllDebts();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Caso: Transición automática de Octubre a Noviembre y reseteo de ciclo para compras de terceros (8 compras de Junior)', () => {
    // 1. Simular fecha: 15 de Octubre de 2026
    const octRefDate = new Date('2026-10-15T12:00:00Z');
    jest.setSystemTime(octRefDate);

    // 2. Cargar las 8 compras de Junior:
    // 7 compras en tarjeta Next:
    // - jim.com leandro: cuota 2 de 3, valor cuota: 219.76, total: 659.28 (1 pagada previa, restan 439.52)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'jim.com leandro',
      amount: 659.28,
      installmentsCount: 3,
      monthlyInstallmentAmount: 219.76,
      initialPaidInstallments: 1,
      paidInstallmentsCount: 1,
      isPreexisting: true,
      remainingAmount: 439.52,
      date: '2026-10-01T12:00:00Z',
    });

    // - marajo recidos: cuota 2 de 3, valor cuota: 161.70, total: 485.10 (1 pagada previa, restan 323.40)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'marajo recidos',
      amount: 485.10,
      installmentsCount: 3,
      monthlyInstallmentAmount: 161.70,
      initialPaidInstallments: 1,
      paidInstallmentsCount: 1,
      isPreexisting: true,
      remainingAmount: 323.40,
      date: '2026-10-01T12:00:00Z',
    });

    // - juliana calzados: cuota 2 de 2, valor cuota: 182.45, total: 364.90 (1 pagada previa, restan 182.45)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'juliana calzados',
      amount: 364.90,
      installmentsCount: 2,
      monthlyInstallmentAmount: 182.45,
      initialPaidInstallments: 1,
      paidInstallmentsCount: 1,
      isPreexisting: true,
      remainingAmount: 182.45,
      date: '2026-10-01T12:00:00Z',
    });

    // - casa das pipocas: cuota 7 de 8, valor cuota: 187.50, total: 1500.00 (6 pagadas previas, restan 375.00)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'casa das pipocas',
      amount: 1500.00,
      installmentsCount: 8,
      monthlyInstallmentAmount: 187.50,
      initialPaidInstallments: 6,
      paidInstallmentsCount: 6,
      isPreexisting: true,
      remainingAmount: 375.00,
      date: '2026-10-01T12:00:00Z',
    });

    // - mp topplaza: cuota 8 de 10, valor cuota: 239.44, total: 2394.40 (7 pagadas previas, restan 718.32)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'mp topplaza',
      amount: 2394.40,
      installmentsCount: 10,
      monthlyInstallmentAmount: 239.44,
      initialPaidInstallments: 7,
      paidInstallmentsCount: 7,
      isPreexisting: true,
      remainingAmount: 718.32,
      date: '2026-10-01T12:00:00Z',
    });

    // - marajo tecidos: cuota 2 de 3, valor cuota: 183.98, total: 551.94 (1 pagada previa, restan 367.96)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'marajo tecidos',
      amount: 551.94,
      installmentsCount: 3,
      monthlyInstallmentAmount: 183.98,
      initialPaidInstallments: 1,
      paidInstallmentsCount: 1,
      isPreexisting: true,
      remainingAmount: 367.96,
      date: '2026-10-01T12:00:00Z',
    });

    // - bike breves: cuota 1 de 3, valor cuota: 209.68, total: 629.04 (0 pagadas previas, restan 629.04)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'bike breves',
      amount: 629.04,
      installmentsCount: 3,
      monthlyInstallmentAmount: 209.68,
      initialPaidInstallments: 0,
      paidInstallmentsCount: 0,
      isPreexisting: false,
      remainingAmount: 629.04,
      date: '2026-10-01T12:00:00Z',
    });

    // 1 compra en tarjeta Nubank:
    // - cocina: cuota 2 de 3, valor cuota: 2628.27, total: 7884.81 (1 pagada previa, restan 5256.54)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Nubank',
      concept: 'cocina',
      amount: 7884.81,
      installmentsCount: 3,
      monthlyInstallmentAmount: 2628.27,
      initialPaidInstallments: 1,
      paidInstallmentsCount: 1,
      isPreexisting: true,
      remainingAmount: 5256.54,
      date: '2026-10-01T12:00:00Z',
    });

    // 3. Verificación de estado previo al abono en Octubre:
    // Deuda inicial total: 8.292,23
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(8292.23);
    const summaryOctBefore = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(octRefDate);
    const juniorOctBefore = summaryOctBefore.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorOctBefore).toBeDefined();
    expect(juniorOctBefore.chargesCount).toBe(8);
    expect(juniorOctBefore.monthlyDueAmount).toBe(4012.78);
    expect(juniorOctBefore.monthlyPaidAmount).toBe(0);
    expect(juniorOctBefore.monthlyPendingAmount).toBe(4012.78);
    expect(juniorOctBefore.totalRemainingDebt).toBe(8292.23);
    expect(juniorOctBefore.isMonthSettled).toBe(false);

    // 4. Registrar abono del ciclo de Octubre ($4.012,78):
    const abonoResult = useDebtsStore.getState().recordMonthlyPersonAbono(
      'Junior',
      4012.78,
      undefined,
      juniorOctBefore.personId
    );
    expect(abonoResult.updatedCharges).toHaveLength(8);

    // 5. Verificar que en Octubre queda al día y Juliana Calzados se liquida:
    const summaryOctAfter = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(octRefDate);
    const juniorOctAfter = summaryOctAfter.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorOctAfter).toBeDefined();
    expect(juniorOctAfter.monthlyDueAmount).toBe(4012.78);
    expect(juniorOctAfter.monthlyPaidAmount).toBe(4012.78);
    expect(juniorOctAfter.monthlyPendingAmount).toBe(0);
    expect(juniorOctAfter.isMonthSettled).toBe(true);
    expect(juniorOctAfter.totalRemainingDebt).toBe(4279.45);
    expect(juniorOctAfter.chargesCount).toBe(8);

    const julianaCharge = useDebtsStore
      .getState()
      .thirdPartyCharges.find((c) => c.concept.toLowerCase().includes('juliana'))!;
    expect(julianaCharge.remainingAmount).toBe(0);
    expect(julianaCharge.settled).toBe(true);
    expect(julianaCharge.paidInstallmentsCount).toBe(2);

    // 6. Avanzar el tiempo a 15 de Noviembre de 2026:
    const novRefDate = new Date('2026-11-15T12:00:00Z');
    jest.setSystemTime(novRefDate);

    // 7. Invocar getThirdPartyMonthlyBillingSummary para Noviembre:
    const summaryNov = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(novRefDate);
    const juniorNov = summaryNov.find((s) => s.personName.toLowerCase().includes('junior'))!;

    // 8. Verificaciones rigurosas en Noviembre:
    // - monthlyPaidAmount es 0.
    expect(juniorNov.monthlyPaidAmount).toBe(0);
    // - monthlyDueAmount es exactamente $3.830,33 (las cuotas de las 7 compras activas, sin Juliana Calzados).
    expect(juniorNov.monthlyDueAmount).toBe(3830.33);
    // - monthlyPendingAmount es $3.830,33.
    expect(juniorNov.monthlyPendingAmount).toBe(3830.33);
    // - La deuda total remanente es $4.279,45.
    expect(juniorNov.totalRemainingDebt).toBe(4279.45);
    // - Solo 7 compras activas visibles (Juliana Calzados fue saldada el mes anterior y no pertenece a Noviembre).
    expect(juniorNov.chargesCount).toBe(7);
    expect(juniorNov.isMonthSettled).toBe(false);
    expect(juniorNov.charges.some((c) => c.concept.toLowerCase().includes('juliana'))).toBe(false);

    // 9. Registrar abono de Noviembre ($3.830,33) y verificar que currentPeriodPaidAmount se reinicia y liquida 5 compras más:
    const abonoNov = useDebtsStore.getState().recordMonthlyPersonAbono(
      'Junior',
      3830.33,
      undefined,
      juniorNov.personId
    );
    expect(abonoNov.updatedCharges).toHaveLength(7);

    const summaryNovAfter = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(novRefDate);
    const juniorNovAfter = summaryNovAfter.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorNovAfter.monthlyPaidAmount).toBe(3830.33);
    expect(juniorNovAfter.monthlyPendingAmount).toBe(0);
    expect(juniorNovAfter.isMonthSettled).toBe(true);
    expect(juniorNovAfter.totalRemainingDebt).toBe(449.12);

    // 10. Avanzar a 15 de Diciembre de 2026:
    const decRefDate = new Date('2026-12-15T12:00:00Z');
    jest.setSystemTime(decRefDate);
    const summaryDec = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(decRefDate);
    const juniorDec = summaryDec.find((s) => s.personName.toLowerCase().includes('junior'))!;

    // En Diciembre solo restan las 2 compras activas (mp topplaza y bike breves) por $449,12:
    expect(juniorDec.chargesCount).toBe(2);
    expect(juniorDec.monthlyPaidAmount).toBe(0);
    expect(juniorDec.monthlyDueAmount).toBe(449.12);
    expect(juniorDec.monthlyPendingAmount).toBe(449.12);
    expect(juniorDec.totalRemainingDebt).toBe(449.12);
  });
});



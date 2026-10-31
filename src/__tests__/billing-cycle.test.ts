/// <reference types="jest" />
import { useTransactionsStore } from '../store/transactions-store';
import { useCardsStore } from '../store/cards-store';
import { useDebtsStore } from '../store/debts-store';
import {
  getProjectedCardBillingPeriod,
  isOneTimeExpenseInPeriod,
  getProjectedInstallmentInfo,
  getInstallmentProgressInfo,
  getEffectivePaidInstallments,
} from '../utils/date-helpers';

describe('Ciclo de Facturación y Métricas Mensuales (Simulación Temporal)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useTransactionsStore.getState().clearAllTransactions();
    useDebtsStore.getState().clearAllDebts();

    useCardsStore.setState({
      cards: [
        {
          id: 'test-card-1',
          name: 'Visa Test',
          bankName: 'Test Bank',
          closingDay: 20,
          paymentDay: 5,
          cutOffDay: 20,
          isDefault: true,
          createdAt: new Date().toISOString(),
        },
      ],
      banks: [],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Caso 1: Compra con tarjeta antes del día de cierre (d < closingDay) impacta el mes corriente', () => {
    // 19 de Octubre 2026 (antes del corte del día 20)
    jest.setSystemTime(new Date('2026-10-19T14:00:00Z'));

    useTransactionsStore.getState().addTransaction({
      title: 'Compra antes de corte',
      amount: 100,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    // En Octubre 2026: debe computarse en el gasto mensual actual
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(100);

    // Viajamos en el tiempo a Noviembre 2026
    jest.setSystemTime(new Date('2026-11-05T14:00:00Z'));

    // En Noviembre 2026: el gasto de Octubre ya no corresponde al mes corriente
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(0);
  });

  it('Caso 2: Compra con tarjeta en el día de cierre (d === closingDay) se difiere al siguiente mes', () => {
    // 20 de Octubre 2026 (exactamente el día de corte)
    jest.setSystemTime(new Date('2026-10-20T10:00:00Z'));

    useTransactionsStore.getState().addTransaction({
      title: 'Compra en día de corte',
      amount: 150,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    // En Octubre 2026: no se cobra en Octubre porque cerró el ciclo
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(0);

    // Viajamos en el tiempo a Noviembre 2026
    jest.setSystemTime(new Date('2026-11-05T10:00:00Z'));

    // En Noviembre 2026: entra en la factura del nuevo ciclo
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(150);
  });

  it('Caso 3: Compra con tarjeta después del día de cierre (d > closingDay) se difiere al siguiente mes', () => {
    // 25 de Octubre 2026 (después del corte del día 20)
    jest.setSystemTime(new Date('2026-10-25T12:00:00Z'));

    useTransactionsStore.getState().addTransaction({
      title: 'Compra después de corte',
      amount: 200,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    // En Octubre 2026: gasto es 0
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(0);

    // En Noviembre 2026: factura refleja los 200
    jest.setSystemTime(new Date('2026-11-05T10:00:00Z'));
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(200);
  });

  it('Caso 4: Salto de año (Diciembre con d >= closingDay entra en factura de Enero del año siguiente)', () => {
    // 22 de Diciembre 2026 (d >= 20 en Diciembre)
    jest.setSystemTime(new Date('2026-12-22T10:00:00Z'));

    useTransactionsStore.getState().addTransaction({
      title: 'Compra navideña tras corte',
      amount: 300,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    // En Diciembre 2026: no entra en el mes
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(0);

    // Viajamos a Enero 2027
    jest.setSystemTime(new Date('2027-01-15T10:00:00Z'));

    // En Enero 2027: entra en la factura
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(300);
  });

  it('Caso 5: Gasto en efectivo/débito no espera al corte e impacta inmediatamente', () => {
    // 25 de Octubre 2026
    jest.setSystemTime(new Date('2026-10-25T15:00:00Z'));

    useTransactionsStore.getState().addTransaction({
      title: 'Cena en efectivo',
      amount: 50,
      type: 'expense',
      category: 'Comida',
      paymentMethod: 'cash_debit',
    });

    // Debe sumarse inmediatamente en Octubre 2026 a pesar de ser d > 20
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(50);
  });

  it('Caso 6: Balance neto del mes y combinación de ingresos y gastos de diferente método', () => {
    // 5 de Octubre 2026
    jest.setSystemTime(new Date('2026-10-05T10:00:00Z'));

    // Ingreso
    useTransactionsStore.getState().addTransaction({
      title: 'Ingreso salarial',
      amount: 1000,
      type: 'income',
      category: 'Salario',
    });

    // Gasto en efectivo
    useTransactionsStore.getState().addTransaction({
      title: 'Supermercado',
      amount: 200,
      type: 'expense',
      category: 'Comida',
      paymentMethod: 'cash_debit',
    });

    // Gasto con tarjeta antes del corte (corte = 20, hoy = 5)
    useTransactionsStore.getState().addTransaction({
      title: 'Ropa',
      amount: 100,
      type: 'expense',
      category: 'Shopping',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    expect(useTransactionsStore.getState().getCurrentMonthIncome()).toBe(1000);
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(300);
    expect(useTransactionsStore.getState().getCurrentMonthNetBalance()).toBe(700);
  });

  it('Caso 7: Soporte de fecha personalizada explícita en CreateTransactionDTO', () => {
    jest.setSystemTime(new Date('2026-10-30T12:00:00Z'));

    useTransactionsStore.getState().addTransaction({
      title: 'Transacción con fecha explícita previa al corte',
      amount: 80,
      type: 'expense',
      category: 'Transporte',
      date: '2026-10-15T12:00:00.000Z',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    const tx = useTransactionsStore.getState().transactions[0];
    expect(tx.date).toBe('2026-10-15T12:00:00.000Z');
    expect(tx.createdAt).toBe('2026-10-15T12:00:00.000Z');
    // Como la fecha explícita es día 15 (< corte 20) y estamos en Octubre 2026, computa en Octubre
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(80);
  });

  it('Caso 8: Registro de pago de tarjeta (card_payment) reduce el compromiso exigible de la tarjeta en el ciclo y el saldo bancario con Fake Timers', () => {
    // Fijamos fecha en 10 de Octubre 2026 (antes del corte del día 20)
    jest.setSystemTime(new Date('2026-10-10T10:00:00Z'));

    // Configuramos banco con saldo inicial de 1000
    const bank = useCardsStore.getState().addBank('Bancolombia', 1000);

    // Compra con tarjeta antes del corte por 250
    useTransactionsStore.getState().addTransaction({
      title: 'Compra de supermercado con tarjeta',
      amount: 250,
      type: 'expense',
      category: 'Comida',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    // En Octubre, el gasto mensual corriente es 250 (la compra con tarjeta)
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(250);
    // El saldo bancario inicial sigue intacto en 1000 porque la compra fue con crédito
    expect(useTransactionsStore.getState().getBankComputedBalance(bank.id, 1000)).toBe(1000);

    // Registramos el pago de tarjeta (card_payment) de 250 debitando desde el banco
    useTransactionsStore.getState().addTransaction({
      title: 'Pago Tarjeta Visa Test',
      amount: 250,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      paymentMethod: 'cash_debit',
      cardId: 'test-card-1',
      bankId: bank.id,
    });

    // 1. El dinero debe salir efectivamente de la cuenta bancaria: 1000 - 250 = 750
    expect(useTransactionsStore.getState().getBankComputedBalance(bank.id, 1000)).toBe(750);

    // 2. card_payment NO debe duplicar el gasto del mes (el gasto del mes debe seguir siendo 250, NO 500)
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(250);

    // 3. Verificamos que los pagos efectuados a la tarjeta totalicen 250
    const cardPayments = useTransactionsStore
      .getState()
      .transactions.filter((t) => t.type === 'card_payment' && t.cardId === 'test-card-1')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(cardPayments).toBe(250);

    // 4. El compromiso exigible neto de la tarjeta queda saldado (250 compras - 250 pagos = 0)
    const rawCyclePurchases = useTransactionsStore
      .getState()
      .transactions.filter(
        (t) => t.type === 'expense' && t.paymentMethod === 'credit_card' && t.cardId === 'test-card-1'
      )
      .reduce((sum, t) => sum + t.amount, 0);
    const netCardDebt = Math.max(0, rawCyclePurchases - cardPayments);
    expect(netCardDebt).toBe(0);
  });

  it('Caso 9: Consolidación de compromisos de tarjeta para Próximos Vencimientos y exclusión de compras individuales sueltas con Fake Timers', () => {
    // Fijamos fecha en 12 de Octubre 2026 (antes del corte del día 20)
    jest.setSystemTime(new Date('2026-10-12T10:00:00Z'));
    const currentMonth = 9; // Octubre (0-indexed)
    const currentYear = 2026;

    // 1. Agregamos un préstamo personal puro (ej: crédito libre inversión bancario tradicional)
    useDebtsStore.getState().addPersonalDebt({
      title: 'Préstamo Personal Bancolombia',
      entity: 'Bancolombia',
      category: 'loan',
      debtType: 'installment_loan',
      totalAmount: 3000,
      remainingAmount: 3000,
      monthlyPayment: 250,
      totalInstallments: 12,
      paidInstallments: 0,
      dueDay: 15,
      dueDate: 'Día 15 de cada mes',
      icon: 'cash-outline',
    });

    // 2. Agregamos una compra propia a cuotas realizada con tarjeta de crédito
    useDebtsStore.getState().addPersonalDebt({
      title: 'Laptop a 12 Cuotas',
      entity: 'Visa Test',
      category: 'credit_card',
      debtType: 'installment_loan',
      cardId: 'test-card-1',
      totalAmount: 1200,
      remainingAmount: 1200,
      monthlyPayment: 100,
      totalInstallments: 12,
      paidInstallments: 0,
      dueDay: 5,
      dueDate: 'Día 5 de cada mes',
      icon: 'card-outline',
    });

    // 3. Agregamos un consumo de tercero con tarjeta (ThirdPartyCardCharge)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Carlos Mendoza',
      cardName: 'Visa Test',
      cardId: 'test-card-1',
      concept: 'Celular a cuotas',
      amount: 600,
      installmentsCount: 6,
      paidInstallmentsCount: 0,
      remainingAmount: 600,
    });

    // 4. Agregamos una compra corriente del ciclo con tarjeta antes del corte (80)
    useTransactionsStore.getState().addTransaction({
      title: 'Compra de supermercado corriente',
      amount: 80,
      type: 'expense',
      category: 'Comida',
      paymentMethod: 'credit_card',
      cardId: 'test-card-1',
    });

    const pDebts = useDebtsStore.getState().personalDebts;
    const tpCharges = useDebtsStore.getState().thirdPartyCharges;
    const txs = useTransactionsStore.getState().transactions;
    const card = useCardsStore.getState().cards[0];

    // A. Verificamos que purePersonalDebts excluye estrictamente compras en tarjeta a cuotas
    const purePersonalDebts = pDebts.filter(
      (d) => d.category !== 'credit_card' && !d.cardId && !d.settled && d.remainingAmount > 0
    );
    expect(purePersonalDebts).toHaveLength(1);
    expect(purePersonalDebts[0].title).toBe('Préstamo Personal Bancolombia');

    // B. Verificamos la computación de extracto consolidado de tarjeta para el ciclo actual
    const cardClosingDay = card.closingDay ?? 20;

    // Compras corrientes directas en ciclo
    const currentCycleTransactions = txs
      .filter((t) => {
        if (t.type !== 'expense') return false;
        if (t.paymentMethod !== 'credit_card') return false;
        if (t.cardId !== card.id) return false;
        if (t.relatedDebtId || t.relatedChargeId || t.relatedLoanId) return false;

        const txDate = new Date(t.date);
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
      .reduce((acc, t) => acc + t.amount, 0);

    // Cuotas del mes de compras propias en tarjeta
    const linkedPersonalDebts = pDebts.filter(
      (d) => d.cardId === card.id && !d.settled && d.remainingAmount > 0
    );
    const personalMonthDue = linkedPersonalDebts.reduce((acc, d) => {
      const rem = d.remainingAmount ?? 0;
      if (d.monthlyPayment && d.monthlyPayment > 0) {
        return acc + Math.min(rem, d.monthlyPayment);
      }
      return acc + rem;
    }, 0);

    // Cuotas del mes de compras de terceros vinculadas a la tarjeta
    const linkedThirdPartyCharges = tpCharges.filter(
      (c) => c.cardId === card.id && !c.settled && c.remainingAmount > 0
    );
    const thirdPartyMonthDue = linkedThirdPartyCharges.reduce((acc, c) => {
      const rem = c.remainingAmount ?? 0;
      const count = c.installmentsCount ?? 1;
      if (count <= 1) return acc + rem;
      const monthly =
        c.monthlyInstallmentAmount && c.monthlyInstallmentAmount > 0
          ? c.monthlyInstallmentAmount
          : rem;
      return acc + Math.min(rem, monthly);
    }, 0);

    // Pagos registrados
    const cardPayments = txs
      .filter((t) => t.type === 'card_payment' && t.cardId === card.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const cardCurrentMonthDebt = Math.max(
      0,
      personalMonthDue + thirdPartyMonthDue + currentCycleTransactions - cardPayments
    );

    // 80 (corriente) + 100 (cuota personal) + 100 (cuota tercero: 600/6) = 280
    expect(currentCycleTransactions).toBe(80);
    expect(personalMonthDue).toBe(100);
    expect(thirdPartyMonthDue).toBe(100);
    expect(cardPayments).toBe(0);
    expect(cardCurrentMonthDebt).toBe(280);

    // C. Si se registra un abono de 100 a la tarjeta en el ciclo
    useTransactionsStore.getState().addTransaction({
      title: 'Abono Tarjeta Visa Test',
      amount: 100,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      paymentMethod: 'cash_debit',
      cardId: 'test-card-1',
    });

    const updatedTxs = useTransactionsStore.getState().transactions;
    const updatedPayments = updatedTxs
      .filter((t) => t.type === 'card_payment' && t.cardId === card.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const updatedCardCurrentMonthDebt = Math.max(
      0,
      personalMonthDue + thirdPartyMonthDue + currentCycleTransactions - updatedPayments
    );

    // 280 - 100 = 180
    expect(updatedPayments).toBe(100);
    expect(updatedCardCurrentMonthDebt).toBe(180);
  });
});

describe('Proyección de Consumos y Cuotas Futuras (Offsets +1 y +2 meses)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useTransactionsStore.getState().clearAllTransactions();
    useDebtsStore.getState().clearAllDebts();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Valida cálculo de fechas de corte y vencimiento con offsets (+1 y +2 meses) incluyendo cambio de año y meses variables', () => {
    // Fijamos fecha: 15 de Octubre 2026
    jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    const baseDate = new Date();

    const card = {
      closingDay: 20,
      paymentDay: 5,
    };

    // Offset 0: Octubre 2026
    const period0 = getProjectedCardBillingPeriod(card, 0, baseDate);
    expect(period0.statementMonth).toBe(9); // Octubre (índice 9)
    expect(period0.statementYear).toBe(2026);
    expect(period0.statementMonthName).toBe('Octubre');
    expect(period0.periodLabel).toBe('Actual');
    expect(period0.closingDate.getDate()).toBe(20);
    expect(period0.closingDate.getMonth()).toBe(9);
    expect(period0.paymentDueDate.getDate()).toBe(5);
    expect(period0.paymentDueDate.getMonth()).toBe(10); // Noviembre
    expect(period0.cycleStatementMonthName).toBe('Extracto Octubre 2026');

    // Offset 1: Próximo Mes (Noviembre 2026)
    const period1 = getProjectedCardBillingPeriod(card, 1, baseDate);
    expect(period1.statementMonth).toBe(10); // Noviembre
    expect(period1.statementYear).toBe(2026);
    expect(period1.statementMonthName).toBe('Noviembre');
    expect(period1.periodLabel).toBe('Próximo Mes');
    expect(period1.closingDate.getDate()).toBe(20);
    expect(period1.closingDate.getMonth()).toBe(10);
    expect(period1.paymentDueDate.getDate()).toBe(5);
    expect(period1.paymentDueDate.getMonth()).toBe(11); // Diciembre
    expect(period1.cycleStatementMonthName).toBe('Extracto Noviembre 2026');

    // Offset 2: En 2 Meses (Diciembre 2026 con pago en Enero 2027 - Salto de año!)
    const period2 = getProjectedCardBillingPeriod(card, 2, baseDate);
    expect(period2.statementMonth).toBe(11); // Diciembre
    expect(period2.statementYear).toBe(2026);
    expect(period2.statementMonthName).toBe('Diciembre');
    expect(period2.periodLabel).toBe('+2 Meses');
    expect(period2.closingDate.getDate()).toBe(20);
    expect(period2.closingDate.getMonth()).toBe(11);
    expect(period2.paymentDueDate.getDate()).toBe(5);
    expect(period2.paymentDueDate.getMonth()).toBe(0); // Enero
    expect(period2.paymentDueDate.getFullYear()).toBe(2027); // Año 2027!
    expect(period2.cycleStatementMonthName).toBe('Extracto Diciembre 2026');

    // Salto de año desde Diciembre y meses cortos (Febrero 28 días)
    // Fijamos fecha en 15 de Diciembre 2026
    jest.setSystemTime(new Date('2026-12-15T12:00:00Z'));
    const baseDec = new Date();
    const cardEndMonth = { closingDay: 31, paymentDay: 10 };

    // Offset 1 desde Diciembre: Enero 2027
    const periodDec1 = getProjectedCardBillingPeriod(cardEndMonth, 1, baseDec);
    expect(periodDec1.statementMonth).toBe(0); // Enero
    expect(periodDec1.statementYear).toBe(2027);
    expect(periodDec1.closingDate.getDate()).toBe(31);
    expect(periodDec1.paymentDueDate.getDate()).toBe(10);
    expect(periodDec1.paymentDueDate.getMonth()).toBe(1); // Febrero 2027

    // Offset 2 desde Diciembre: Febrero 2027 (28 días en 2027, el día 31 debe ajustarse a 28!)
    const periodDec2 = getProjectedCardBillingPeriod(cardEndMonth, 2, baseDec);
    expect(periodDec2.statementMonth).toBe(1); // Febrero
    expect(periodDec2.statementYear).toBe(2027);
    expect(periodDec2.closingDate.getDate()).toBe(28); // Capped to 28!
    expect(periodDec2.paymentDueDate.getDate()).toBe(10);
    expect(periodDec2.paymentDueDate.getMonth()).toBe(2); // Marzo 2027
  });

  it('Valida proyección de compras post-corte de 1 cuota al próximo mes', () => {
    // Fijamos fecha en 15 de Octubre 2026
    jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    const refDate = new Date();
    const closingDay = 20;

    // Compra 1: Pre-corte (10 de Octubre 2026)
    const txPreCorte = '2026-10-10T14:00:00Z';
    expect(isOneTimeExpenseInPeriod(txPreCorte, closingDay, 0, refDate)).toBe(true);
    expect(isOneTimeExpenseInPeriod(txPreCorte, closingDay, 1, refDate)).toBe(false);
    expect(isOneTimeExpenseInPeriod(txPreCorte, closingDay, 2, refDate)).toBe(false);

    // Compra 2: Post-corte (25 de Octubre 2026)
    const txPostCorte = '2026-10-25T14:00:00Z';
    // No entra en el extracto actual de Octubre (offset 0)
    expect(isOneTimeExpenseInPeriod(txPostCorte, closingDay, 0, refDate)).toBe(false);
    // Pertenece al extracto proyectado del próximo mes (offset 1, Noviembre)
    expect(isOneTimeExpenseInPeriod(txPostCorte, closingDay, 1, refDate)).toBe(true);
    // No pertenece a dos meses adelante (offset 2)
    expect(isOneTimeExpenseInPeriod(txPostCorte, closingDay, 2, refDate)).toBe(false);

    // Compra 3: Exactamente en el día de corte (20 de Octubre 2026)
    const txDiaCorte = '2026-10-20T10:00:00Z';
    expect(isOneTimeExpenseInPeriod(txDiaCorte, closingDay, 0, refDate)).toBe(false);
    expect(isOneTimeExpenseInPeriod(txDiaCorte, closingDay, 1, refDate)).toBe(true);

    // Compra 4: Post-corte en Diciembre (salto de año hacia Enero)
    jest.setSystemTime(new Date('2026-12-10T12:00:00Z'));
    const refDec = new Date();
    const txNavidadPostCorte = '2026-12-25T18:00:00Z';
    expect(isOneTimeExpenseInPeriod(txNavidadPostCorte, closingDay, 0, refDec)).toBe(false);
    expect(isOneTimeExpenseInPeriod(txNavidadPostCorte, closingDay, 1, refDec)).toBe(true);
  });

  it('Valida proyección secuencial de cuotas para compras personales y de terceros', () => {
    // Compra en 6 cuotas de $100 cada una (total 600), ya lleva 1 cuota pagada
    const totalInstallments = 6;
    const paidInstallments = 1;
    const monthlyAmount = 100;

    // Período actual (offset = 0): Cuota 2 de 6 activa
    const actual = getProjectedInstallmentInfo(totalInstallments, paidInstallments, monthlyAmount, 0);
    expect(actual.isActiveInPeriod).toBe(true);
    expect(actual.installmentNumber).toBe(2);
    expect(actual.projectedAmount).toBe(100);
    expect(actual.badgeLabel).toBe('Cuota 2 de 6');

    // Próximo Mes (offset = 1): Cuota 3 de 6 activa
    const next = getProjectedInstallmentInfo(totalInstallments, paidInstallments, monthlyAmount, 1);
    expect(next.isActiveInPeriod).toBe(true);
    expect(next.installmentNumber).toBe(3);
    expect(next.projectedAmount).toBe(100);
    expect(next.badgeLabel).toBe('Cuota 3 de 6 • Próximo Mes');

    // En 2 Meses (offset = 2): Cuota 4 de 6 activa
    const plus2 = getProjectedInstallmentInfo(totalInstallments, paidInstallments, monthlyAmount, 2);
    expect(plus2.isActiveInPeriod).toBe(true);
    expect(plus2.installmentNumber).toBe(4);
    expect(plus2.projectedAmount).toBe(100);
    expect(plus2.badgeLabel).toBe('Cuota 4 de 6 • +2 Meses');

    // Consumo de tercero en 4 cuotas de $50, recién registrado (0 cuotas pagadas)
    const tpTotal = 4;
    const tpPaid = 0;
    const tpAmount = 50;

    const tpActual = getProjectedInstallmentInfo(tpTotal, tpPaid, tpAmount, 0);
    expect(tpActual.isActiveInPeriod).toBe(true);
    expect(tpActual.installmentNumber).toBe(1);
    expect(tpActual.projectedAmount).toBe(50);

    const tpNext = getProjectedInstallmentInfo(tpTotal, tpPaid, tpAmount, 1);
    expect(tpNext.isActiveInPeriod).toBe(true);
    expect(tpNext.installmentNumber).toBe(2);
    expect(tpNext.projectedAmount).toBe(50);
    expect(tpNext.badgeLabel).toBe('Cuota 2 de 4 • Próximo Mes');

    const tpPlus2 = getProjectedInstallmentInfo(tpTotal, tpPaid, tpAmount, 2);
    expect(tpPlus2.isActiveInPeriod).toBe(true);
    expect(tpPlus2.installmentNumber).toBe(3);
    expect(tpPlus2.projectedAmount).toBe(50);
    expect(tpPlus2.badgeLabel).toBe('Cuota 3 de 4 • +2 Meses');
  });

  it('Valida exclusión de compras que ya finalizan en el período actual o antes del horizonte proyectado', () => {
    // Caso A: Compra en 3 cuotas con 2 cuotas pagadas (se liquida la última cuota 3 en el mes actual)
    const totalA = 3;
    const paidA = 2;
    const amountA = 80;

    const actualA = getProjectedInstallmentInfo(totalA, paidA, amountA, 0);
    expect(actualA.isActiveInPeriod).toBe(true);
    expect(actualA.installmentNumber).toBe(3);
    expect(actualA.projectedAmount).toBe(80);

    // Próximo mes: Ya terminó, NO debe incluirse
    const nextA = getProjectedInstallmentInfo(totalA, paidA, amountA, 1);
    expect(nextA.isActiveInPeriod).toBe(false);
    expect(nextA.projectedAmount).toBe(0);

    // En 2 meses: Tampoco debe incluirse
    const plus2A = getProjectedInstallmentInfo(totalA, paidA, amountA, 2);
    expect(plus2A.isActiveInPeriod).toBe(false);
    expect(plus2A.projectedAmount).toBe(0);

    // Caso B: Compra en 2 cuotas recién iniciada (0 pagadas)
    // Mes actual: Cuota 1
    // Próximo mes: Cuota 2 (última)
    // En 2 meses: Ya no debe aparecer
    const totalB = 2;
    const paidB = 0;
    const amountB = 120;

    const actualB = getProjectedInstallmentInfo(totalB, paidB, amountB, 0);
    expect(actualB.isActiveInPeriod).toBe(true);
    expect(actualB.installmentNumber).toBe(1);

    const nextB = getProjectedInstallmentInfo(totalB, paidB, amountB, 1);
    expect(nextB.isActiveInPeriod).toBe(true);
    expect(nextB.installmentNumber).toBe(2);

    const plus2B = getProjectedInstallmentInfo(totalB, paidB, amountB, 2);
    expect(plus2B.isActiveInPeriod).toBe(false);
    expect(plus2B.projectedAmount).toBe(0);

    // Caso C: Compra marcada como saldada (settled = true)
    const settled = getProjectedInstallmentInfo(6, 6, 100, 1, true);
    expect(settled.isActiveInPeriod).toBe(false);
    expect(settled.projectedAmount).toBe(0);
  });

  it('Caso JBL: Valida unificación del conteo y estado de cuotas (5 cuotas, 1 pagada) con isCurrentPeriodPaid', () => {
    jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    const totalInstallments = 5;
    const paidInstallmentsCount = 1;
    const monthlyAmount = 100;

    // 1. Escenario con cuota del período actual cubierta (isCurrentPeriodPaid = true):
    // offset = 0: Cuota 1 de 5 • Cubierta
    const actualCovered = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallmentsCount,
      monthlyAmount,
      0,
      false,
      true
    );
    expect(actualCovered.isActiveInPeriod).toBe(true);
    expect(actualCovered.installmentNumber).toBe(1);
    expect(actualCovered.badgeLabel).toBe('Cuota 1 de 5 • Cubierta');

    // getInstallmentProgressInfo en período actual cubierto
    const progressCovered = getInstallmentProgressInfo(
      totalInstallments,
      paidInstallmentsCount,
      true
    );
    expect(progressCovered.currentInstallment).toBe(1);
    expect(progressCovered.currentInstallmentLabel).toBe('Cuota 1 de 5 • Cubierta');

    // offset = 1 (Próximo Mes): Cuota 2 de 5 • Próximo Mes (¡NUNCA Cuota 3 de 5!)
    const nextCovered = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallmentsCount,
      monthlyAmount,
      1,
      false,
      true
    );
    expect(nextCovered.isActiveInPeriod).toBe(true);
    expect(nextCovered.installmentNumber).toBe(2);
    expect(nextCovered.badgeLabel).toBe('Cuota 2 de 5 • Próximo Mes');
    expect(nextCovered.installmentNumber).not.toBe(3);

    // offset = 2 (En 2 Meses): Cuota 3 de 5 • +2 Meses
    const plus2Covered = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallmentsCount,
      monthlyAmount,
      2,
      false,
      true
    );
    expect(plus2Covered.isActiveInPeriod).toBe(true);
    expect(plus2Covered.installmentNumber).toBe(3);
    expect(plus2Covered.badgeLabel).toBe('Cuota 3 de 5 • +2 Meses');

    // 2. Escenario con período actual sin pagar / pendiente (isCurrentPeriodPaid = false):
    // offset = 0: Cuota 2 de 5 (Pendiente en progreso)
    const actualPending = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallmentsCount,
      monthlyAmount,
      0,
      false,
      false
    );
    expect(actualPending.isActiveInPeriod).toBe(true);
    expect(actualPending.installmentNumber).toBe(2);
    expect(actualPending.badgeLabel).toBe('Cuota 2 de 5 • Pendiente');

    const progressPending = getInstallmentProgressInfo(
      totalInstallments,
      paidInstallmentsCount,
      false
    );
    expect(progressPending.currentInstallment).toBe(2);
    expect(progressPending.currentInstallmentLabel).toBe('Cuota 2 de 5 • Pendiente');

    // offset = 1 (Próximo Mes): Cuota 3 de 5 • Próximo Mes
    const nextPending = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallmentsCount,
      monthlyAmount,
      1,
      false,
      false
    );
    expect(nextPending.isActiveInPeriod).toBe(true);
    expect(nextPending.installmentNumber).toBe(3);
    expect(nextPending.badgeLabel).toBe('Cuota 3 de 5 • Próximo Mes');

    // offset = 2 (En 2 Meses): Cuota 4 de 5 • +2 Meses
    const plus2Pending = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallmentsCount,
      monthlyAmount,
      2,
      false,
      false
    );
    expect(plus2Pending.isActiveInPeriod).toBe(true);
    expect(plus2Pending.installmentNumber).toBe(4);
    expect(plus2Pending.badgeLabel).toBe('Cuota 4 de 5 • +2 Meses');
  });

  it('Caso 11: Auto-reparación y proyección de cuotas con decimales ("VS BIKES BREVES")', () => {
    // 28 de Octubre 2026
    jest.setSystemTime(new Date('2026-10-28T12:00:00Z'));

    // Datos del caso real con decimales IEEE-754:
    // Total: $629.04, 3 cuotas de $209.68, Restante: $419.36
    const totalAmount = 629.04;
    const monthlyAmount = 209.68;
    const remainingAmount = 419.36;
    const totalInstallments = 3;
    const storedPaidCount = 0; // Guardado erróneamente en 0 debido a Math.floor con truncamiento flotante

    // 1. Verificación de getEffectivePaidInstallments:
    // Debe deducir que amortizado = 629.04 - 419.36 = 209.68 => 1 cuota pagada
    const effectivePaid = getEffectivePaidInstallments(
      totalAmount,
      remainingAmount,
      monthlyAmount,
      totalInstallments,
      storedPaidCount
    );
    expect(effectivePaid).toBe(1);

    // 2. Mes actual (offset = 0) con cuota cubierta (isCurrentPeriodPaid = true):
    const currentProgress = getInstallmentProgressInfo(
      totalInstallments,
      effectivePaid,
      true
    );
    expect(currentProgress.currentInstallment).toBe(1);
    expect(currentProgress.currentInstallmentLabel).toBe('Cuota 1 de 3 • Cubierta');
    expect(currentProgress.remainingInstallments).toBe(2);
    expect(currentProgress.progressLabel).toBe('1 pagadas · Restan 2 cuotas');
    expect(currentProgress.progressPercent).toBe(33);

    // 3. Próximo mes (offset = 1) con cuota actual cubierta:
    // Debe proyectar Cuota 2 de 3 • Próximo Mes (¡NUNCA Cuota 1 ni 0 pagadas!)
    const nextMonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      effectivePaid,
      monthlyAmount,
      1,
      false,
      true
    );
    expect(nextMonthProjected.isActiveInPeriod).toBe(true);
    expect(nextMonthProjected.installmentNumber).toBe(2);
    expect(nextMonthProjected.badgeLabel).toBe('Cuota 2 de 3 • Próximo Mes');

    // Restan cuotas con effectivePaid:
    const remainingCount = Math.max(0, totalInstallments - effectivePaid);
    expect(remainingCount).toBe(2);
    expect(`${effectivePaid} pagadas · Restan ${remainingCount} cuotas`).toBe(
      '1 pagadas · Restan 2 cuotas'
    );

    // 4. En 2 meses (offset = 2): Cuota 3 de 3 • +2 Meses
    const plus2MonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      effectivePaid,
      monthlyAmount,
      2,
      false,
      true
    );
    expect(plus2MonthProjected.isActiveInPeriod).toBe(true);
    expect(plus2MonthProjected.installmentNumber).toBe(3);
    expect(plus2MonthProjected.badgeLabel).toBe('Cuota 3 de 3 • +2 Meses');

    // 5. En 3 meses (offset = 3): Ya terminaron las 3 cuotas, no debe estar activa
    const plus3MonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      effectivePaid,
      monthlyAmount,
      3,
      false,
      true
    );
    expect(plus3MonthProjected.isActiveInPeriod).toBe(false);
  });

  it('Caso 12: Inmunidad IEEE-754 en debts-store al registrar abonos con decimales', () => {
    jest.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const store = useDebtsStore.getState();

    // Crear cargo de terceros: $629.04 en 3 cuotas de $209.68
    store.addThirdPartyCharge({
      personName: 'Carlos Test',
      cardName: 'Visa Test',
      cardId: 'test-card-1',
      concept: 'VS BIKES BREVES',
      amount: 629.04,
      installmentsCount: 3,
      monthlyInstallmentAmount: 209.68,
    });

    const charges = useDebtsStore.getState().thirdPartyCharges;
    const addedCharge = charges.find((c) => c.concept === 'VS BIKES BREVES');
    expect(addedCharge).toBeDefined();
    expect(addedCharge!.paidInstallmentsCount).toBe(0);
    expect(addedCharge!.remainingAmount).toBe(629.04);

    // Registrar abono de 1 cuota: $209.68
    store.recordThirdPartyInstallmentAbono(addedCharge!.id, 209.68);

    const updatedCharges = useDebtsStore.getState().thirdPartyCharges;
    const updatedCharge = updatedCharges.find((c) => c.id === addedCharge!.id);
    expect(updatedCharge).toBeDefined();
    expect(updatedCharge!.remainingAmount).toBe(419.36);
    // ¡Verificación crucial!: paidInstallmentsCount DEBE ser 1, NO 0 por truncamiento IEEE-754
    expect(updatedCharge!.paidInstallmentsCount).toBe(1);

    // Ahora probar abono para persona via recordMonthlyPersonAbono:
    store.addThirdPartyCharge({
      personName: 'Mariana Test',
      cardName: 'Visa Test',
      cardId: 'test-card-1',
      concept: 'Compra Decimal',
      amount: 629.04,
      installmentsCount: 3,
      monthlyInstallmentAmount: 209.68,
    });

    const marianaCharge = useDebtsStore
      .getState()
      .thirdPartyCharges.find((c) => c.concept === 'Compra Decimal');
    expect(marianaCharge).toBeDefined();

    store.recordMonthlyPersonAbono('Mariana Test', 209.68, 'test-card-1');

    const updatedMarianaCharge = useDebtsStore
      .getState()
      .thirdPartyCharges.find((c) => c.id === marianaCharge!.id);
    expect(updatedMarianaCharge).toBeDefined();
    expect(updatedMarianaCharge!.remainingAmount).toBe(419.36);
    expect(updatedMarianaCharge!.paidInstallmentsCount).toBe(1);
  });

  it('Caso 13: Conteo de cuotas propias históricas y pendientes en tarjeta (iPhone 17 Pro Max, 8 cuotas, 4 pagadas previamente)', () => {
    jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    const totalInstallments = 8;
    const paidInstallments = 4;
    const monthlyAmount = 150;

    // 1. Registrar deuda preexistente en debts-store
    const debt = useDebtsStore.getState().addPersonalDebt({
      title: 'iPhone 17 Pro Max',
      entity: 'Banco Santander',
      category: 'credit_card',
      debtType: 'installment_loan',
      cardId: 'test-card-1',
      totalAmount: 1200,
      remainingAmount: 600,
      totalInstallments,
      paidInstallments,
      initialPaidInstallments: 4,
      isPreexisting: true,
      dueDate: 'Día 20 de cada mes',
      dueDay: 20,
      monthlyPayment: monthlyAmount,
      icon: 'phone-portrait-outline',
    });

    // Validar que lastPaymentDate NO se fije a new Date() al crear deuda preexistente
    expect(debt.lastPaymentDate).toBeUndefined();

    // 2. Mes actual (offset = 0) con extracto de tarjeta pendiente (isCurrentPeriodPaid = false)
    const currentProgressPending = getInstallmentProgressInfo(
      totalInstallments,
      paidInstallments,
      false
    );
    expect(currentProgressPending.currentInstallment).toBe(5);
    expect(currentProgressPending.currentInstallmentLabel).toBe('Cuota 5 de 8 • Pendiente');
    expect(currentProgressPending.remainingInstallments).toBe(4);
    expect(currentProgressPending.progressLabel).toBe('4 pagadas · Restan 4 cuotas');

    const actualPending = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallments,
      monthlyAmount,
      0,
      false,
      false
    );
    expect(actualPending.isActiveInPeriod).toBe(true);
    expect(actualPending.installmentNumber).toBe(5);
    expect(actualPending.badgeLabel).toBe('Cuota 5 de 8 • Pendiente');

    // 3. Próximo mes (offset = 1) con período actual pendiente
    const nextMonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallments,
      monthlyAmount,
      1,
      false,
      false
    );
    expect(nextMonthProjected.isActiveInPeriod).toBe(true);
    expect(nextMonthProjected.installmentNumber).toBe(6);
    expect(nextMonthProjected.badgeLabel).toBe('Cuota 6 de 8 • Próximo Mes');

    // 4. Mes +2 (offset = 2)
    const plus2MonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallments,
      monthlyAmount,
      2,
      false,
      false
    );
    expect(plus2MonthProjected.isActiveInPeriod).toBe(true);
    expect(plus2MonthProjected.installmentNumber).toBe(7);
    expect(plus2MonthProjected.badgeLabel).toBe('Cuota 7 de 8 • +2 Meses');

    // 5. Mes +3 (offset = 3)
    const plus3MonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallments,
      monthlyAmount,
      3,
      false,
      false
    );
    expect(plus3MonthProjected.isActiveInPeriod).toBe(true);
    expect(plus3MonthProjected.installmentNumber).toBe(8);
    expect(plus3MonthProjected.badgeLabel).toBe('Cuota 8 de 8 • +3 Meses');

    // 6. Mes +4 (offset = 4): Fuera del rango de 8 cuotas, no debe estar activa
    const plus4MonthProjected = getProjectedInstallmentInfo(
      totalInstallments,
      paidInstallments,
      monthlyAmount,
      4,
      false,
      false
    );
    expect(plus4MonthProjected.isActiveInPeriod).toBe(false);

    // 7. Al pagarse el extracto de la tarjeta (isCurrentPeriodPaid = true):
    // La cuota 5 pasa a estar cubierta en el mes actual
    const currentProgressCovered = getInstallmentProgressInfo(
      totalInstallments,
      5,
      true
    );
    expect(currentProgressCovered.currentInstallment).toBe(5);
    expect(currentProgressCovered.currentInstallmentLabel).toBe('Cuota 5 de 8 • Cubierta');

    const actualCovered = getProjectedInstallmentInfo(
      totalInstallments,
      5,
      monthlyAmount,
      0,
      false,
      true
    );
    expect(actualCovered.isActiveInPeriod).toBe(true);
    expect(actualCovered.installmentNumber).toBe(5);
    expect(actualCovered.badgeLabel).toBe('Cuota 5 de 8 • Cubierta');
  });
});

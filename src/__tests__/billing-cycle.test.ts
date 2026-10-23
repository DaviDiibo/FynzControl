/// <reference types="jest" />
import { useTransactionsStore } from '../store/transactions-store';
import { useCardsStore } from '../store/cards-store';
import { useDebtsStore } from '../store/debts-store';

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

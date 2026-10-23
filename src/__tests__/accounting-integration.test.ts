/// <reference types="jest" />
import {
  useTransactionsStore,
  getBankComputedBalance,
  getBankCustodyAmount,
} from '../store/transactions-store';
import { useDebtsStore } from '../store/debts-store';
import { useCardsStore } from '../store/cards-store';

describe('Integración Contable: Amortizaciones, Cobros, Reversiones y Abonos en Dos Fases', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    useTransactionsStore.getState().clearAllTransactions();
    useDebtsStore.getState().clearAllDebts();
    useCardsStore.setState({ cards: [], banks: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Caso 1: Algoritmo de Abono a Terceros en Dos Fases (recordMonthlyPersonAbono)', () => {
    // 1. Registrar compras para Carlos:
    // Cargo A: Compra corriente a 1 cuota de $50 (compromiso del mes: $50)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Carlos',
      cardName: 'Visa Gold',
      concept: 'Cena compartida',
      amount: 50,
      installmentsCount: 1,
    });

    jest.setSystemTime(new Date('2026-10-13T12:00:01Z'));

    // Cargo B: Compra diferida a 3 cuotas de $100 ($300 total, compromiso del mes: $100)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Carlos',
      cardName: 'Visa Gold',
      concept: 'Zapatillas running',
      amount: 300,
      installmentsCount: 3,
    });

    // Verificación inicial de saldos
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(350);
    const summaryInicial = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const carlosSummaryInicial = summaryInicial.find((s) => s.personName.toLowerCase().includes('carlos'))!;
    expect(carlosSummaryInicial.monthlyDueAmount).toBe(150); // 50 + 100
    expect(carlosSummaryInicial.monthlyPendingAmount).toBe(150);
    expect(carlosSummaryInicial.isMonthSettled).toBe(false);

    // 2. FASE 1: Abono exacto del mes corriente ($150)
    const resultFase1 = useDebtsStore.getState().recordMonthlyPersonAbono('Carlos', 150);
    expect(resultFase1.updatedCharges).toHaveLength(2);

    const chargesTrasFase1 = useDebtsStore.getState().thirdPartyCharges;
    const cenaCharge = chargesTrasFase1.find((c) => c.concept === 'Cena compartida')!;
    const zapatillasCharge = chargesTrasFase1.find((c) => c.concept === 'Zapatillas running')!;

    // Cena: completamente liquidada
    expect(cenaCharge.remainingAmount).toBe(0);
    expect(cenaCharge.settled).toBe(true);
    expect(cenaCharge.currentPeriodPaidAmount).toBe(50);

    // Zapatillas: 1 cuota abonada ($100), quedan $200
    expect(zapatillasCharge.remainingAmount).toBe(200);
    expect(zapatillasCharge.settled).toBe(false);
    expect(zapatillasCharge.paidInstallmentsCount).toBe(1);
    expect(zapatillasCharge.currentPeriodPaidAmount).toBe(100);

    // El mes corriente de Carlos queda totalmente saldado
    const summaryFase1 = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const carlosSummaryFase1 = summaryFase1.find((s) => s.personName.toLowerCase().includes('carlos'))!;
    expect(carlosSummaryFase1.monthlyPendingAmount).toBe(0);
    expect(carlosSummaryFase1.isMonthSettled).toBe(true);
    expect(carlosSummaryFase1.totalRemainingDebt).toBe(200);

    // 3. FASE 2: Segundo abono con excedente que amortiza el diferido remanente ($200)
    const resultFase2 = useDebtsStore.getState().recordMonthlyPersonAbono('Carlos', 200);
    expect(resultFase2.updatedCharges).toHaveLength(1);

    const chargesTrasFase2 = useDebtsStore.getState().thirdPartyCharges;
    const zapatillasFinal = chargesTrasFase2.find((c) => c.concept === 'Zapatillas running')!;

    expect(zapatillasFinal.remainingAmount).toBe(0);
    expect(zapatillasFinal.settled).toBe(true);
    expect(zapatillasFinal.paidInstallmentsCount).toBe(3);

    // La deuda total por cobrar a terceros queda en $0
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(0);
  });

  it('Caso 2: Reversión Contable Integral al eliminar transacción de Amortización (PersonalDebt)', () => {
    // 1. Crear préstamo personal de $1200 a 12 cuotas ($100 por cuota)
    const debt = useDebtsStore.getState().addPersonalDebt({
      title: 'Préstamo Auto',
      entity: 'Banco Santander',
      category: 'loan',
      debtType: 'installment_loan',
      totalAmount: 1200,
      remainingAmount: 1200,
      totalInstallments: 12,
      paidInstallments: 0,
      monthlyPayment: 100,
      dueDate: 'Día 10 de cada mes',
      dueDay: 10,
      icon: 'cash-outline',
    });

    expect(debt.remainingAmount).toBe(1200);
    expect(debt.paidInstallments).toBe(0);

    // 2. Registrar amortización de la cuota 1 en debts-store
    useDebtsStore.getState().payPersonalDebt(debt.id, 100, { mode: 'next' });

    const debtAmortizada = useDebtsStore.getState().personalDebts.find((d) => d.id === debt.id)!;
    expect(debtAmortizada.remainingAmount).toBe(1100);
    expect(debtAmortizada.paidInstallments).toBe(1);

    // 3. Registrar la transacción contable asociada
    useTransactionsStore.getState().addTransaction({
      title: 'Pago cuota Préstamo Auto',
      amount: 100,
      type: 'expense',
      category: 'Pago Deudas',
      relatedDebtId: debt.id,
      debtPaymentMode: 'next',
      debtInstallmentsPaid: 1,
      nominalDebtAmount: 100,
    });

    const txs = useTransactionsStore.getState().transactions;
    expect(txs).toHaveLength(1);
    const txId = txs[0].id;

    // 4. Eliminar la transacción para accionar la reversión contable integral
    useTransactionsStore.getState().deleteTransaction(txId);
    expect(useTransactionsStore.getState().transactions).toHaveLength(0);

    // 5. Verificar que en useDebtsStore se ejecutó el rollback de saldo y cuotas
    const debtRevertida = useDebtsStore.getState().personalDebts.find((d) => d.id === debt.id)!;
    expect(debtRevertida.remainingAmount).toBe(1200);
    expect(debtRevertida.paidInstallments).toBe(0);
    expect(debtRevertida.settled).toBe(false);
  });

  it('Caso 3: Reversión Contable Integral en Préstamos a Amigos (FriendLoan)', () => {
    // 1. Crear préstamo a amiga Ana por $500
    const loan = useDebtsStore.getState().addFriendLoan({
      friendName: 'Ana',
      principalAmount: 500,
      dueDate: '2026-11-01',
    });

    expect(loan.remainingAmount).toBe(500);
    expect(loan.status).toBe('active');

    // 2. Cobrar abono parcial de $200
    useDebtsStore.getState().collectFriendLoan(loan.id, 200);

    const loanCobrado = useDebtsStore.getState().friendLoans.find((l) => l.id === loan.id)!;
    expect(loanCobrado.remainingAmount).toBe(300);
    expect(loanCobrado.paidAmount).toBe(200);
    expect(loanCobrado.status).toBe('partial');

    // 3. Registrar la transacción contable de ingreso vinculada
    useTransactionsStore.getState().addTransaction({
      title: 'Cobro Préstamo Ana',
      amount: 200,
      type: 'income',
      category: 'Cobro Préstamo',
      relatedLoanId: loan.id,
      personName: 'Ana',
    });

    const txs = useTransactionsStore.getState().transactions;
    expect(txs).toHaveLength(1);
    const txId = txs[0].id;

    // 4. Eliminar la transacción para accionar el rollback contable
    useTransactionsStore.getState().deleteTransaction(txId);
    expect(useTransactionsStore.getState().transactions).toHaveLength(0);

    // 5. Verificar que el préstamo regresa a su estado activo íntegro
    const loanRevertido = useDebtsStore.getState().friendLoans.find((l) => l.id === loan.id)!;
    expect(loanRevertido.remainingAmount).toBe(500);
    expect(loanRevertido.paidAmount).toBe(0);
    expect(loanRevertido.status).toBe('active');
    expect(loanRevertido.settled).toBe(false);
  });

  it('Caso 4: Reversión Contable Integral al eliminar transacción de Reembolso de Tercero', () => {
    // 1. Registrar compra individual de un tercero
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Martín Silva',
      cardName: 'Visa Gold',
      concept: 'Farmacia',
      amount: 80,
      installmentsCount: 1,
    });

    const charge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(charge.remainingAmount).toBe(80);

    // 2. Registrar cobro de abono mensual
    useDebtsStore.getState().recordMonthlyPersonAbono('Martín Silva', 80);
    const chargePagado = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === charge.id)!;
    expect(chargePagado.remainingAmount).toBe(0);
    expect(chargePagado.settled).toBe(true);

    // 3. Registrar transacción de reembolso vinculada
    useTransactionsStore.getState().addTransaction({
      title: 'Abono Martín Silva',
      amount: 80,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Martín Silva',
      relatedPersonName: 'Martín Silva',
    });

    const txId = useTransactionsStore.getState().transactions[0].id;

    // 4. Eliminar la transacción de reembolso
    useTransactionsStore.getState().deleteTransaction(txId);

    // 5. Verificar que la deuda de Martín se reactiva íntegramente
    const chargeRevertido = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === charge.id)!;
    expect(chargeRevertido.remainingAmount).toBe(80);
    expect(chargeRevertido.settled).toBe(false);
  });

  it('Caso 5: Amortización de última cuota con descuento (mode: "last") y reversión íntegra', () => {
    // Préstamo de 10 cuotas de $100 ($1000 total)
    const debt = useDebtsStore.getState().addPersonalDebt({
      title: 'Crédito Equipamiento',
      entity: 'BBVA',
      category: 'loan',
      debtType: 'installment_loan',
      totalAmount: 1000,
      remainingAmount: 1000,
      totalInstallments: 10,
      paidInstallments: 0,
      prepaidLastInstallments: 0,
      monthlyPayment: 100,
      dueDate: 'Día 15 de cada mes',
      dueDay: 15,
      icon: 'business-outline',
    });

    // Pagar última cuota con descuento por pronto pago: desembolso $80, extingue $100, ahorro $20
    useDebtsStore.getState().payPersonalDebt(debt.id, 80, {
      mode: 'last',
      installmentsCount: 1,
      nominalAmountExtinguished: 100,
      discountSaved: 20,
    });

    const debtActualizada = useDebtsStore.getState().personalDebts.find((d) => d.id === debt.id)!;
    expect(debtActualizada.remainingAmount).toBe(900);
    expect(debtActualizada.prepaidLastInstallments).toBe(1);
    expect(debtActualizada.totalDiscountSaved).toBe(20);
    expect(debtActualizada.totalActualPaid).toBe(80);

    // Registrar la transacción con sus metadatos de descuento
    useTransactionsStore.getState().addTransaction({
      title: 'Adelanto última cuota con descuento',
      amount: 80,
      type: 'expense',
      category: 'Pago Deudas',
      relatedDebtId: debt.id,
      debtPaymentMode: 'last',
      debtInstallmentsPaid: 1,
      nominalDebtAmount: 100,
      debtDiscountSaved: 20,
    });

    const txId = useTransactionsStore.getState().transactions[0].id;

    // Eliminar la transacción
    useTransactionsStore.getState().deleteTransaction(txId);

    // Verificar rollback integral de descuentos, pagos y cuotas adelantadas
    const debtRevertida = useDebtsStore.getState().personalDebts.find((d) => d.id === debt.id)!;
    expect(debtRevertida.remainingAmount).toBe(1000);
    expect(debtRevertida.prepaidLastInstallments).toBe(0);
    expect(debtRevertida.totalDiscountSaved).toBe(0);
    expect(debtRevertida.totalActualPaid).toBe(0);
    expect(debtRevertida.settled).toBe(false);
  });

  it('Caso 6: Registro de card_payment deduce fondos del banco (getBankComputedBalance), pero NO infla getCurrentMonthExpense ni duplica compras con tarjeta', () => {
    // 1. Configurar banco y tarjeta
    const bank = useCardsStore.getState().addBank('Banco Galicia');
    useCardsStore.getState().setBankBalance(bank.id, 500000);

    useCardsStore.getState().addCard({
      name: 'Visa Gold',
      bankName: 'Banco Galicia',
      creditLimit: 300000,
      closingDay: 20,
      paymentDay: 5,
    });
    const card = useCardsStore.getState().cards[0];

    // 2. Registrar compra con tarjeta de crédito de $80.000 el día 13 (antes del corte del día 20)
    useTransactionsStore.getState().addTransaction({
      title: 'Compra Supermercado TC',
      amount: 80000,
      type: 'expense',
      category: 'Alimentación',
      paymentMethod: 'credit_card',
      cardId: card.id,
      cardName: card.name,
      date: '2026-10-13T12:00:00Z',
    });

    // Verificaciones iniciales:
    // - El gasto mensual refleja los $80.000 de consumo
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(80000);
    expect(useTransactionsStore.getState().getTotalExpense()).toBe(80000);
    // - El banco aún no ha sufrido deducciones (la tarjeta financia la compra)
    expect(useTransactionsStore.getState().getBankComputedBalance(bank.id, 500000)).toBe(500000);

    // 3. Registrar el pago del resumen de la tarjeta ('card_payment') desde la cuenta bancaria
    useTransactionsStore.getState().addTransaction({
      title: 'Pago Resumen Tarjeta Visa Gold',
      amount: 80000,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      bankId: bank.id,
      cardId: card.id,
      cardName: card.name,
      paymentTarget: 'statement',
      date: '2026-10-13T14:00:00Z',
    });

    // Verificaciones críticas contables:
    // - El saldo en la cuenta bancaria deduce los $80.000 (500.000 - 80.000 = 420.000)
    expect(useTransactionsStore.getState().getBankComputedBalance(bank.id, 500000)).toBe(420000);
    expect(getBankComputedBalance(useTransactionsStore.getState().transactions, bank.id, 500000)).toBe(420000);

    // - getCurrentMonthExpense() NO debe sumar el card_payment (debe permanecer en $80.000, evitando doble gasto)
    expect(useTransactionsStore.getState().getCurrentMonthExpense()).toBe(80000);

    // - getTotalExpense() NO debe sumar el card_payment
    expect(useTransactionsStore.getState().getTotalExpense()).toBe(80000);

    // - getCurrentMonthNetBalance() refleja solo el consumo operativo
    expect(useTransactionsStore.getState().getCurrentMonthNetBalance()).toBe(-80000);
  });

  it('Caso 7: Cálculo de fondos en custodia vs saldo libre y cancelación de custodia tras el pago', () => {
    // 1. Configurar banco con $500.000 y tarjeta de crédito
    const bank = useCardsStore.getState().addBank('Santander');
    useCardsStore.getState().setBankBalance(bank.id, 500000);

    useCardsStore.getState().addCard({
      name: 'Mastercard Black',
      bankName: 'Santander',
      creditLimit: 500000,
      closingDay: 20,
      paymentDay: 10,
    });
    const card = useCardsStore.getState().cards[0];

    // 2. Un tercero realiza un abono de $60.000 por una compra compartida transferido al banco
    useTransactionsStore.getState().addTransaction({
      title: 'Abono tarjeta de Lucas',
      amount: 60000,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      bankId: bank.id,
      cardId: card.id,
      cardName: card.name,
      personName: 'Lucas',
      date: '2026-10-13T10:00:00Z',
    });

    // Saldo bancario total acumulado: base (500.000) + abono tercero (60.000) = 560.000
    const totalBalanceBefore = useTransactionsStore.getState().getBankComputedBalance(bank.id, 500000);
    expect(totalBalanceBefore).toBe(560000);

    // Mientras la tarjeta esté impaga / pendiente en el período:
    // Los $60.000 están retenidos en custodia
    const custodyBefore = useTransactionsStore.getState().getBankCustodyAmount(bank.id, [card.id]);
    expect(custodyBefore).toBe(60000);

    // También verificamos con la función pura exportada
    const pureCustodyBefore = getBankCustodyAmount(useTransactionsStore.getState().transactions, bank.id, [card.id]);
    expect(pureCustodyBefore).toBe(60000);

    // El saldo libre disponible real del usuario es de $500.000 (no puede gastarse el dinero de Lucas)
    const freeBalanceBefore = totalBalanceBefore - custodyBefore;
    expect(freeBalanceBefore).toBe(500000);

    // 3. El usuario paga la tarjeta de crédito usando los fondos del banco
    useTransactionsStore.getState().addTransaction({
      title: 'Pago Tarjeta Mastercard Black',
      amount: 60000,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      bankId: bank.id,
      cardId: card.id,
      cardName: card.name,
      paymentTarget: 'total',
      date: '2026-10-13T16:00:00Z',
    });

    // Saldo bancario post-pago: 560.000 - 60.000 = 500.000
    const totalBalanceAfter = useTransactionsStore.getState().getBankComputedBalance(bank.id, 500000);
    expect(totalBalanceAfter).toBe(500000);

    // La custodia se cancela automáticamente al haberse efectuado el pago de la tarjeta
    const custodyAfterNoArgs = useTransactionsStore.getState().getBankCustodyAmount(bank.id);
    expect(custodyAfterNoArgs).toBe(0);

    const custodyAfterWithList = useTransactionsStore.getState().getBankCustodyAmount(bank.id, []);
    expect(custodyAfterWithList).toBe(0);

    // El saldo libre del usuario sigue intacto en $500.000 sin desvíos
    const freeBalanceAfter = totalBalanceAfter - custodyAfterNoArgs;
    expect(freeBalanceAfter).toBe(500000);
  });

  it('Caso 8: Reversión contable integral al eliminar una transacción de card_payment (restaura el saldo bancario)', () => {
    // 1. Configurar banco con $400.000
    const bank = useCardsStore.getState().addBank('BBVA');
    useCardsStore.getState().setBankBalance(bank.id, 400000);

    useCardsStore.getState().addCard({
      name: 'Visa Signature',
      bankName: 'BBVA',
      creditLimit: 600000,
      closingDay: 25,
      paymentDay: 5,
    });
    const card = useCardsStore.getState().cards[0];

    // 2. Registrar pago de tarjeta de $120.000 debitado del banco
    useTransactionsStore.getState().addTransaction({
      title: 'Pago parcial Visa Signature',
      amount: 120000,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      bankId: bank.id,
      cardId: card.id,
      cardName: card.name,
      paymentTarget: 'partial',
    });

    expect(useTransactionsStore.getState().transactions).toHaveLength(1);
    const txId = useTransactionsStore.getState().transactions[0].id;

    // Saldo tras el pago: 400.000 - 120.000 = 280.000
    expect(useTransactionsStore.getState().getBankComputedBalance(bank.id, 400000)).toBe(280000);

    // 3. Eliminar la transacción de card_payment
    useTransactionsStore.getState().deleteTransaction(txId);

    // 4. Verificar reversión contable integral:
    // - La lista de transacciones queda vacía
    expect(useTransactionsStore.getState().transactions).toHaveLength(0);

    // - El saldo bancario se restaura automáticamente a su valor original ($400.000)
    expect(useTransactionsStore.getState().getBankComputedBalance(bank.id, 400000)).toBe(400000);
  });

  it('Caso 9: Eliminación permitida de compras antiguas de tarjeta (isPreexisting) sin pagos nuevos en la app y recomposición de cupo disponible', () => {
    // 1. Crear una tarjeta con límite de 500.000
    useCardsStore.getState().addCard({
      name: 'Visa Platinum',
      bankName: 'Santander',
      creditLimit: 500000,
      closingDay: 20,
      paymentDay: 5,
    });
    const card = useCardsStore.getState().cards[0];

    // 2. Registrar una compra histórica/preexistente a 12 cuotas, 3 cuotas previas ya pagadas ($30.000 c/u)
    // totalAmount: $360.000, remainingAmount: $270.000 (9 cuotas restantes)
    const legacyDebt = useDebtsStore.getState().addPersonalDebt({
      title: 'Nevera LG Inverter',
      entity: card.bankName,
      category: 'credit_card',
      debtType: 'credit_card',
      cardPaymentType: 'installments',
      creditCardId: card.id,
      cardId: card.id,
      totalAmount: 360000,
      remainingAmount: 270000,
      totalInstallments: 12,
      paidInstallments: 3,
      initialPaidInstallments: 3,
      monthlyPayment: 30000,
      dueDay: 5,
      dueDate: 'Día 5 de cada mes',
      isPreexisting: true,
      icon: 'card-outline',
    });

    expect(legacyDebt.initialPaidInstallments).toBe(3);
    expect(legacyDebt.paidInstallments).toBe(3);
    expect(legacyDebt.remainingAmount).toBe(270000);

    // 3. Simular cálculo contable de saldo y cupo de la tarjeta:
    // La deuda total de la tarjeta debe ser $270.000 y el cupo disponible 500.000 - 270.000 = 230.000
    const debtsBeforeDelete = useDebtsStore.getState().personalDebts.filter(
      (d) => (d.cardId === card.id || d.creditCardId === card.id) && !d.settled
    );
    const cardTotalDebtBefore = debtsBeforeDelete.reduce((acc, d) => acc + (d.remainingAmount ?? 0), 0);
    const availableCreditBefore = (card.creditLimit ?? 0) - cardTotalDebtBefore;

    expect(cardTotalDebtBefore).toBe(270000);
    expect(availableCreditBefore).toBe(230000);

    // 4. Como no tiene pagos nuevos en la app (paidInstallments === initialPaidInstallments), la eliminación DEBE ser permitida
    const deleteResult = useDebtsStore.getState().deletePersonalDebt(legacyDebt.id);
    expect(deleteResult).toBe(true);

    // 5. Verificar recomposición contable:
    // - La deuda ya no existe en personalDebts
    const debtsAfterDelete = useDebtsStore.getState().personalDebts.filter(
      (d) => (d.cardId === card.id || d.creditCardId === card.id) && !d.settled
    );
    expect(debtsAfterDelete).toHaveLength(0);

    // - El saldo de deuda diferida de la tarjeta disminuyó en 270.000 (ahora 0)
    const cardTotalDebtAfter = debtsAfterDelete.reduce((acc, d) => acc + (d.remainingAmount ?? 0), 0);
    expect(cardTotalDebtAfter).toBe(0);

    // - El cupo disponible se restituye íntegramente al límite original (500.000)
    const availableCreditAfter = (card.creditLimit ?? 0) - cardTotalDebtAfter;
    expect(availableCreditAfter).toBe(500000);
  });

  it('Caso 10: Bloqueo de eliminación en compras antiguas de tarjeta si ya registran pagos nuevos en la app', () => {
    // 1. Crear una tarjeta con límite de 500.000
    useCardsStore.getState().addCard({
      name: 'Mastercard Black',
      bankName: 'BBVA',
      creditLimit: 500000,
      closingDay: 20,
      paymentDay: 5,
    });
    const card = useCardsStore.getState().cards[0];

    // 2. Registrar compra histórica: 10 cuotas, 2 previas
    const legacyDebt = useDebtsStore.getState().addPersonalDebt({
      title: 'Smart TV Sony 65',
      entity: card.bankName,
      category: 'credit_card',
      debtType: 'credit_card',
      cardPaymentType: 'installments',
      creditCardId: card.id,
      cardId: card.id,
      totalAmount: 500000,
      remainingAmount: 400000,
      totalInstallments: 10,
      paidInstallments: 2,
      initialPaidInstallments: 2,
      monthlyPayment: 50000,
      dueDay: 5,
      dueDate: 'Día 5 de cada mes',
      isPreexisting: true,
      icon: 'card-outline',
    });

    // 3. Registrar un pago nuevo en la app para esta deuda (cuota 3)
    useDebtsStore.getState().payPersonalDebt(legacyDebt.id, 50000, {
      installmentsCount: 1,
    });

    const updatedDebt = useDebtsStore.getState().personalDebts.find((d) => d.id === legacyDebt.id)!;
    expect(updatedDebt.paidInstallments).toBe(3); // 3 > initialPaidInstallments (2)
    expect(updatedDebt.totalActualPaid).toBe(50000);
    expect(updatedDebt.remainingAmount).toBe(350000);

    // 4. Intentar eliminar la deuda: DEBE ser bloqueada para proteger la integridad contable
    const deleteResult = useDebtsStore.getState().deletePersonalDebt(legacyDebt.id);
    expect(deleteResult).toBe(false);

    // 5. La deuda debe persistir en el store
    const persistentDebt = useDebtsStore.getState().personalDebts.find((d) => d.id === legacyDebt.id);
    expect(persistentDebt).toBeDefined();
    expect(persistentDebt?.remainingAmount).toBe(350000);
  });

  it('Caso 11: Abono multi-tarjeta en cascada con método bola de nieve (Caso Junior: Next + Nubank)', () => {
    // 1. Crear tarjetas involucradas en useCardsStore
    useCardsStore.getState().addCard({
      name: 'Next',
      bankName: 'Banco Next',
      creditLimit: 5000,
      closingDay: 20,
      paymentDay: 5,
    });
    const nextCard = useCardsStore.getState().cards.find((c) => c.name === 'Next')!;

    useCardsStore.getState().addCard({
      name: 'Nubank',
      bankName: 'Nubank',
      creditLimit: 10000,
      closingDay: 25,
      paymentDay: 10,
    });
    const nubankCard = useCardsStore.getState().cards.find((c) => c.name === 'Nubank')!;

    // 2. Registrar compras de Junior en la tarjeta Next (7 compras sumando $1.384,51):
    // Montos: $50.00, $84.51, $100.00, $150.00, $200.00, $300.00, $500.00
    // Suma: 50 + 84.51 + 100 + 150 + 200 + 300 + 500 = 1384.51
    const nextAmounts = [50, 84.51, 100, 150, 200, 300, 500];
    nextAmounts.forEach((amt, index) => {
      useDebtsStore.getState().addThirdPartyCharge({
        personName: 'Junior',
        cardName: nextCard.name,
        cardId: nextCard.id,
        concept: `Compra Next #${index + 1}`,
        amount: amt,
        installmentsCount: 1,
      });
    });

    // 3. Registrar compra de Junior en Nubank (1 compra por $2.628,27):
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: nubankCard.name,
      cardId: nubankCard.id,
      concept: 'Compra grande Nubank',
      amount: 2628.27,
      installmentsCount: 1,
    });

    // 4. Verificación previa de saldos globales y agregados:
    // Total deuda Junior: 1384.51 + 2628.27 = 4012.78
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(4012.78);
    const summaryInicial = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const juniorSummaryInicial = summaryInicial.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorSummaryInicial).toBeDefined();
    expect(juniorSummaryInicial.chargesCount).toBe(8);
    expect(juniorSummaryInicial.totalRemainingDebt).toBe(4012.78);
    expect(juniorSummaryInicial.cardName).toContain('Next');
    expect(juniorSummaryInicial.cardName).toContain('Nubank');

    // 5. Junior realiza un abono global de $1.800 (sin restringir cardId, tal como opera el modal interactivo de debts.tsx)
    const resultAbono = useDebtsStore.getState().recordMonthlyPersonAbono('Junior', 1800, undefined, juniorSummaryInicial.personId);
    expect(resultAbono.updatedCharges.length).toBeGreaterThanOrEqual(8);

    // 6. Validar que las 7 compras menores de Next fueron totalmente liquidadas (método bola de nieve)
    const allCharges = useDebtsStore.getState().thirdPartyCharges;
    const nextCharges = allCharges.filter((c) => c.cardName === 'Next');
    expect(nextCharges).toHaveLength(7);
    nextCharges.forEach((c) => {
      expect(c.remainingAmount).toBe(0);
      expect(c.settled).toBe(true);
      expect(c.currentPeriodPaidAmount).toBe(c.totalAmount);
    });

    // 7. Validar que el remanente del abono (1800 - 1384.51 = 415.49) se aplicó en cascada a la compra de Nubank
    const nubankCharge = allCharges.find((c) => c.cardName === 'Nubank')!;
    expect(nubankCharge).toBeDefined();
    expect(nubankCharge.currentPeriodPaidAmount).toBe(415.49);
    // Deuda restante en Nubank: 2628.27 - 415.49 = 2212.78
    expect(nubankCharge.remainingAmount).toBe(2212.78);
    expect(nubankCharge.settled).toBe(false);

    // 8. Validar que la deuda total restante de Junior y del sistema queda exactamente en $2.212,78
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(2212.78);

    const summaryFinal = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const juniorSummaryFinal = summaryFinal.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorSummaryFinal).toBeDefined();
    expect(juniorSummaryFinal.totalRemainingDebt).toBe(2212.78);
  });

  it('Caso 12: Reversión atómica exacta de abono a tercero con cuotas preexistentes protegidas (7 de 8)', () => {
    // 1. Registrar compra de tarjeta compartida de $800 en 8 cuotas ($100/mes)
    // con 7 cuotas ya pagadas previamente (initialPaidInstallments: 7, saldo remanente: $100)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Carlos',
      cardName: 'Visa Signature',
      concept: 'Laptop cuotas antiguas',
      amount: 800,
      installmentsCount: 8,
      initialPaidInstallments: 7,
      paidInstallmentsCount: 7,
      isPreexisting: true,
      remainingAmount: 100,
    });

    const chargesInicial = useDebtsStore.getState().thirdPartyCharges;
    const laptopChargeInicial = chargesInicial.find((c) => c.concept === 'Laptop cuotas antiguas')!;
    expect(laptopChargeInicial).toBeDefined();
    expect(laptopChargeInicial.remainingAmount).toBe(100);
    expect(laptopChargeInicial.paidInstallmentsCount).toBe(7);
    expect(laptopChargeInicial.initialPaidInstallments).toBe(7);
    expect(laptopChargeInicial.settled).toBe(false);

    // 2. Carlos realiza el abono de la última cuota ($100), liquidando la compra
    const abonoResult = useDebtsStore.getState().recordMonthlyPersonAbono('Carlos', 100);
    expect(abonoResult.updatedCharges).toHaveLength(1);
    expect(abonoResult.allocations).toHaveLength(1);
    expect(abonoResult.allocations[0].previousRemaining).toBe(100);
    expect(abonoResult.allocations[0].previousPaidInstallments).toBe(7);
    expect(abonoResult.allocations[0].wasSettled).toBe(false);

    const chargeTrasAbono = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Laptop cuotas antiguas')!;
    expect(chargeTrasAbono.remainingAmount).toBe(0);
    expect(chargeTrasAbono.paidInstallmentsCount).toBe(8);
    expect(chargeTrasAbono.settled).toBe(true);

    // 3. Se genera la transacción contable vinculada con thirdPartyAllocations
    useTransactionsStore.getState().addTransaction({
      title: 'Abono tarjeta de Carlos',
      amount: 100,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Carlos',
      relatedPersonName: 'Carlos',
      cardName: 'Visa Signature',
      thirdPartyAllocations: abonoResult.allocations,
    });

    const tx = useTransactionsStore.getState().transactions[0];
    expect(tx).toBeDefined();
    expect(tx.thirdPartyAllocations).toEqual(abonoResult.allocations);

    // 4. Se elimina la transacción de abono (simulando error de usuario o corrección contable)
    useTransactionsStore.getState().deleteTransaction(tx.id);

    // 5. Verificación de reversión atómica exacta:
    // La compra se restaura EXACTAMENTE a 7 de 8 cuotas pagadas, con $100 de saldo y settled: false
    const chargeTrasReversion = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Laptop cuotas antiguas')!;
    expect(chargeTrasReversion.remainingAmount).toBe(100);
    expect(chargeTrasReversion.paidInstallmentsCount).toBe(7);
    expect(chargeTrasReversion.initialPaidInstallments).toBe(7);
    expect(chargeTrasReversion.settled).toBe(false);
    expect(chargeTrasReversion.currentPeriodPaidAmount).toBe(0);
  });

  it('Caso 13: Precisión contable en 2 abonos sucesivos a tercero y tarjeta de éxito ($0.00 saldo)', () => {
    // 1. Crear tarjetas involucradas en useCardsStore
    useCardsStore.getState().addCard({
      name: 'Next',
      bankName: 'Banco Next',
      creditLimit: 5000,
      closingDay: 20,
      paymentDay: 5,
    });
    const nextCard = useCardsStore.getState().cards.find((c) => c.name === 'Next')!;

    useCardsStore.getState().addCard({
      name: 'Nubank',
      bankName: 'Nubank',
      creditLimit: 10000,
      closingDay: 25,
      paymentDay: 10,
    });
    const nubankCard = useCardsStore.getState().cards.find((c) => c.name === 'Nubank')!;

    // 2. Registrar compras de Junior:
    // 7 compras en Next sumando $1.384,51 (corrientes a 1 cuota)
    const nextAmounts = [50, 84.51, 100, 150, 200, 300, 500];
    nextAmounts.forEach((amt, index) => {
      useDebtsStore.getState().addThirdPartyCharge({
        personName: 'Junior',
        cardName: nextCard.name,
        cardId: nextCard.id,
        concept: `Compra Next #${index + 1}`,
        amount: amt,
        installmentsCount: 1,
      });
    });

    // 1 compra en Nubank por $2.628,27 a 2 cuotas (cuota mensual: $1.314,14)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: nubankCard.name,
      cardId: nubankCard.id,
      concept: 'Compra diferida Nubank',
      amount: 2628.27,
      installmentsCount: 2,
    });

    // 3. Verificación de estado inicial
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(4012.78);
    const summaryInicial = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const juniorSummaryInicial = summaryInicial.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorSummaryInicial).toBeDefined();
    expect(juniorSummaryInicial.chargesCount).toBe(8);
    expect(juniorSummaryInicial.monthlyDueAmount).toBe(2698.65); // 1384.51 + 1314.14
    expect(juniorSummaryInicial.monthlyPaidAmount).toBe(0);
    expect(juniorSummaryInicial.monthlyPendingAmount).toBe(2698.65);
    expect(juniorSummaryInicial.totalRemainingDebt).toBe(4012.78);
    expect(juniorSummaryInicial.isMonthSettled).toBe(false);

    // 4. Abono 1: $1.800
    const resultAbono1 = useDebtsStore.getState().recordMonthlyPersonAbono(
      'Junior',
      1800,
      undefined,
      juniorSummaryInicial.personId
    );
    expect(resultAbono1.updatedCharges.length).toBeGreaterThanOrEqual(8);

    // Verificaciones tras Abono 1:
    // Next: las 7 compras quedaron saldadas (settled: true, remaining: 0, currentPeriodPaidAmount: amt)
    const chargesTrasAbono1 = useDebtsStore.getState().thirdPartyCharges;
    const nextCharges1 = chargesTrasAbono1.filter((c) => c.cardName === 'Next');
    expect(nextCharges1).toHaveLength(7);
    nextCharges1.forEach((c) => {
      expect(c.remainingAmount).toBe(0);
      expect(c.settled).toBe(true);
      expect(c.currentPeriodPaidAmount).toBe(c.totalAmount);
    });

    // Nubank: absorbe $415,49 (1800 - 1384.51)
    const nubankCharge1 = chargesTrasAbono1.find((c) => c.cardName === 'Nubank')!;
    expect(nubankCharge1.currentPeriodPaidAmount).toBe(415.49);
    expect(nubankCharge1.remainingAmount).toBe(2212.78);
    expect(nubankCharge1.settled).toBe(false);

    // Resumen mensual tras Abono 1:
    const summaryAbono1 = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const juniorSummaryAbono1 = summaryAbono1.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorSummaryAbono1).toBeDefined();
    expect(juniorSummaryAbono1.monthlyPaidAmount).toBe(1800.0);
    expect(juniorSummaryAbono1.monthlyDueAmount).toBe(2698.65);
    expect(juniorSummaryAbono1.monthlyPendingAmount).toBe(898.65);
    expect(juniorSummaryAbono1.totalRemainingDebt).toBe(2212.78);
    expect(juniorSummaryAbono1.isMonthSettled).toBe(false);
    expect(juniorSummaryAbono1.chargesCount).toBe(8); // Se mantienen las 8 compras visibles

    // 5. Abono 2: $2.212,78 (liquidando el 100% de la deuda restante)
    const resultAbono2 = useDebtsStore.getState().recordMonthlyPersonAbono(
      'Junior',
      2212.78,
      undefined,
      juniorSummaryInicial.personId
    );
    expect(resultAbono2.updatedCharges).toHaveLength(1);

    // Verificaciones tras Abono 2:
    const chargesTrasAbono2 = useDebtsStore.getState().thirdPartyCharges;
    const nubankCharge2 = chargesTrasAbono2.find((c) => c.cardName === 'Nubank')!;
    expect(nubankCharge2.remainingAmount).toBe(0);
    expect(nubankCharge2.settled).toBe(true);
    expect(nubankCharge2.currentPeriodPaidAmount).toBe(2628.27);

    // Total deuda del sistema en $0
    expect(useDebtsStore.getState().getTotalThirdPartyReceivable()).toBe(0);

    // Resumen mensual tras Abono 2:
    // La tarjeta de Junior NO desaparece, permanece visible con saldo $0
    const summaryAbono2 = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary();
    const juniorSummaryAbono2 = summaryAbono2.find((s) => s.personName.toLowerCase().includes('junior'))!;
    expect(juniorSummaryAbono2).toBeDefined();
    expect(juniorSummaryAbono2.totalRemainingDebt).toBe(0);
    expect(juniorSummaryAbono2.monthlyPaidAmount).toBe(4012.78);
    expect(juniorSummaryAbono2.monthlyPendingAmount).toBe(0);
    expect(juniorSummaryAbono2.isMonthSettled).toBe(true);
    expect(juniorSummaryAbono2.chargesCount).toBe(8);
  });
});


/// <reference types="jest" />
import {
  useTransactionsStore,
  getBankComputedBalance,
  getBankCustodyAmount,
} from '../store/transactions-store';
import { useDebtsStore } from '../store/debts-store';
import { useCardsStore } from '../store/cards-store';
import { toDeterministicUuid } from '../lib/sync-adapters';
import { computeCardBillingStatement } from '../utils/card-accounting';

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

  it('Caso 14: Eliminación permitida de deuda propia normal con cuotas iniciales pagadas (isPreexisting: false) y bloqueo al registrar nuevos pagos', () => {
    // 1. Crear una tarjeta de crédito en useCardsStore
    useCardsStore.getState().addCard({
      name: 'Visa Infinite',
      bankName: 'Santander',
      creditLimit: 1000000,
      closingDay: 15,
      paymentDay: 1,
    });
    const card = useCardsStore.getState().cards[0];

    // 2. Registrar deuda propia normal (isPreexisting: false) con cuotas pactadas y cuotas iniciales pagadas
    const debt = useDebtsStore.getState().addPersonalDebt({
      title: 'MacBook Pro M3',
      entity: card.bankName,
      category: 'credit_card',
      debtType: 'credit_card',
      cardPaymentType: 'installments',
      cardId: card.id,
      creditCardId: card.id,
      totalAmount: 1200000,
      remainingAmount: 1000000,
      totalInstallments: 12,
      paidInstallments: 2,
      initialPaidInstallments: 2,
      monthlyPayment: 100000,
      dueDay: 1,
      dueDate: 'Día 1 de cada mes',
      isPreexisting: false,
      icon: 'laptop-outline',
    });

    expect(debt.initialPaidInstallments).toBe(2);
    expect(debt.paidInstallments).toBe(2);
    expect(debt.totalActualPaid).toBeUndefined();
    expect(useDebtsStore.getState().personalDebts).toHaveLength(1);

    // 3. Como no tiene pagos nuevos en la app (paidInstallments === initialPaidInstallments y sin totalActualPaid),
    // la eliminación DEBE ser permitida aunque isPreexisting sea false
    const deleteResult = useDebtsStore.getState().deletePersonalDebt(debt.id);
    expect(deleteResult).toBe(true);
    expect(useDebtsStore.getState().personalDebts).toHaveLength(0);

    // 4. Probar el caso de bloqueo: registrar una deuda similar y registrar un pago real en la app
    const debtWithPayment = useDebtsStore.getState().addPersonalDebt({
      title: 'iPhone 16 Pro',
      entity: card.bankName,
      category: 'credit_card',
      debtType: 'credit_card',
      cardPaymentType: 'installments',
      cardId: card.id,
      creditCardId: card.id,
      totalAmount: 600000,
      remainingAmount: 400000,
      totalInstallments: 6,
      paidInstallments: 2,
      initialPaidInstallments: 2,
      monthlyPayment: 100000,
      dueDay: 1,
      dueDate: 'Día 1 de cada mes',
      isPreexisting: false,
      icon: 'phone-portrait-outline',
    });

    expect(useDebtsStore.getState().personalDebts).toHaveLength(1);

    // Registrar abono/pago de la siguiente cuota (cuota 3)
    useDebtsStore.getState().payPersonalDebt(debtWithPayment.id, 100000, {
      installmentsCount: 1,
    });

    const updatedDebt = useDebtsStore.getState().personalDebts.find((d) => d.id === debtWithPayment.id)!;
    expect(updatedDebt.paidInstallments).toBe(3); // 3 > initialPaidInstallments (2)
    expect(updatedDebt.totalActualPaid).toBe(100000);
    expect(updatedDebt.remainingAmount).toBe(300000);

    // 5. Intentar eliminar: DEBE ser bloqueada para proteger la integridad contable
    const deleteBlockedResult = useDebtsStore.getState().deletePersonalDebt(debtWithPayment.id);
    expect(deleteBlockedResult).toBe(false);

    // 6. La deuda debe persistir en el store
    const persistentDebt = useDebtsStore.getState().personalDebts.find((d) => d.id === debtWithPayment.id);
    expect(persistentDebt).toBeDefined();
    expect(persistentDebt?.remainingAmount).toBe(300000);
  });

  it('Caso 15: Reversión contable al eliminar abono de tercero entre días distintos (ayer -> hoy)', () => {
    // 1. Simular fecha "ayer"
    const yesterday = new Date('2026-10-23T12:00:00Z');
    jest.setSystemTime(yesterday);

    // 2. Registrar un cargo de tercero en una tarjeta compartida ($120 a 1 cuota)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Lucía Fernández',
      cardName: 'Visa Platinum',
      concept: 'Supermercado compartido',
      amount: 120,
      installmentsCount: 1,
    });

    const initialCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(initialCharge.remainingAmount).toBe(120);
    expect(initialCharge.settled).toBe(false);
    expect(initialCharge.lastPaymentDate).toBeUndefined();
    expect(initialCharge.settledAt).toBeUndefined();

    // 3. Registrar un abono a ese tercero mediante recordMonthlyPersonAbono
    const { allocations } = useDebtsStore.getState().recordMonthlyPersonAbono('Lucía Fernández', 120);
    expect(allocations).toHaveLength(1);

    const paidCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(paidCharge.remainingAmount).toBe(0);
    expect(paidCharge.settled).toBe(true);
    expect(paidCharge.lastPaymentDate).toBe(yesterday.toISOString());
    expect(paidCharge.settledAt).toBe(yesterday.toISOString());

    // Registrar la transacción de abono vinculada con thirdPartyAllocations
    useTransactionsStore.getState().addTransaction({
      title: 'Abono Lucía Fernández',
      amount: 120,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Lucía Fernández',
      relatedPersonName: 'Lucía Fernández',
      thirdPartyAllocations: allocations,
    });

    const txs = useTransactionsStore.getState().transactions;
    expect(txs).toHaveLength(1);
    const txId = txs[0].id;

    // Verificar que los ingresos globales computan el reembolso
    expect(useTransactionsStore.getState().getTotalIncome()).toBe(120);
    expect(useTransactionsStore.getState().getCurrentMonthIncome()).toBe(120);

    // 4. Avanzar fecha a "hoy"
    const today = new Date('2026-10-24T12:00:00Z');
    jest.setSystemTime(today);

    // 5. Eliminar la transacción del abono mediante deleteTransaction
    useTransactionsStore.getState().deleteTransaction(txId);
    expect(useTransactionsStore.getState().transactions).toHaveLength(0);

    // 6. Comprobaciones de integridad contable:
    const revertedCharge = useDebtsStore.getState().thirdPartyCharges[0];
    // 1. El cargo del tercero vuelve al 100% de su saldo original (remainingAmount === totalAmount)
    expect(revertedCharge.remainingAmount).toBe(120);
    expect(revertedCharge.remainingAmount).toBe(revertedCharge.totalAmount);
    // 2. settled vuelve a false
    expect(revertedCharge.settled).toBe(false);
    // 3. lastPaymentDate y settledAt quedan limpios (undefined)
    expect(revertedCharge.lastPaymentDate).toBeUndefined();
    expect(revertedCharge.settledAt).toBeUndefined();
    expect(revertedCharge.currentPeriodPaidAmount).toBe(0);

    // 4. Los selectores de facturación mensual del tercero reflejan la deuda completa sin abonos
    const billingSummaries = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(today);
    const luciaSummary = billingSummaries.find((s) => s.personName.toLowerCase().includes('lucía'))!;
    expect(luciaSummary).toBeDefined();
    expect(luciaSummary.monthlyDueAmount).toBe(120);
    expect(luciaSummary.monthlyPaidAmount).toBe(0);
    expect(luciaSummary.monthlyPendingAmount).toBe(120);
    expect(luciaSummary.isMonthSettled).toBe(false);
    expect(luciaSummary.totalRemainingDebt).toBe(120);

    // Verificar también que los balances de transactions-store se revirtieron a 0
    expect(useTransactionsStore.getState().getTotalIncome()).toBe(0);
    expect(useTransactionsStore.getState().getCurrentMonthIncome()).toBe(0);
  });

  it('Caso 16: Reversión contable al eliminar abono de tercero entre días distintos sin allocations (fallback por persona)', () => {
    // 1. Simular fecha "ayer"
    const yesterday = new Date('2026-10-23T12:00:00Z');
    jest.setSystemTime(yesterday);

    // Registrar cargo de tercero
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Diego Torres',
      cardName: 'Mastercard Black',
      concept: 'Regalo cumpleaños',
      amount: 200,
      installmentsCount: 1,
    });

    // Registrar abono
    useDebtsStore.getState().recordMonthlyPersonAbono('Diego Torres', 200);
    const paidCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(paidCharge.remainingAmount).toBe(0);
    expect(paidCharge.settled).toBe(true);
    expect(paidCharge.lastPaymentDate).toBe(yesterday.toISOString());

    // Transacción sin thirdPartyAllocations explícitas (fallback por nombre/persona)
    useTransactionsStore.getState().addTransaction({
      title: 'Reembolso Diego Torres',
      amount: 200,
      type: 'reimbursement',
      category: 'Reembolso',
      personName: 'Diego Torres',
    });

    const txId = useTransactionsStore.getState().transactions[0].id;

    // 2. Avanzar fecha a "hoy"
    const today = new Date('2026-10-24T12:00:00Z');
    jest.setSystemTime(today);

    // 3. Eliminar transacción
    useTransactionsStore.getState().deleteTransaction(txId);

    // 4. Verificar reversión defensiva
    const revertedCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(revertedCharge.remainingAmount).toBe(200);
    expect(revertedCharge.settled).toBe(false);
    expect(revertedCharge.lastPaymentDate).toBeUndefined();
    expect(revertedCharge.settledAt).toBeUndefined();
    expect(revertedCharge.currentPeriodPaidAmount).toBe(0);

    const summary = useDebtsStore.getState().getThirdPartyMonthlyBillingSummary(today);
    const diegoSummary = summary.find((s) => s.personName.toLowerCase().includes('diego'))!;
    expect(diegoSummary.monthlyDueAmount).toBe(200);
    expect(diegoSummary.monthlyPaidAmount).toBe(0);
    expect(diegoSummary.monthlyPendingAmount).toBe(200);
    expect(diegoSummary.isMonthSettled).toBe(false);
  });

  it('Fase 1: Gasto de tercero con múltiples cuotas y pagos previos: saldar última cuota y revertir abono reactiva settled: false', () => {
    // 1. Cargo con 3 cuotas de $100 ($300 total) y 2 cuotas ya saldadas históricamente
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Camila Reyes',
      cardName: 'Visa Platinum',
      concept: 'Laptop Cuotas',
      amount: 300,
      installmentsCount: 3,
      monthlyInstallmentAmount: 100,
      initialPaidInstallments: 2,
      remainingAmount: 100,
    });

    const initialCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(initialCharge.remainingAmount).toBe(100);
    expect(initialCharge.paidInstallmentsCount).toBe(2);
    expect(initialCharge.settled).toBe(false);

    // 2. Saldar la última cuota ($100)
    const { allocations } = useDebtsStore.getState().recordMonthlyPersonAbono('Camila Reyes', 100);
    const settledCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(settledCharge.remainingAmount).toBe(0);
    expect(settledCharge.paidInstallmentsCount).toBe(3);
    expect(settledCharge.settled).toBe(true);
    expect(settledCharge.settledAt).toBeDefined();

    // 3. Registrar transacción de reembolso con thirdPartyAllocations
    useTransactionsStore.getState().addTransaction({
      title: 'Abono Camila Reyes cuota 3',
      amount: 100,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Camila Reyes',
      thirdPartyAllocations: allocations,
    });

    const txId = useTransactionsStore.getState().transactions[0].id;

    // 4. Eliminar la transacción de reembolso
    useTransactionsStore.getState().deleteTransaction(txId);

    // 5. Verificar que el cargo vuelve a settled: false, settledAt: undefined, remainingAmount: 100, paidInstallmentsCount: 2
    const revertedCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(revertedCharge.remainingAmount).toBe(100);
    expect(revertedCharge.settled).toBe(false);
    expect(revertedCharge.settledAt).toBeUndefined();
    expect(revertedCharge.paidInstallmentsCount).toBe(2);
  });

  it('Fase 1: Reversión mediante deleteTransaction con fallback cuando allocations no coinciden', () => {
    // 1. Cargo de 3 cuotas con 2 cuotas ya pagadas
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Mariana López',
      cardName: 'Mastercard Black',
      concept: 'Celular',
      amount: 600,
      installmentsCount: 3,
      monthlyInstallmentAmount: 200,
      initialPaidInstallments: 2,
      remainingAmount: 200,
    });

    // 2. Saldar la última cuota de $200
    useDebtsStore.getState().recordMonthlyPersonAbono('Mariana López', 200);
    const settledCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(settledCharge.remainingAmount).toBe(0);
    expect(settledCharge.settled).toBe(true);

    // 3. Crear transacción con allocations no coincidentes (simulando desincronización de IDs)
    useTransactionsStore.getState().addTransaction({
      title: 'Abono Mariana Celular',
      amount: 200,
      type: 'reimbursement',
      category: 'Reembolso',
      personName: 'Mariana López',
      thirdPartyAllocations: [
        {
          chargeId: 'non-matching-uuid-1234',
          appliedAmount: 200,
          previousRemaining: 200,
          previousPaidInstallments: 2,
          previousCurrentPeriodPaid: 0,
          wasSettled: false,
        },
      ],
    });

    const txId = useTransactionsStore.getState().transactions[0].id;

    // 4. Eliminar transacción (debe entrar por fallback al fallar revertThirdPartyAllocations)
    useTransactionsStore.getState().deleteTransaction(txId);

    // 5. Verificar que el cargo de Mariana fue revertido correctamente vía fallback
    const revertedCharge = useDebtsStore.getState().thirdPartyCharges[0];
    expect(revertedCharge.remainingAmount).toBe(200);
    expect(revertedCharge.settled).toBe(false);
    expect(revertedCharge.settledAt).toBeUndefined();
    expect(revertedCharge.paidInstallmentsCount).toBe(2);
  });

  it('Fase 1: revertThirdPartyAllocations soporta matching por ID directo y por toDeterministicUuid', () => {
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Lucas Paz',
      cardName: 'Visa',
      concept: 'Pasajes',
      amount: 500,
      installmentsCount: 2,
      monthlyInstallmentAmount: 250,
    });

    const charge = useDebtsStore.getState().thirdPartyCharges.find((c) => c.personName === 'Lucas Paz')!;
    useDebtsStore.getState().recordThirdPartyInstallmentAbono(charge.id, 250);
    useDebtsStore.getState().recordThirdPartyInstallmentAbono(charge.id, 250);

    const chargeSaldado = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === charge.id)!;
    expect(chargeSaldado.remainingAmount).toBe(0);
    expect(chargeSaldado.settled).toBe(true);

    // Reversión usando toDeterministicUuid
    const detUuid = toDeterministicUuid(charge.id);
    const didRevert = useDebtsStore.getState().revertThirdPartyAllocations([
      {
        chargeId: detUuid,
        appliedAmount: 250,
        previousRemaining: 250,
        previousPaidInstallments: 1,
        previousCurrentPeriodPaid: 250,
        wasSettled: false,
      },
    ]);

    expect(didRevert).toBe(true);
    const chargeRevertido = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === charge.id)!;
    expect(chargeRevertido.remainingAmount).toBe(250);
    expect(chargeRevertido.settled).toBe(false);
    expect(chargeRevertido.settledAt).toBeUndefined();
    expect(chargeRevertido.paidInstallmentsCount).toBe(1);

    // Retorna false si no encuentra ningún cargo
    const didRevertNone = useDebtsStore.getState().revertThirdPartyAllocations([
      {
        chargeId: 'completely-unknown-id',
        appliedAmount: 100,
        previousRemaining: 100,
        previousPaidInstallments: 0,
        previousCurrentPeriodPaid: 0,
        wasSettled: false,
      },
    ]);
    expect(didRevertNone).toBe(false);
  });
  it('Caso 17: Blindaje de Pagos por Ciclo y Facturación Íntegra de Cuotas de Terceros', () => {
    // 1. Configuración de tiempo fijo y tarjeta con día de corte 20 y fecha de pago 5
    jest.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    const testCard = {
      id: 'card-test-shield-1',
      name: 'Visa Platinum',
      bankName: 'Banco Santander',
      closingDay: 20,
      paymentDay: 5,
      cutOffDay: 20,
      creditLimit: 5000,
      isDefault: true,
      createdAt: '2026-10-01T00:00:00Z',
    };
    useCardsStore.setState({ cards: [testCard], banks: [] });

    // 2. Compra diferida de tercero con abono parcial:
    // Carlos compra laptop por $600 diferida a 6 cuotas ($100/mes)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Carlos Gómez',
      cardName: 'Visa Platinum',
      cardId: 'card-test-shield-1',
      concept: 'Laptop cuotas',
      amount: 600,
      installmentsCount: 6,
      date: '2026-10-10T12:00:00Z',
    });

    // Compra corriente de tercero (1 cuota):
    // Andrés compra cena por $50 (1 cuota, compromiso del mes: $50)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Andrés López',
      cardName: 'Visa Platinum',
      cardId: 'card-test-shield-1',
      concept: 'Cena equipo',
      amount: 50,
      installmentsCount: 1,
      date: '2026-10-10T12:00:00Z',
    });

    const laptopCharge = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Laptop cuotas')!;
    const cenaCharge = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Cena equipo')!;

    // Compra propia directa en el ciclo de octubre ($150)
    useTransactionsStore.getState().addTransaction({
      title: 'Supermercado propio',
      amount: 150,
      type: 'expense',
      category: 'Alimentación',
      paymentMethod: 'credit_card',
      cardId: 'card-test-shield-1',
      date: '2026-10-12T12:00:00Z',
    });

    // Verificación previa a abonos:
    // Cuotas pactadas: Laptop = $100, Cena = $50, Compras directas = $150
    // Total rawMonthDue = $300
    let statementOct = computeCardBillingStatement({
      card: testCard,
      transactions: useTransactionsStore.getState().transactions,
      personalDebts: useDebtsStore.getState().personalDebts,
      thirdPartyCharges: useDebtsStore.getState().thirdPartyCharges,
      referenceDate: new Date('2026-10-15T12:00:00Z'),
    });
    expect(statementOct.thirdPartyMonthDue).toBe(150); // 100 + 50
    expect(statementOct.cycleTransactionsTotal).toBe(150);
    expect(statementOct.rawMonthDue).toBe(300);
    expect(statementOct.cardCurrentMonthDebt).toBe(300);
    expect(statementOct.cardPayments).toBe(0);

    // 3. Andrés hace un abono PARCIAL de $30 para la cena de $50 (le restan $20)
    useDebtsStore.getState().recordMonthlyPersonAbono('Andrés López', 30);
    const cenaActualizada = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === cenaCharge.id)!;
    expect(cenaActualizada.remainingAmount).toBe(20);
    expect(cenaActualizada.settled).toBe(false);

    // Carlos hace un abono PARCIAL de $40 para su cuota de $100 (le restan $60 de la cuota del mes)
    useDebtsStore.getState().recordMonthlyPersonAbono('Carlos Gómez', 40);
    const laptopActualizada = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === laptopCharge.id)!;
    expect(laptopActualizada.remainingAmount).toBe(560);
    expect(laptopActualizada.settled).toBe(false);

    // FACTURACIÓN ÍNTEGRA ANTE EL BANCO:
    // Aunque Andrés abonó $30 y Carlos abonó $40, el banco emisor cobra la cuota pactada del mes al 100%:
    // Laptop = $100, Cena = $50 -> thirdPartyMonthDue DEBE seguir siendo $150 (sin ser recortada por remainingAmount)
    statementOct = computeCardBillingStatement({
      card: testCard,
      transactions: useTransactionsStore.getState().transactions,
      personalDebts: useDebtsStore.getState().personalDebts,
      thirdPartyCharges: useDebtsStore.getState().thirdPartyCharges,
      referenceDate: new Date('2026-10-15T12:00:00Z'),
    });
    expect(statementOct.thirdPartyMonthDue).toBe(150);
    expect(statementOct.rawMonthDue).toBe(300); // 150 (terceros) + 150 (propio)
    expect(statementOct.cardCurrentMonthDebt).toBe(300);

    // 4. Pago de tarjeta en el ciclo de octubre:
    // El usuario paga la totalidad del resumen de octubre ($300) el día 16 de octubre (antes del corte del día 20)
    useTransactionsStore.getState().addTransaction({
      title: 'Pago Tarjeta Octubre',
      amount: 300,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      cardId: 'card-test-shield-1',
      date: '2026-10-16T12:00:00Z',
    });

    // En octubre, el pago es reconocido y salda la factura del ciclo
    statementOct = computeCardBillingStatement({
      card: testCard,
      transactions: useTransactionsStore.getState().transactions,
      personalDebts: useDebtsStore.getState().personalDebts,
      thirdPartyCharges: useDebtsStore.getState().thirdPartyCharges,
      referenceDate: new Date('2026-10-16T12:00:00Z'),
    });
    expect(statementOct.cardPayments).toBe(300);
    expect(statementOct.cardCurrentMonthDebt).toBe(0);
    expect(statementOct.isStatementPaid).toBe(true);

    // 5. BLINDAJE DE PAGOS EN NUEVO CICLO POSTERIOR AL CORTE:
    // Viajamos en el tiempo a Noviembre (después del corte del 20 de Octubre): 10 de Noviembre de 2026
    jest.setSystemTime(new Date('2026-11-10T12:00:00Z'));

    // En el nuevo ciclo, el usuario realiza una nueva compra de $80 con la tarjeta
    useTransactionsStore.getState().addTransaction({
      title: 'Compra nueva Noviembre',
      amount: 80,
      type: 'expense',
      category: 'Tecnología',
      paymentMethod: 'credit_card',
      cardId: 'card-test-shield-1',
      date: '2026-11-10T12:00:00Z',
    });

    const statementNov = computeCardBillingStatement({
      card: testCard,
      transactions: useTransactionsStore.getState().transactions,
      personalDebts: useDebtsStore.getState().personalDebts,
      thirdPartyCharges: useDebtsStore.getState().thirdPartyCharges,
      referenceDate: new Date('2026-11-10T12:00:00Z'),
    });

    // En Noviembre:
    // - El pago de $300 de Octubre NO debe computarse en cardPayments de Noviembre (cardPayments = 0)
    expect(statementNov.cardPayments).toBe(0);
    // - Las compras directas del ciclo de noviembre son $80
    expect(statementNov.cycleTransactionsTotal).toBe(80);
    // - La cuota mensual diferida de la laptop exige $100 ante el banco
    expect(statementNov.thirdPartyMonthDue).toBe(150); // 100 (cuota 2 laptop) + 50 (cena aún no 100% saldada)
    expect(statementNov.rawMonthDue).toBe(230); // 150 (terceros) + 80 (compras directas)
    // - La deuda exigible del mes NO es absorbida por el pago del mes anterior:
    expect(statementNov.cardCurrentMonthDebt).toBe(230);
    expect(statementNov.isStatementPaid).toBe(false);

    // 6. El usuario paga la factura de Noviembre ($230) el día 12 de Noviembre
    useTransactionsStore.getState().addTransaction({
      title: 'Pago Tarjeta Noviembre',
      amount: 230,
      type: 'card_payment',
      category: 'Pago Tarjeta',
      cardId: 'card-test-shield-1',
      date: '2026-11-12T12:00:00Z',
    });

    const statementNovPagado = computeCardBillingStatement({
      card: testCard,
      transactions: useTransactionsStore.getState().transactions,
      personalDebts: useDebtsStore.getState().personalDebts,
      thirdPartyCharges: useDebtsStore.getState().thirdPartyCharges,
      referenceDate: new Date('2026-11-12T12:00:00Z'),
    });
    expect(statementNovPagado.cardPayments).toBe(230);
    expect(statementNovPagado.cardCurrentMonthDebt).toBe(0);
    expect(statementNovPagado.isStatementPaid).toBe(true);

    // 7. Salto al ciclo posterior al corte de Noviembre (Diciembre de 2026)
    jest.setSystemTime(new Date('2026-12-05T12:00:00Z'));
    const statementDic = computeCardBillingStatement({
      card: testCard,
      transactions: useTransactionsStore.getState().transactions,
      personalDebts: useDebtsStore.getState().personalDebts,
      thirdPartyCharges: useDebtsStore.getState().thirdPartyCharges,
      referenceDate: new Date('2026-12-05T12:00:00Z'),
    });
    // Ninguno de los pagos de Octubre ($300) ni de Noviembre ($230) afecta a Diciembre:
    expect(statementDic.cardPayments).toBe(0);
    expect(statementDic.thirdPartyMonthDue).toBe(150);
    expect(statementDic.cardCurrentMonthDebt).toBe(150);
    expect(statementDic.isStatementPaid).toBe(false);
  });

  it('Caso 18: Reversión conmutativa fuera de orden LIFO para cargo preexistente de tercero (initialPaidInstallments: 2, 3 cuotas de $219.74)', () => {
    // 1. Registrar compras para Junior el 10 de Noviembre:
    // - Cargo corriente de $50 (1 cuota) para probar cascada
    // - Cargo preexistente de 3 cuotas de $219.74 ($659.22 total) con 2 cuotas ya pagadas (saldo inicial $219.74)
    jest.setSystemTime(new Date('2026-11-10T10:00:00Z'));
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Nubank',
      concept: 'Snack compartido',
      amount: 50,
      installmentsCount: 1,
    });

    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Nubank',
      concept: 'Monitor cuotas preexistente',
      amount: 659.22,
      installmentsCount: 3,
      monthlyInstallmentAmount: 219.74,
      initialPaidInstallments: 2,
      paidInstallmentsCount: 2,
      isPreexisting: true,
      remainingAmount: 219.74,
    });

    const snackInitial = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Snack compartido')!;
    const monitorInitial = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Monitor cuotas preexistente')!;
    expect(monitorInitial.remainingAmount).toBe(219.74);
    expect(monitorInitial.initialPaidInstallments).toBe(2);
    expect(monitorInitial.paidInstallmentsCount).toBe(2);

    // 2. Abono 1 (10/nov): $216.84 ($50 liquida Snack + $166.84 amortiza Monitor, quedando $52.90)
    const nov10Iso = '2026-11-10T15:00:00.000Z';
    jest.setSystemTime(new Date(nov10Iso));
    const abono1 = useDebtsStore.getState().recordMonthlyPersonAbono('Junior', 216.84);
    expect(abono1.allocations).toHaveLength(2);

    useTransactionsStore.getState().addTransaction({
      title: 'Abono Junior 10/nov',
      amount: 216.84,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Junior',
      relatedPersonName: 'Junior',
      date: nov10Iso,
      thirdPartyAllocations: abono1.allocations,
    });

    const monitorAfter1 = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === monitorInitial.id)!;
    expect(monitorAfter1.remainingAmount).toBe(52.9);
    expect(monitorAfter1.currentPeriodPaidAmount).toBe(166.84);
    expect(monitorAfter1.lastPaymentDate).toBe(nov10Iso);

    // 3. Abono 2 (11/nov): $52.90 (liquida Monitor; su snapshot guarda previousCurrentPeriodPaid: 166.84)
    const nov11Iso = '2026-11-11T11:00:00.000Z';
    jest.setSystemTime(new Date(nov11Iso));
    const abono2 = useDebtsStore.getState().recordMonthlyPersonAbono('Junior', 52.9);
    expect(abono2.allocations).toHaveLength(1);
    expect(abono2.allocations[0].previousCurrentPeriodPaid).toBe(166.84);
    expect(abono2.allocations[0].previousRemaining).toBe(52.9);

    useTransactionsStore.getState().addTransaction({
      title: 'Abono Junior 11/nov',
      amount: 52.9,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Junior',
      relatedPersonName: 'Junior',
      date: nov11Iso,
      thirdPartyAllocations: abono2.allocations,
    });

    const monitorAfter2 = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === monitorInitial.id)!;
    expect(monitorAfter2.remainingAmount).toBe(0);
    expect(monitorAfter2.currentPeriodPaidAmount).toBe(219.74);
    expect(monitorAfter2.settled).toBe(true);
    expect(monitorAfter2.paidInstallmentsCount).toBe(3);

    const txs = useTransactionsStore.getState().transactions;
    const txNov10 = txs.find((t) => t.title === 'Abono Junior 10/nov')!;
    const txNov11 = txs.find((t) => t.title === 'Abono Junior 11/nov')!;

    // 4. Eliminar PRIMERO el abono del 10/nov (fuera de orden LIFO)
    jest.setSystemTime(new Date('2026-11-11T18:00:00.000Z'));
    useTransactionsStore.getState().deleteTransaction(txNov10.id);

    const snackMid = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === snackInitial.id)!;
    expect(snackMid.remainingAmount).toBe(50);
    expect(snackMid.currentPeriodPaidAmount).toBe(0);
    expect(snackMid.settled).toBe(false);
    expect(snackMid.lastPaymentDate).toBeUndefined();

    const monitorMid = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === monitorInitial.id)!;
    expect(monitorMid.remainingAmount).toBe(166.84);
    expect(monitorMid.currentPeriodPaidAmount).toBe(52.9);
    expect(monitorMid.settled).toBe(false);
    expect(monitorMid.settledAt).toBeUndefined();
    expect(monitorMid.paidInstallmentsCount).toBe(2);
    expect(monitorMid.lastPaymentDate).toBe(nov11Iso);

    // 5. Eliminar SEGUNDO el abono del 11/nov (sin resucitar previousCurrentPeriodPaid: 166.84)
    useTransactionsStore.getState().deleteTransaction(txNov11.id);
    expect(useTransactionsStore.getState().transactions).toHaveLength(0);

    const monitorFinal = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === monitorInitial.id)!;
    expect(monitorFinal.currentPeriodPaidAmount).toBe(0);
    expect(monitorFinal.remainingAmount).toBe(219.74);
    expect(monitorFinal.lastPaymentDate).toBeUndefined();
    expect(monitorFinal.settled).toBe(false);
    expect(monitorFinal.settledAt).toBeUndefined();
    expect(monitorFinal.paidInstallmentsCount).toBe(2);

    const summaryFinal = useDebtsStore
      .getState()
      .getThirdPartyMonthlyBillingSummary(new Date('2026-11-11T18:00:00.000Z'));
    const juniorSummary = summaryFinal.find((s) => s.personName === 'Junior')!;
    expect(juniorSummary.monthlyPaidAmount).toBe(0);
    expect(juniorSummary.monthlyPendingAmount).toBe(269.74);
    expect(juniorSummary.totalRemainingDebt).toBe(269.74);
  });

  it('Caso 19: Eliminación de abono intermedio manteniendo otro activo preserva montos exactos y lastPaymentDate más reciente', () => {
    jest.setSystemTime(new Date('2026-11-05T12:00:00.000Z'));
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Visa Gold',
      concept: 'Televisor 3 cuotas',
      amount: 300,
      installmentsCount: 3,
      monthlyInstallmentAmount: 100,
    });
    const chargeId = useDebtsStore.getState().thirdPartyCharges[0].id;

    // Abono 1 (05/nov): $40
    const nov05Iso = '2026-11-05T12:00:00.000Z';
    const r1 = useDebtsStore.getState().recordMonthlyPersonAbono('Junior', 40);
    useTransactionsStore.getState().addTransaction({
      title: 'Abono 05/nov',
      amount: 40,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Junior',
      relatedPersonName: 'Junior',
      date: nov05Iso,
      thirdPartyAllocations: r1.allocations,
    });

    // Abono 2 (08/nov): $60
    const nov08Iso = '2026-11-08T12:00:00.000Z';
    jest.setSystemTime(new Date(nov08Iso));
    const r2 = useDebtsStore.getState().recordMonthlyPersonAbono('Junior', 60);
    useTransactionsStore.getState().addTransaction({
      title: 'Abono 08/nov',
      amount: 60,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Junior',
      relatedPersonName: 'Junior',
      date: nov08Iso,
      thirdPartyAllocations: r2.allocations,
    });

    // Abono 3 (11/nov): $50
    const nov11Iso = '2026-11-11T12:00:00.000Z';
    jest.setSystemTime(new Date(nov11Iso));
    const r3 = useDebtsStore.getState().recordMonthlyPersonAbono('Junior', 50);
    useTransactionsStore.getState().addTransaction({
      title: 'Abono 11/nov',
      amount: 50,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Junior',
      relatedPersonName: 'Junior',
      date: nov11Iso,
      thirdPartyAllocations: r3.allocations,
    });

    const chargeBefore = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeId)!;
    expect(chargeBefore.remainingAmount).toBe(150);
    expect(chargeBefore.currentPeriodPaidAmount).toBe(150);
    expect(chargeBefore.paidInstallmentsCount).toBe(1);

    // Eliminar abono intermedio (08/nov, $60) manteniendo activos el del 05/nov ($40) y 11/nov ($50)
    const tx08 = useTransactionsStore.getState().transactions.find((t) => t.title === 'Abono 08/nov')!;
    const tx11 = useTransactionsStore.getState().transactions.find((t) => t.title === 'Abono 11/nov')!;
    useTransactionsStore.getState().deleteTransaction(tx08.id);

    const chargeAfterMidDelete = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeId)!;
    expect(chargeAfterMidDelete.remainingAmount).toBe(210);
    expect(chargeAfterMidDelete.currentPeriodPaidAmount).toBe(90);
    expect(chargeAfterMidDelete.paidInstallmentsCount).toBe(0);
    expect(chargeAfterMidDelete.settled).toBe(false);
    expect(chargeAfterMidDelete.lastPaymentDate).toBe(nov11Iso);

    // Eliminar también el del 11/nov ($50): debe retroceder exactamente al del 05/nov ($40)
    useTransactionsStore.getState().deleteTransaction(tx11.id);

    const chargeWithOnlyFirst = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeId)!;
    expect(chargeWithOnlyFirst.remainingAmount).toBe(260);
    expect(chargeWithOnlyFirst.currentPeriodPaidAmount).toBe(40);
    expect(chargeWithOnlyFirst.lastPaymentDate).toBe(nov05Iso);
  });

  it('Caso 20: Fallback revertThirdPartyPersonAbono excluye cuotas preexistentes y prioriza cargos con currentPeriodPaidAmount > 0', () => {
    const oct15Iso = '2026-10-15T12:00:00.000Z';
    jest.setSystemTime(new Date(oct15Iso));

    // Cargo A: Preexistente con initialPaidInstallments = 2, 0 abonos dentro de la app
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Nubank',
      concept: 'Cargo Preexistente Intacto',
      amount: 659.22,
      installmentsCount: 3,
      monthlyInstallmentAmount: 219.74,
      initialPaidInstallments: 2,
      paidInstallmentsCount: 2,
      isPreexisting: true,
      remainingAmount: 219.74,
    });

    // Cargo B: Compra de $300 a 3 cuotas con abono de $100 en Octubre + $40 en Noviembre
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'Cargo Mixto Oct-Nov',
      amount: 300,
      installmentsCount: 3,
      monthlyInstallmentAmount: 100,
    });

    // Cargo C: Compra de $150 (1 cuota) con abono de $50 en Noviembre
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Next',
      concept: 'Cargo Noviembre',
      amount: 150,
      installmentsCount: 1,
    });

    const chargeA = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Cargo Preexistente Intacto')!;
    const chargeB = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Cargo Mixto Oct-Nov')!;
    const chargeC = useDebtsStore.getState().thirdPartyCharges.find((c) => c.concept === 'Cargo Noviembre')!;

    // Abono Octubre en Cargo B ($100) con transacción activa preservada
    useDebtsStore.getState().recordThirdPartyInstallmentAbono(chargeB.id, 100);
    useTransactionsStore.getState().addTransaction({
      title: 'Abono Oct Junior',
      amount: 100,
      type: 'reimbursement',
      category: 'Cobro Tarjeta Compartida',
      personName: 'Junior',
      relatedPersonName: 'Junior',
      relatedChargeId: chargeB.id,
      date: oct15Iso,
    });
    const txOct = useTransactionsStore.getState().transactions[0];

    // Abonos en Noviembre: $40 a Cargo B y $50 a Cargo C
    const nov10Iso = '2026-11-10T12:00:00.000Z';
    jest.setSystemTime(new Date(nov10Iso));
    useDebtsStore.setState((state) => ({
      thirdPartyCharges: state.thirdPartyCharges.map((c) => {
        if (c.id === chargeB.id) {
          return {
            ...c,
            remainingAmount: 160,
            currentPeriodPaidAmount: 40,
            lastPaymentDate: nov10Iso,
          };
        }
        if (c.id === chargeC.id) {
          return {
            ...c,
            remainingAmount: 100,
            currentPeriodPaidAmount: 50,
            lastPaymentDate: '2026-11-11T12:00:00.000Z',
          };
        }
        return c;
      }),
    }));

    // Revertir vía fallback $90 ($40 de Cargo B + $50 de Cargo C) manteniendo txOct activa
    const nov11Iso = '2026-11-11T12:00:00.000Z';
    jest.setSystemTime(new Date(nov11Iso));
    const reverted = useDebtsStore
      .getState()
      .revertThirdPartyPersonAbono('Junior', 90, [txOct], nov11Iso);
    expect(reverted).toBe(true);

    const chargeAAfter = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeA.id)!;
    expect(chargeAAfter.remainingAmount).toBe(219.74);
    expect(chargeAAfter.paidInstallmentsCount).toBe(2);
    expect(chargeAAfter.currentPeriodPaidAmount).toBe(0);
    expect(chargeAAfter.lastPaymentDate).toBeUndefined();

    const chargeBAfter = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeB.id)!;
    expect(chargeBAfter.remainingAmount).toBe(200);
    expect(chargeBAfter.currentPeriodPaidAmount).toBe(0);
    expect(chargeBAfter.paidInstallmentsCount).toBe(1);
    expect(chargeBAfter.lastPaymentDate).toBe(oct15Iso);

    const chargeCAfter = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeC.id)!;
    expect(chargeCAfter.remainingAmount).toBe(150);
    expect(chargeCAfter.currentPeriodPaidAmount).toBe(0);
    expect(chargeCAfter.lastPaymentDate).toBeUndefined();

    // Intentar revertir $500 extra cuando Cargo B solo tiene $100 pagados en app y Cargo A tiene 2 cuotas preexistentes:
    // Cargo A jamás debe absorber sus cuotas preexistentes
    useDebtsStore.getState().revertThirdPartyPersonAbono('Junior', 500, []);
    const chargeAFinal = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === chargeA.id)!;
    expect(chargeAFinal.remainingAmount).toBe(219.74);
    expect(chargeAFinal.paidInstallmentsCount).toBe(2);
  });

  it('Caso 21: Reconciliación reconcileThirdPartyCurrentPeriod limpia currentPeriodPaidAmount fantasma (166.84) con 0 txs y respeta txs activas', () => {
    const nov11Date = new Date('2026-11-11T12:00:00.000Z');
    jest.setSystemTime(nov11Date);

    // 1. Cargo de Junior con saldo huérfano del bug de producción (166.84 fantasma y 52.90 restante)
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Junior',
      cardName: 'Nubank',
      concept: 'Compra Junior Huérfana',
      amount: 659.22,
      installmentsCount: 3,
      monthlyInstallmentAmount: 219.74,
      initialPaidInstallments: 2,
      paidInstallmentsCount: 2,
      isPreexisting: true,
      remainingAmount: 219.74,
    });

    // 2. Cargo de Ana con abono activo legítimo en Noviembre
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Ana',
      cardName: 'Visa Gold',
      concept: 'Compra Ana Activa',
      amount: 200,
      installmentsCount: 2,
      monthlyInstallmentAmount: 100,
    });

    // 3. Cargo de Carlos con abono activo legítimo en Octubre
    useDebtsStore.getState().addThirdPartyCharge({
      personName: 'Carlos',
      cardName: 'Visa Gold',
      concept: 'Compra Carlos Octubre',
      amount: 200,
      installmentsCount: 2,
      monthlyInstallmentAmount: 100,
    });

    const juniorCharge = useDebtsStore.getState().thirdPartyCharges.find((c) => c.personName === 'Junior')!;
    const anaCharge = useDebtsStore.getState().thirdPartyCharges.find((c) => c.personName === 'Ana')!;
    const carlosCharge = useDebtsStore.getState().thirdPartyCharges.find((c) => c.personName === 'Carlos')!;

    useDebtsStore.setState((state) => ({
      thirdPartyCharges: state.thirdPartyCharges.map((c) => {
        if (c.id === juniorCharge.id) {
          return {
            ...c,
            remainingAmount: 52.9,
            currentPeriodPaidAmount: 166.84,
            lastPaymentDate: '2026-11-10T12:00:00.000Z',
            settled: false,
          };
        }
        if (c.id === anaCharge.id) {
          return {
            ...c,
            remainingAmount: 100,
            currentPeriodPaidAmount: 100,
            lastPaymentDate: '2026-11-09T12:00:00.000Z',
            settled: false,
          };
        }
        if (c.id === carlosCharge.id) {
          return {
            ...c,
            remainingAmount: 100,
            currentPeriodPaidAmount: 100,
            lastPaymentDate: '2026-10-15T12:00:00.000Z',
            settled: false,
          };
        }
        return c;
      }),
    }));

    // Ejecutar reconciliación con 0 txs para Junior, pero sí txs activas para Ana (Nov) y Carlos (Oct)
    useDebtsStore.getState().reconcileThirdPartyCurrentPeriod(
      [
        {
          id: 'tx-ana-nov',
          type: 'reimbursement',
          amount: 100,
          date: '2026-11-09T12:00:00.000Z',
          relatedPersonName: 'Ana',
        },
        {
          id: 'tx-carlos-oct',
          type: 'reimbursement',
          amount: 100,
          date: '2026-10-15T12:00:00.000Z',
          relatedPersonName: 'Carlos',
        },
      ],
      nov11Date
    );

    const juniorHealed = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === juniorCharge.id)!;
    expect(juniorHealed.currentPeriodPaidAmount).toBe(0);
    expect(juniorHealed.remainingAmount).toBe(219.74);
    expect(juniorHealed.lastPaymentDate).toBeUndefined();
    expect(juniorHealed.settled).toBe(false);
    expect(juniorHealed.paidInstallmentsCount).toBe(2);

    const anaUntouched = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === anaCharge.id)!;
    expect(anaUntouched.currentPeriodPaidAmount).toBe(100);
    expect(anaUntouched.remainingAmount).toBe(100);
    expect(anaUntouched.lastPaymentDate).toBe('2026-11-09T12:00:00.000Z');

    const carlosUntouched = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === carlosCharge.id)!;
    expect(carlosUntouched.currentPeriodPaidAmount).toBe(100);
    expect(carlosUntouched.remainingAmount).toBe(100);
    expect(carlosUntouched.lastPaymentDate).toBe('2026-10-15T12:00:00.000Z');

    // Ahora verificar que si Junior SÍ tiene transacción activa en el ciclo, NO se limpia su saldo
    useDebtsStore.setState((state) => ({
      thirdPartyCharges: state.thirdPartyCharges.map((c) =>
        c.id === juniorCharge.id
          ? {
              ...c,
              remainingAmount: 52.9,
              currentPeriodPaidAmount: 166.84,
              lastPaymentDate: '2026-11-10T12:00:00.000Z',
            }
          : c
      ),
    }));

    useDebtsStore.getState().reconcileThirdPartyCurrentPeriod(
      [
        {
          id: 'tx-junior-nov',
          type: 'reimbursement',
          amount: 166.84,
          date: '2026-11-10T12:00:00.000Z',
          relatedPersonName: 'Junior',
        },
      ],
      nov11Date
    );

    const juniorProtected = useDebtsStore.getState().thirdPartyCharges.find((c) => c.id === juniorCharge.id)!;
    expect(juniorProtected.currentPeriodPaidAmount).toBe(166.84);
    expect(juniorProtected.remainingAmount).toBe(52.9);
    expect(juniorProtected.lastPaymentDate).toBe('2026-11-10T12:00:00.000Z');
  });

});


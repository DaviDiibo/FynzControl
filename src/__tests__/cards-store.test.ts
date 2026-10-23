import { useCardsStore } from '../store/cards-store';
import { useTransactionsStore, getBankComputedBalance } from '../store/transactions-store';

describe('Gestión de Tarjetas de Crédito y Bancos (cards-store)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    useCardsStore.setState({ cards: [], banks: [] });
    useTransactionsStore.setState({ transactions: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Caso 1: Primera tarjeta creada es predeterminada automáticamente', () => {
    useCardsStore.getState().addCard({
      name: 'Visa Gold',
      bankName: 'Santander',
      closingDay: 20,
      paymentDay: 5,
    });

    const { cards } = useCardsStore.getState();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Visa Gold');
    expect(cards[0].isDefault).toBe(true);
    expect(cards[0].closingDay).toBe(20);
    expect(cards[0].paymentDay).toBe(5);
  });

  it('Caso 2: Segunda tarjeta no es default por defecto', () => {
    useCardsStore.getState().addCard({
      name: 'Visa Gold',
      bankName: 'Santander',
      closingDay: 20,
      paymentDay: 5,
    });

    jest.setSystemTime(new Date('2026-10-13T12:00:01Z'));

    useCardsStore.getState().addCard({
      name: 'Mastercard Black',
      bankName: 'BBVA',
      closingDay: 15,
      paymentDay: 30,
    });

    const { cards } = useCardsStore.getState();
    expect(cards).toHaveLength(2);

    const visaCard = cards.find((c) => c.name === 'Visa Gold');
    const masterCard = cards.find((c) => c.name === 'Mastercard Black');

    expect(visaCard).toBeDefined();
    expect(masterCard).toBeDefined();
    expect(visaCard?.isDefault).toBe(true);
    expect(masterCard?.isDefault).toBe(false);
  });

  it('Caso 3: Cambio manual de tarjeta predeterminada (setDefaultCard)', () => {
    useCardsStore.getState().addCard({
      name: 'Visa Gold',
      bankName: 'Santander',
      closingDay: 20,
      paymentDay: 5,
    });

    jest.setSystemTime(new Date('2026-10-13T12:00:01Z'));

    useCardsStore.getState().addCard({
      name: 'Mastercard Black',
      bankName: 'BBVA',
      closingDay: 15,
      paymentDay: 30,
    });

    const masterCard = useCardsStore.getState().cards.find((c) => c.name === 'Mastercard Black')!;
    const visaCard = useCardsStore.getState().cards.find((c) => c.name === 'Visa Gold')!;

    expect(masterCard.id).not.toBe(visaCard.id);

    // Cambiar default hacia Mastercard Black
    useCardsStore.getState().setDefaultCard(masterCard.id);

    const updatedMaster = useCardsStore.getState().cards.find((c) => c.id === masterCard.id);
    const updatedVisa = useCardsStore.getState().cards.find((c) => c.id === visaCard.id);

    expect(updatedMaster?.isDefault).toBe(true);
    expect(updatedVisa?.isDefault).toBe(false);
  });

  it('Caso 4: Eliminación de tarjeta predeterminada promueve automáticamente a la siguiente', () => {
    useCardsStore.getState().addCard({
      name: 'Visa Gold',
      bankName: 'Santander',
      closingDay: 20,
      paymentDay: 5,
    });

    jest.setSystemTime(new Date('2026-10-13T12:00:01Z'));

    useCardsStore.getState().addCard({
      name: 'Mastercard Black',
      bankName: 'BBVA',
      closingDay: 15,
      paymentDay: 30,
    });

    // Visa Gold es la predeterminada
    const visaCard = useCardsStore.getState().cards.find((c) => c.name === 'Visa Gold')!;
    expect(visaCard.isDefault).toBe(true);

    // Eliminamos la tarjeta predeterminada
    useCardsStore.getState().deleteCard(visaCard.id);

    const remainingCards = useCardsStore.getState().cards;
    expect(remainingCards).toHaveLength(1);
    expect(remainingCards[0].name).toBe('Mastercard Black');
    expect(remainingCards[0].isDefault).toBe(true);
  });

  it('Caso 5: Alta rápida de bancos sin duplicados (addBank)', () => {
    const bank1 = useCardsStore.getState().addBank('Banco Santander');
    expect(bank1.name).toBe('Banco Santander');
    expect(useCardsStore.getState().banks).toHaveLength(1);

    // Intentar agregar con diferente capitalización o espacios
    const bank2 = useCardsStore.getState().addBank('  banco santander  ');
    expect(bank2.id).toBe(bank1.id);
    expect(bank2.name).toBe('Banco Santander');
    expect(useCardsStore.getState().banks).toHaveLength(1);

    // Agregar un segundo banco diferente
    const bank3 = useCardsStore.getState().addBank('BBVA');
    expect(bank3.name).toBe('BBVA');
    expect(useCardsStore.getState().banks).toHaveLength(2);
  });

  it('Caso 6: Actualización y consulta de tarjeta (updateCard y getCardById)', () => {
    useCardsStore.getState().addCard({
      name: 'Visa Infinite',
      bankName: 'Nubank',
      creditLimit: 3000,
      closingDay: 10,
      paymentDay: 25,
    });

    const card = useCardsStore.getState().cards[0];
    useCardsStore.getState().updateCard(card.id, {
      creditLimit: 6000,
      color: '#00FFA3',
    });

    const updated = useCardsStore.getState().getCardById(card.id);
    expect(updated).toBeDefined();
    expect(updated?.creditLimit).toBe(6000);
    expect(updated?.color).toBe('#00FFA3');
  });

  it('Caso 7: Saldo base de cuenta bancaria y ajuste con setBankBalance', () => {
    const bank = useCardsStore.getState().addBank('Bancolombia', 1500000);
    expect(bank.initialBalance).toBe(1500000);

    // Ajustar saldo con setBankBalance
    useCardsStore.getState().setBankBalance(bank.id, 2000000);
    const updated = useCardsStore.getState().banks.find((b) => b.id === bank.id);
    expect(updated?.initialBalance).toBe(2000000);

    // Sanitización ante valores no numéricos
    useCardsStore.getState().setBankBalance(bank.id, NaN);
    const sanitized = useCardsStore.getState().banks.find((b) => b.id === bank.id);
    expect(sanitized?.initialBalance).toBe(0);
  });

  it('Caso 8: Cómputo de saldo disponible por banco considerando ingresos, egresos y reembolsos', () => {
    const bank = useCardsStore.getState().addBank('Galicia', 500000);

    // 1. Ingreso asignado al banco
    useTransactionsStore.getState().addTransaction({
      title: 'Nómina',
      amount: 1000000,
      type: 'income',
      category: 'Salario',
      bankId: bank.id,
    });

    // 2. Egreso asignado al banco
    useTransactionsStore.getState().addTransaction({
      title: 'Supermercado',
      amount: 200000,
      type: 'expense',
      category: 'Alimentación',
      bankId: bank.id,
    });

    // 3. Reembolso asignado al banco
    useTransactionsStore.getState().addTransaction({
      title: 'Devolución amigo',
      amount: 50000,
      type: 'reimbursement',
      category: 'Reembolso',
      bankId: bank.id,
    });

    // 4. Movimiento de otro banco (no debe afectar)
    useTransactionsStore.getState().addTransaction({
      title: 'Gasto otro banco',
      amount: 999999,
      type: 'expense',
      category: 'Otros',
      bankId: 'otro-banco-id',
    });

    // Cómputo: base (500.000) + income (1.000.000) - expense (200.000) + reimbursement (50.000) = 1.350.000
    const computed = useTransactionsStore.getState().getBankComputedBalance(bank.id, bank.initialBalance);
    expect(computed).toBe(1350000);

    // Prueba de la función pura exportada
    const { transactions } = useTransactionsStore.getState();
    const pureComputed = getBankComputedBalance(transactions, bank.id, 500000);
    expect(pureComputed).toBe(1350000);
  });

  it('Caso 9: Soporte de números decimales y centavos en saldos bancarios (addBank y setBankBalance)', () => {
    const bank = useCardsStore.getState().addBank('Banco Test', 1250.75);
    expect(bank.initialBalance).toBe(1250.75);

    useCardsStore.getState().setBankBalance(bank.id, 987.50);
    const updated = useCardsStore.getState().banks.find((b) => b.id === bank.id);
    expect(updated?.initialBalance).toBe(987.50);
  });
});


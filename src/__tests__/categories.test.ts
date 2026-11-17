/// <reference types="jest" />
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import {
  resolveCategoryIcon,
  resolveCategoryName,
  useTransactionsStore,
} from '../store/transactions-store';

describe('Categorías Financieras y Compatibilidad Retroactiva', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-17T12:00:00Z'));
    useTransactionsStore.getState().clearAllTransactions();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Definición de EXPENSE_CATEGORIES e INCOME_CATEGORIES', () => {
    it('EXPENSE_CATEGORIES contiene mercado como primera categoría y nuevas categorías de gastos', () => {
      expect(EXPENSE_CATEGORIES[0]).toEqual({
        id: 'mercado',
        name: 'Mercado',
        icon: 'cart-outline',
        color: '#FF9F0A',
      });

      const findExpense = (id: string) => EXPENSE_CATEGORIES.find((c) => c.id === id);

      expect(findExpense('restaurantes')).toEqual({
        id: 'restaurantes',
        name: 'Restaurantes',
        icon: 'restaurant-outline',
        color: '#FF9500',
      });

      expect(findExpense('bares')).toEqual({
        id: 'bares',
        name: 'Bares',
        icon: 'beer-outline',
        color: '#AF52DE',
      });

      expect(findExpense('deportes')).toEqual({
        id: 'deportes',
        name: 'Deportes',
        icon: 'fitness-outline',
        color: '#00FFA3',
      });

      expect(findExpense('viaticos')).toEqual({
        id: 'viaticos',
        name: 'Viáticos',
        icon: 'briefcase-outline',
        color: '#5856D6',
      });
    });

    it('INCOME_CATEGORIES contiene viaticos y reembolsos actualizados', () => {
      const findIncome = (id: string) => INCOME_CATEGORIES.find((c) => c.id === id);

      expect(findIncome('viaticos')).toEqual({
        id: 'viaticos',
        name: 'Viáticos',
        icon: 'receipt-outline',
        color: '#30D158',
      });

      expect(findIncome('reembolsos')).toEqual({
        id: 'reembolsos',
        name: 'Reembolsos',
        icon: 'people-outline',
        color: '#32ADE6',
      });
    });
  });

  describe('Helpers de resolución de categoría y compatibilidad retroactiva', () => {
    it('resuelve retroactivamente alimentacion y Alimentación a Mercado y cart-outline', () => {
      expect(resolveCategoryName('expense', 'alimentacion')).toBe('Mercado');
      expect(resolveCategoryName('expense', 'Alimentación')).toBe('Mercado');
      expect(resolveCategoryIcon('expense', 'alimentacion')).toBe('cart-outline');
      expect(resolveCategoryIcon('expense', 'Alimentación')).toBe('cart-outline');
    });

    it('resuelve correctamente nombres e iconos de nuevas categorías de gasto', () => {
      expect(resolveCategoryName('expense', 'mercado')).toBe('Mercado');
      expect(resolveCategoryIcon('expense', 'mercado')).toBe('cart-outline');

      expect(resolveCategoryName('expense', 'restaurantes')).toBe('Restaurantes');
      expect(resolveCategoryIcon('expense', 'restaurantes')).toBe('restaurant-outline');

      expect(resolveCategoryName('expense', 'bares')).toBe('Bares');
      expect(resolveCategoryIcon('expense', 'bares')).toBe('beer-outline');

      expect(resolveCategoryName('expense', 'deportes')).toBe('Deportes');
      expect(resolveCategoryIcon('expense', 'deportes')).toBe('fitness-outline');

      expect(resolveCategoryName('expense', 'viaticos')).toBe('Viáticos');
      expect(resolveCategoryIcon('expense', 'viaticos')).toBe('briefcase-outline');
    });

    it('resuelve correctamente nombres e iconos de nuevas categorías de ingreso', () => {
      expect(resolveCategoryName('income', 'viaticos')).toBe('Viáticos');
      expect(resolveCategoryIcon('income', 'viaticos')).toBe('receipt-outline');

      expect(resolveCategoryName('income', 'reembolsos')).toBe('Reembolsos');
      expect(resolveCategoryIcon('income', 'reembolsos')).toBe('people-outline');
    });

    it('al agregar una transacción con categoría alimentacion, se almacena como Mercado con cart-outline', () => {
      useTransactionsStore.getState().addTransaction({
        title: 'Compra de víveres antigua',
        amount: 85000,
        type: 'expense',
        category: 'alimentacion',
      });

      const tx = useTransactionsStore.getState().transactions[0];
      expect(tx).toBeDefined();
      expect(tx.category).toBe('Mercado');
      expect(tx.icon).toBe('cart-outline');
    });
  });
});

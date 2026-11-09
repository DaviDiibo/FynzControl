/// <reference types="jest" />
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

import {
  getCurrencySymbol,
  getCurrencyBadgeLabel,
  formatCurrency,
  sanitizeDecimalInput,
} from '../utils/currency';
import { parseTxDate } from '../../app/(app)/(tabs)/stats';

describe('Currency Utils y Corrección de Fechas en Estadísticas', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-31T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCurrencySymbol', () => {
    it('retorna el símbolo correcto para cada código soportado', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('BRL')).toBe('R$');
      expect(getCurrencySymbol('COP')).toBe('$');
      expect(getCurrencySymbol('ARS')).toBe('$');
      expect(getCurrencySymbol('MXN')).toBe('$');
    });

    it('maneja minúsculas y valores por defecto', () => {
      expect(getCurrencySymbol('eur')).toBe('€');
      expect(getCurrencySymbol('brl')).toBe('R$');
      expect(getCurrencySymbol('unknown')).toBe('$');
      expect(getCurrencySymbol(undefined)).toBe('$');
    });
  });

  describe('getCurrencyBadgeLabel', () => {
    it('retorna el código en mayúsculas para divisas soportadas', () => {
      expect(getCurrencyBadgeLabel('USD')).toBe('USD');
      expect(getCurrencyBadgeLabel('EUR')).toBe('EUR');
      expect(getCurrencyBadgeLabel('BRL')).toBe('BRL');
      expect(getCurrencyBadgeLabel('COP')).toBe('COP');
      expect(getCurrencyBadgeLabel('ARS')).toBe('ARS');
      expect(getCurrencyBadgeLabel('MXN')).toBe('MXN');
    });

    it('maneja minúsculas y retorna código en mayúsculas', () => {
      expect(getCurrencyBadgeLabel('usd')).toBe('USD');
      expect(getCurrencyBadgeLabel('eur')).toBe('EUR');
      expect(getCurrencyBadgeLabel('brl')).toBe('BRL');
    });

    it('retorna USD por defecto para divisas no soportadas o undefined', () => {
      expect(getCurrencyBadgeLabel('unknown')).toBe('USD');
      expect(getCurrencyBadgeLabel(undefined)).toBe('USD');
    });
  });

  describe('formatCurrency', () => {
    it('formatea números positivos con configuración por defecto (es-ES con símbolo y 2 decimales)', () => {
      const formatted = formatCurrency(1234.56, 'USD');
      // Formato es-ES estándar: 1.234,56 con símbolo "$ "
      expect(formatted).toBe('$ 1.234,56');
    });

    it('formatea números negativos con el signo menos delante', () => {
      const formatted = formatCurrency(-500.5, 'EUR');
      expect(formatted).toBe('-€ 500,50');
    });

    it('formatea ceros correctamente', () => {
      expect(formatCurrency(0, 'USD')).toBe('$ 0,00');
      expect(formatCurrency(0, 'BRL')).toBe('R$ 0,00');
    });

    it('respeta la opción showSymbol = false', () => {
      expect(formatCurrency(1500, 'USD', { showSymbol: false })).toBe('1.500,00');
      expect(formatCurrency(-75.25, 'EUR', { showSymbol: false })).toBe('-75,25');
    });

    it('respeta opciones de decimales personalizadas', () => {
      const formatted = formatCurrency(1234.5678, 'USD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(formatted).toBe('$ 1.235');

      const customDecimals = formatCurrency(10, 'COP', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
      expect(customDecimals).toBe('$ 10,000');
    });

    it('permite desactivar agrupación de miles', () => {
      const noGrouping = formatCurrency(1234.56, 'USD', { useGrouping: false });
      expect(noGrouping).toBe('$ 1234,56');
    });
  });

  describe('sanitizeDecimalInput', () => {
    it('reemplaza comas por puntos', () => {
      expect(sanitizeDecimalInput('12,34')).toBe('12.34');
    });

    it('elimina caracteres no numéricos excepto un único punto decimal', () => {
      expect(sanitizeDecimalInput('$1234,56abc')).toBe('1234.56');
      expect(sanitizeDecimalInput('abc123xyz')).toBe('123');
    });

    it('maneja múltiples puntos conservando solo el primero como separador', () => {
      expect(sanitizeDecimalInput('12.34.56')).toBe('12.3456');
    });

    it('maneja cadenas vacías o sin dígitos', () => {
      expect(sanitizeDecimalInput('')).toBe('');
      expect(sanitizeDecimalInput('abc')).toBe('');
    });
  });

  describe('parseTxDate (Bug de Mes Corregido en Estadísticas)', () => {
    it('produce el mes 0-indexed correcto para fechas con formato YYYY-MM-DD', () => {
      const parsedOct = parseTxDate('2026-10-15');
      expect(parsedOct).not.toBeNull();
      expect(parsedOct!.getFullYear()).toBe(2026);
      expect(parsedOct!.getMonth()).toBe(9); // Octubre es mes 9 (0-indexed)
      expect(parsedOct!.getDate()).toBe(15);
    });

    it('valida enero y diciembre correctamente evitando desbordamiento', () => {
      const parsedJan = parseTxDate('2026-01-01');
      expect(parsedJan).not.toBeNull();
      expect(parsedJan!.getFullYear()).toBe(2026);
      expect(parsedJan!.getMonth()).toBe(0); // Enero = 0
      expect(parsedJan!.getDate()).toBe(1);

      const parsedDec = parseTxDate('2026-12-31');
      expect(parsedDec).not.toBeNull();
      expect(parsedDec!.getFullYear()).toBe(2026);
      expect(parsedDec!.getMonth()).toBe(11); // Diciembre = 11
      expect(parsedDec!.getDate()).toBe(31);
    });

    it('retorna null para entradas vacías o inválidas', () => {
      expect(parseTxDate(undefined)).toBeNull();
      expect(parseTxDate('')).toBeNull();
      expect(parseTxDate('fecha-invalida')).toBeNull();
    });

    it('soporta fechas ISO completas usando fallback de Date', () => {
      const isoDate = parseTxDate('2026-05-20T10:00:00Z');
      expect(isoDate).not.toBeNull();
      expect(isoDate instanceof Date).toBe(true);
      expect(isNaN(isoDate!.getTime())).toBe(false);
    });
  });
});

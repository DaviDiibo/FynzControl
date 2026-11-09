export type CurrencyCode = 'USD' | 'EUR' | 'BRL' | 'COP' | 'ARS' | 'MXN' | string;

export type FormatCurrencyOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showSymbol?: boolean;
  useGrouping?: boolean;
};

export const getCurrencySymbol = (currencyCode?: string): string => {
  switch (currencyCode?.toUpperCase()) {
    case 'EUR':
      return '€';
    case 'BRL':
      return 'R$';
    case 'COP':
      return '$';
    case 'ARS':
      return '$';
    case 'MXN':
      return '$';
    case 'USD':
    default:
      return '$';
  }
};

export const getCurrencyBadgeLabel = (currencyCode?: string): string => {
  const code = currencyCode?.toUpperCase();
  switch (code) {
    case 'EUR':
    case 'BRL':
    case 'COP':
    case 'ARS':
    case 'MXN':
    case 'USD':
      return code;
    default:
      return 'USD';
  }
};

export const formatCurrency = (
  amount: number,
  currencyCode?: string,
  options?: FormatCurrencyOptions
): string => {
  const minDecimals = options?.minimumFractionDigits ?? 2;
  const maxDecimals = options?.maximumFractionDigits ?? 2;
  const showSymbol = options?.showSymbol ?? true;
  const useGrouping = options?.useGrouping ?? true;
  const symbol = showSymbol ? `${getCurrencySymbol(currencyCode)} ` : '';

  // Formato estándar español (miles con punto, decimales con coma)
  const formattedNumber = Math.abs(amount).toLocaleString('es-ES', {
    useGrouping,
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formattedNumber}`;
};

export const sanitizeDecimalInput = (text: string): string => {
  // Reemplaza comas por puntos y elimina caracteres no numéricos excepto un punto decimal
  const normalized = text.replace(/,/g, '.');
  const sanitized = normalized.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return sanitized;
};

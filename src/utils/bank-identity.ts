import { Ionicons } from '@expo/vector-icons';

export type BankIconName = keyof typeof Ionicons.glyphMap;

export type BankIdentity = {
  color: string;
  icon: BankIconName;
  shortLabel: string;
};

export const CYBERPUNK_PALETTE = [
  '#00FFA3',
  '#0A84FF',
  '#BF5AF2',
  '#FF9F0A',
  '#FF375F',
  '#30D158',
  '#64D2FF',
  '#FFD60A',
] as const;

export const normalizeBankName = (name?: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const getDeterministicColor = (text: string): string => {
  if (!text) return CYBERPUNK_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CYBERPUNK_PALETTE.length;
  return CYBERPUNK_PALETTE[index];
};

const getFallbackShortLabel = (rawName?: string): string => {
  if (!rawName) return 'BNK';
  const clean = rawName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  if (!clean) return 'BNK';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
};

export const getBankIdentity = (bankName?: string): BankIdentity => {
  const normalized = normalizeBankName(bankName);

  if (!normalized) {
    return {
      color: CYBERPUNK_PALETTE[0],
      icon: 'business-outline',
      shortLabel: 'BNK',
    };
  }

  // Santander
  if (normalized.includes('santander')) {
    return {
      color: '#EC0000',
      icon: 'business-outline',
      shortLabel: 'SAN',
    };
  }

  // BBVA
  if (normalized.includes('bbva')) {
    return {
      color: '#004481',
      icon: 'business-outline',
      shortLabel: 'BBVA',
    };
  }

  // Nubank / Nu
  if (
    normalized === 'nu' ||
    normalized.startsWith('nu ') ||
    normalized.endsWith(' nu') ||
    normalized.includes('nubank')
  ) {
    return {
      color: '#820AD1',
      icon: 'card-outline',
      shortLabel: 'NU',
    };
  }

  // Mercado Pago / MP
  if (
    normalized === 'mp' ||
    normalized.includes('mercado pago') ||
    normalized.includes('mercadopago')
  ) {
    return {
      color: '#009EE3',
      icon: 'wallet-outline',
      shortLabel: 'MP',
    };
  }

  // Brubank
  if (normalized.includes('brubank')) {
    return {
      color: '#6B38FB',
      icon: 'phone-portrait-outline',
      shortLabel: 'BRU',
    };
  }

  // Galicia
  if (normalized.includes('galicia')) {
    return {
      color: '#E84E10',
      icon: 'business-outline',
      shortLabel: 'GAL',
    };
  }

  // Itaú
  if (normalized.includes('itau')) {
    return {
      color: '#EC7000',
      icon: 'business-outline',
      shortLabel: 'ITAU',
    };
  }

  // Bancolombia
  if (normalized.includes('bancolombia')) {
    return {
      color: '#FDDA24',
      icon: 'business-outline',
      shortLabel: 'BCOL',
    };
  }

  // BCP
  if (
    normalized === 'bcp' ||
    normalized.includes('credito del peru') ||
    normalized.includes('banco de credito')
  ) {
    return {
      color: '#002A8F',
      icon: 'business-outline',
      shortLabel: 'BCP',
    };
  }

  // Interbank
  if (normalized.includes('interbank')) {
    return {
      color: '#009B3A',
      icon: 'business-outline',
      shortLabel: 'IBK',
    };
  }

  // Next
  if (
    normalized === 'next' ||
    normalized.startsWith('next ') ||
    normalized.endsWith(' next') ||
    normalized.includes('banco next')
  ) {
    return {
      color: '#00FF5F',
      icon: 'flash-outline',
      shortLabel: 'NEXT',
    };
  }

  // BTG / BTG Pactual
  if (normalized.includes('btg')) {
    return {
      color: '#0A84FF',
      icon: 'business-outline',
      shortLabel: 'BTG',
    };
  }

  // Inter / Banco Inter
  if (
    normalized === 'inter' ||
    normalized.startsWith('inter ') ||
    normalized.endsWith(' inter') ||
    normalized.includes('banco inter')
  ) {
    return {
      color: '#FF7A00',
      icon: 'card-outline',
      shortLabel: 'INTR',
    };
  }

  // C6 / C6 Bank
  if (
    normalized === 'c6' ||
    normalized.startsWith('c6 ') ||
    normalized.endsWith(' c6') ||
    normalized.includes('c6 bank') ||
    normalized.includes('banco c6')
  ) {
    return {
      color: '#FF5900',
      icon: 'card-outline',
      shortLabel: 'C6',
    };
  }

  // Bradesco
  if (normalized.includes('bradesco')) {
    return {
      color: '#CC092F',
      icon: 'business-outline',
      shortLabel: 'BRAD',
    };
  }

  // Caixa
  if (normalized.includes('caixa')) {
    return {
      color: '#005CA9',
      icon: 'business-outline',
      shortLabel: 'CXA',
    };
  }

  // Banco do Brasil / BB
  if (
    normalized === 'bb' ||
    normalized.startsWith('bb ') ||
    normalized.endsWith(' bb') ||
    normalized.includes('banco do brasil')
  ) {
    return {
      color: '#FDDA24',
      icon: 'business-outline',
      shortLabel: 'BB',
    };
  }

  // Wise
  if (normalized.includes('wise')) {
    return {
      color: '#9FE870',
      icon: 'card-outline',
      shortLabel: 'WISE',
    };
  }

  // PayPal
  if (normalized.includes('paypal')) {
    return {
      color: '#0079C1',
      icon: 'wallet-outline',
      shortLabel: 'PP',
    };
  }

  // Lemon Cash / Lemon
  if (normalized.includes('lemon')) {
    return {
      color: '#00FF5F',
      icon: 'card-outline',
      shortLabel: 'LEMN',
    };
  }

  // Ualá
  if (normalized.includes('uala')) {
    return {
      color: '#FF334B',
      icon: 'card-outline',
      shortLabel: 'UALA',
    };
  }

  // Revolut
  if (normalized.includes('revolut')) {
    return {
      color: '#00FFA3',
      icon: 'card-outline',
      shortLabel: 'REV',
    };
  }

  // N26
  if (normalized.includes('n26')) {
    return {
      color: '#00FFA3',
      icon: 'card-outline',
      shortLabel: 'N26',
    };
  }

  // Binance
  if (normalized.includes('binance')) {
    return {
      color: '#F3BA2F',
      icon: 'cube-outline',
      shortLabel: 'BNB',
    };
  }

  // Crypto / USDT
  if (
    normalized.includes('crypto') ||
    normalized.includes('usdt') ||
    normalized.includes('bitcoin') ||
    normalized.includes('btc') ||
    normalized.includes('ethereum') ||
    normalized.includes('eth')
  ) {
    return {
      color: '#F3BA2F',
      icon: 'cube-outline',
      shortLabel: normalized.includes('usdt') ? 'USDT' : 'CRYPTO',
    };
  }

  // Efectivo / Cash
  if (normalized.includes('efectivo') || normalized.includes('cash')) {
    return {
      color: '#00FFA3',
      icon: 'cash-outline',
      shortLabel: 'CASH',
    };
  }

  // Entidades desconocidas: color determinista y business-outline
  return {
    color: getDeterministicColor(normalized),
    icon: 'business-outline',
    shortLabel: getFallbackShortLabel(bankName),
  };
};

import { Ionicons } from '@expo/vector-icons';

export type CategoryItem = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  {
    id: 'alimentacion',
    name: 'Alimentación',
    icon: 'cart-outline',
    color: '#FF9F0A',
  },
  {
    id: 'transporte',
    name: 'Transporte',
    icon: 'car-outline',
    color: '#0A84FF',
  },
  {
    id: 'servicios',
    name: 'Servicios',
    icon: 'flash-outline',
    color: '#FFD60A',
  },
  {
    id: 'vivienda',
    name: 'Vivienda',
    icon: 'home-outline',
    color: '#BF5AF2',
  },
  {
    id: 'ocio',
    name: 'Ocio',
    icon: 'film-outline',
    color: '#FF375F',
  },
  {
    id: 'salud',
    name: 'Salud',
    icon: 'medkit-outline',
    color: '#30D158',
  },
  {
    id: 'educacion',
    name: 'Educación',
    icon: 'school-outline',
    color: '#64D2FF',
  },
  {
    id: 'ropa',
    name: 'Ropa',
    icon: 'shirt-outline',
    color: '#FF6482',
  },
  {
    id: 'pago-deudas',
    name: 'Pago Deudas',
    icon: 'card-outline',
    color: '#FF453A',
  },
  {
    id: 'mascotas',
    name: 'Mascotas',
    icon: 'paw-outline',
    color: '#AC8E68',
  },
  {
    id: 'suscripciones',
    name: 'Suscripciones',
    icon: 'phone-portrait-outline',
    color: '#5E5CE6',
  },
  {
    id: 'mantenimiento',
    name: 'Mantenimiento',
    icon: 'hammer-outline',
    color: '#E5E5EA',
  },
  {
    id: 'regalos',
    name: 'Regalos',
    icon: 'gift-outline',
    color: '#FF2D55',
  },
  {
    id: 'otros-gastos',
    name: 'Otros Gastos',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#8E8E93',
  },
];

export const INCOME_CATEGORIES: CategoryItem[] = [
  {
    id: 'salario-nomina',
    name: 'Salario / Nómina',
    icon: 'briefcase-outline',
    color: '#00FFA3',
  },
  {
    id: 'freelance',
    name: 'Freelance',
    icon: 'laptop-outline',
    color: '#30D158',
  },
  {
    id: 'rendimientos-intereses',
    name: 'Rendimientos / Intereses',
    icon: 'trending-up-outline',
    color: '#0A84FF',
  },
  {
    id: 'alquileres',
    name: 'Alquileres',
    icon: 'business-outline',
    color: '#64D2FF',
  },
  {
    id: 'ventas',
    name: 'Ventas',
    icon: 'pricetag-outline',
    color: '#FFD60A',
  },
  {
    id: 'cobro-prestamo',
    name: 'Cobro Préstamo',
    icon: 'arrow-undo-outline',
    color: '#BF5AF2',
  },
  {
    id: 'premios-bonos',
    name: 'Premios / Bonos',
    icon: 'trophy-outline',
    color: '#FF9F0A',
  },
  {
    id: 'reembolsos',
    name: 'Reembolsos',
    icon: 'receipt-outline',
    color: '#30D158',
  },
  {
    id: 'otros-ingresos',
    name: 'Otros Ingresos',
    icon: 'wallet-outline',
    color: '#8E8E93',
  },
];

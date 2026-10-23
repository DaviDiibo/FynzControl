export const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#00FFA3',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  inputBackground: '#1A1A1A',
  disabled: '#3A3A3C',
  error: '#FF453A',
} as const;

export const Colors = {
  dark: {
    ...colors,
    tint: '#00FFA3',
  },
  light: {
    ...colors,
    tint: '#00FFA3',
  },
};

export type ThemeColors = typeof colors;

import { useWindowDimensions } from 'react-native';

export const useIsWide = (breakpoint = 768): boolean => {
  const { width } = useWindowDimensions();
  return width >= breakpoint;
};

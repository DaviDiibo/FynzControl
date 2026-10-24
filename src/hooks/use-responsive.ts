import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export const useIsWide = (breakpoint = 768): boolean => {
  const [isWide, setIsWide] = useState<boolean>(() => {
    return Dimensions.get('window').width >= breakpoint;
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const currentWide = window.width >= breakpoint;
      setIsWide((prev) => (prev !== currentWide ? currentWide : prev));
    });

    return () => {
      subscription?.remove();
    };
  }, [breakpoint]);

  return isWide;
};

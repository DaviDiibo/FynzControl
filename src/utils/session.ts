import { AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/auth-store';

export const handleAppStateChange = (nextAppState: AppStateStatus): void => {
  if (nextAppState === 'active') {
    useAuthStore.getState().updateActivity();
  }
};

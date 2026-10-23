import { AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/auth-store';

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

export const handleAppStateChange = (nextAppState: AppStateStatus): void => {
  const { isAuthenticated, lastActiveTimestamp, logout, updateActivity } = useAuthStore.getState();
  
  if (nextAppState === 'active') {
    const currentTime = Date.now();
    if (isAuthenticated && (currentTime - lastActiveTimestamp > SESSION_TIMEOUT_MS)) {
      logout();
    } else {
      updateActivity();
    }
  }
};

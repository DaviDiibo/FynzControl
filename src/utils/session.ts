import { AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/auth-store';

const INACTIVITY_LOCK_MS = 15 * 60 * 1000;

export const handleAppStateChange = (nextAppState: AppStateStatus): void => {
  const { isAuthenticated, lastActiveTimestamp, pin, lockApp, updateActivity } =
    useAuthStore.getState();

  if (nextAppState === 'active') {
    const currentTime = Date.now();
    if (isAuthenticated && pin && currentTime - lastActiveTimestamp > INACTIVITY_LOCK_MS) {
      lockApp();
    }
    updateActivity();
  }
};


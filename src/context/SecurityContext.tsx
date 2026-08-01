import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface SecurityContextType {
  isPinSet: boolean;
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isLocked: boolean;
  setupPin: (newPin: string) => Promise<boolean>;
  verifyPin: (inputPin: string) => boolean;
  toggleLock: (enabled: boolean) => Promise<void>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  unlockApp: () => void;
  lockApp: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const KEY_PIN = 'hk_security_pin';
const KEY_LOCK_ENABLED = 'hk_security_lock_enabled';
const KEY_BIOMETRIC_ENABLED = 'hk_security_biometric_enabled';

const memoryStore: Record<string, string> = {};

const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    const secureVal = await SecureStore.getItemAsync(key);
    if (secureVal !== null) return secureVal;
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return memoryStore[key] || null;
  }
};

const setStorageItem = async (key: string, value: string): Promise<void> => {
  memoryStore[key] = value;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // Fail-safe in-memory storage fallback
  }
};

export const SecurityProvider = ({ children }: { children: ReactNode }) => {
  const [savedPin, setSavedPin] = useState<string>('');
  const [isPinSet, setIsPinSet] = useState<boolean>(false);
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Load initial settings on app start
  useEffect(() => {
    (async () => {
      try {
        const pin = await getStorageItem(KEY_PIN);
        const lockVal = await getStorageItem(KEY_LOCK_ENABLED);
        const bioVal = await getStorageItem(KEY_BIOMETRIC_ENABLED);

        if (pin && pin.length >= 4) {
          setSavedPin(pin);
          setIsPinSet(true);
        }

        const lockEnabled = lockVal === 'true';
        setIsLockEnabled(lockEnabled);

        if (bioVal !== null) {
          setIsBiometricEnabled(bioVal === 'true');
        }

        // Lock app on start if security lock is enabled & PIN exists
        if (lockEnabled && pin && pin.length >= 4) {
          setIsLocked(true);
        }
      } catch (e) {
        console.warn('Error loading security preferences:', e);
      }
    })();
  }, []);

  // Auto lock when app goes to background and comes back to active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isLockEnabled && savedPin.length >= 4) {
        setIsLocked(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isLockEnabled, savedPin]);

  const setupPin = async (newPin: string): Promise<boolean> => {
    if (!newPin || newPin.length !== 4) return false;
    try {
      await setStorageItem(KEY_PIN, newPin);
      await setStorageItem(KEY_LOCK_ENABLED, 'true');
      setSavedPin(newPin);
      setIsPinSet(true);
      setIsLockEnabled(true);
      setIsLocked(true);
      return true;
    } catch (e) {
      console.warn('Error saving PIN:', e);
      return false;
    }
  };

  const verifyPin = (inputPin: string): boolean => {
    if (inputPin === savedPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const toggleLock = async (enabled: boolean) => {
    try {
      await setStorageItem(KEY_LOCK_ENABLED, enabled ? 'true' : 'false');
      setIsLockEnabled(enabled);
      if (enabled && savedPin.length >= 4) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (e) {
      console.warn('Error toggling lock:', e);
    }
  };

  const toggleBiometrics = async (enabled: boolean) => {
    try {
      await setStorageItem(KEY_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
      setIsBiometricEnabled(enabled);
    } catch (e) {
      console.warn('Error toggling biometrics:', e);
    }
  };

  const unlockApp = () => {
    setIsLocked(false);
  };

  const lockApp = () => {
    if (isLockEnabled && isPinSet) {
      setIsLocked(true);
    }
  };

  return (
    <SecurityContext.Provider
      value={{
        isPinSet,
        isLockEnabled,
        isBiometricEnabled,
        isLocked,
        setupPin,
        verifyPin,
        toggleLock,
        toggleBiometrics,
        unlockApp,
        lockApp,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

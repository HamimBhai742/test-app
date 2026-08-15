import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

export type AutoLockDelayOption = 'instant' | '30s' | '1m';

interface SecurityContextType {
  isPinSet: boolean;
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isLocked: boolean;
  autoLockDelay: AutoLockDelayOption;
  failedAttempts: number;
  lockoutUntil: number | null;
  setupPin: (newPin: string) => Promise<boolean>;
  verifyPin: (inputPin: string) => Promise<boolean>;
  toggleLock: (enabled: boolean) => Promise<void>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  updateAutoLockDelay: (option: AutoLockDelayOption) => Promise<void>;
  unlockApp: () => void;
  lockApp: () => void;
  resetPinByRecovery: (newPin: string) => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const KEY_PIN = 'hk_security_pin';
const KEY_LOCK_ENABLED = 'hk_security_lock_enabled';
const KEY_BIOMETRIC_ENABLED = 'hk_security_biometric_enabled';
const KEY_AUTO_LOCK_DELAY = 'hk_security_auto_lock_delay';

const memoryStore: Record<string, string> = {};

const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    // Primary: SecureStore (encrypted)
    const secureVal = await SecureStore.getItemAsync(key);
    if (secureVal !== null) return secureVal;
    // Migration fallback: read from AsyncStorage only once for existing users
    // (AsyncStorage is unencrypted, so we immediately migrate to SecureStore)
    const asyncVal = await AsyncStorage.getItem(key);
    if (asyncVal !== null) {
      // Migrate: save to SecureStore and delete from AsyncStorage
      try {
        await SecureStore.setItemAsync(key, asyncVal);
        await AsyncStorage.removeItem(key);
      } catch {}
      return asyncVal;
    }
    return null;
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
    // Store ONLY in SecureStore (encrypted) — NOT in AsyncStorage (unencrypted)
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    // Fail-safe: memory-only fallback (already set above)
  }
};


export const SecurityProvider = ({ children }: { children: ReactNode }) => {
  const [savedPin, setSavedPin] = useState<string>('');
  const [isPinSet, setIsPinSet] = useState<boolean>(false);
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [autoLockDelay, setAutoLockDelay] = useState<AutoLockDelayOption>('instant');

  // Cooldown / Lockout States
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const lastBackgroundTime = useRef<number | null>(null);

  // Load initial settings on app start
  useEffect(() => {
    (async () => {
      try {
        const pin = await getStorageItem(KEY_PIN);
        const lockVal = await getStorageItem(KEY_LOCK_ENABLED);
        const bioVal = await getStorageItem(KEY_BIOMETRIC_ENABLED);
        const delayVal = await getStorageItem(KEY_AUTO_LOCK_DELAY);

        if (pin && pin.length >= 4) {
          setSavedPin(pin);
          setIsPinSet(true);
        }

        const lockEnabled = lockVal === 'true';
        setIsLockEnabled(lockEnabled);

        if (bioVal !== null) {
          setIsBiometricEnabled(bioVal === 'true');
        }

        if (delayVal && (delayVal === 'instant' || delayVal === '30s' || delayVal === '1m')) {
          setAutoLockDelay(delayVal as AutoLockDelayOption);
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

  // Auto lock with delay timer when app goes to background and comes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastBackgroundTime.current = Date.now();
      } else if (nextAppState === 'active' && isLockEnabled && savedPin.length >= 4) {
        if (lastBackgroundTime.current) {
          const diffMs = Date.now() - lastBackgroundTime.current;
          const delayThresholdMs =
            autoLockDelay === '30s' ? 30000 : autoLockDelay === '1m' ? 60000 : 0;

          if (diffMs >= delayThresholdMs) {
            setIsLocked(true);
          }
        } else {
          setIsLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isLockEnabled, savedPin, autoLockDelay]);

  const setupPin = async (newPin: string): Promise<boolean> => {
    if (!newPin || newPin.length !== 4) return false;
    try {
      // Hash the PIN before storing — never store raw PIN
      const hashedPin = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        newPin + 'hk_pin_salt_v1'
      );
      await setStorageItem(KEY_PIN, hashedPin);
      await setStorageItem(KEY_LOCK_ENABLED, 'true');
      setSavedPin(hashedPin);
      setIsPinSet(true);
      setIsLockEnabled(true);
      setIsLocked(true);
      setFailedAttempts(0);
      setLockoutUntil(null);
      return true;
    } catch (e) {
      console.warn('Error saving PIN:', e);
      return false;
    }
  };

  const verifyPin = async (inputPin: string): Promise<boolean> => {
    // Check if locked out
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return false;
    }

    try {
      // Hash the input and compare with stored hash
      const hashedInput = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        inputPin + 'hk_pin_salt_v1'
      );

      if (hashedInput === savedPin) {
        setIsLocked(false);
        setFailedAttempts(0);
        setLockoutUntil(null);
        return true;
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 3) {
          setLockoutUntil(Date.now() + 30000);
        }
        return false;
      }
    } catch (e) {
      console.warn('Error verifying PIN:', e);
      return false;
    }
  };

  // Real biometric authentication using device hardware
  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') return false;
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'হিসাব কিতাব unlock করুন',
        fallbackLabel: 'PIN ব্যবহার করুন',
        disableDeviceFallback: false,
        cancelLabel: 'বাতিল',
      });

      if (result.success) {
        setIsLocked(false);
        setFailedAttempts(0);
        setLockoutUntil(null);
      }
      return result.success;
    } catch (e) {
      console.warn('Biometric auth error:', e);
      return false;
    }
  };

  const updateAutoLockDelay = async (option: AutoLockDelayOption) => {
    try {
      await setStorageItem(KEY_AUTO_LOCK_DELAY, option);
      setAutoLockDelay(option);
    } catch (e) {
      console.warn('Error updating auto lock delay:', e);
    }
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
    setFailedAttempts(0);
    setLockoutUntil(null);
  };

  const lockApp = () => {
    if (isLockEnabled && isPinSet) {
      setIsLocked(true);
    }
  };

  const resetPinByRecovery = async (newPin: string): Promise<boolean> => {
    return await setupPin(newPin);
  };

  return (
    <SecurityContext.Provider
      value={{
        isPinSet,
        isLockEnabled,
        isBiometricEnabled,
        isLocked,
        autoLockDelay,
        failedAttempts,
        lockoutUntil,
        setupPin,
        verifyPin,
        toggleLock,
        toggleBiometrics,
        updateAutoLockDelay,
        unlockApp,
        lockApp,
        resetPinByRecovery,
        authenticateWithBiometrics,
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

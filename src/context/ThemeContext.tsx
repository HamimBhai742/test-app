import React, { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

let currentThemeMode: ThemeMode = 'system';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => currentThemeMode;

const setThemeModeGlobal = (mode: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => {
  const nextMode = typeof mode === 'function' ? mode(currentThemeMode) : mode;
  if (nextMode !== currentThemeMode) {
    currentThemeMode = nextMode;
    listeners.forEach((l) => l());
  }
};

interface ThemeModeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => void;
  colorScheme: 'light' | 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useThemeMode = (): ThemeModeContextType => {
  const themeMode = useSyncExternalStore(subscribe, getSnapshot);
  const systemScheme = useRNColorScheme();

  const colorScheme: 'light' | 'dark' =
    themeMode === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themeMode;

  return {
    themeMode,
    setThemeMode: setThemeModeGlobal,
    colorScheme,
  };
};

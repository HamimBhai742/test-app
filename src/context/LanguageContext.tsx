import React, { useSyncExternalStore } from 'react';

type Language = 'bn' | 'en';

let currentLanguage: Language = 'bn';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => currentLanguage;

export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

const setLanguageGlobal = (lang: Language | ((prev: Language) => Language)) => {
  const nextLang = typeof lang === 'function' ? lang(currentLanguage) : lang;
  if (nextLang !== currentLanguage) {
    currentLanguage = nextLang;
    listeners.forEach((l) => l());
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language | ((prev: Language) => Language)) => void;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useLanguage = (): LanguageContextType => {
  const language = useSyncExternalStore(subscribe, getSnapshot);
  return {
    language,
    setLanguage: setLanguageGlobal,
  };
};

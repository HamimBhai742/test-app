import { getCurrentLanguage } from '@/context/LanguageContext';

export const toBanglaDigits = (numStr: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return numStr.replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit)]);
};

export const toEnglishDigits = (numStr: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return numStr.replace(/[০-৯]/g, (digit) => {
    const idx = banglaDigits.indexOf(digit);
    return idx !== -1 ? idx.toString() : digit;
  });
};

export const formatNumber = (num: number): string => {
  const language = getCurrentLanguage();
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = parts.join('.');
  return language === 'bn' ? toBanglaDigits(formatted) : formatted;
};

export const getCurrencySymbol = (): string => {
  const language = getCurrentLanguage();
  return language === 'bn' ? '৳ ' : 'TK ';
};

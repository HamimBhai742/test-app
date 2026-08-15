import { useEffect, useState } from 'react';
import { useThemeMode } from '@/context/ThemeContext';

export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { colorScheme } = useThemeMode();

  useEffect(() => {
    queueMicrotask(() => {
      setHasHydrated(true);
    });
  }, []);

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}

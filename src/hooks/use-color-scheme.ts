import { useThemeMode } from '@/context/ThemeContext';

export function useColorScheme() {
  const { colorScheme } = useThemeMode();
  return colorScheme;
}

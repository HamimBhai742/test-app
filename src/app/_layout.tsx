import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
// ট্রানজেকশন স্টেটকে অ্যাপের সর্বত্র ব্যবহার উপযোগী করার জন্য TransactionProvider ইমপোর্ট করা হচ্ছে।
import { TransactionProvider } from '@/context/TransactionContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    // ThemeProvider এর মাধ্যমে অ্যাপের লাইট/ডার্ক মোড সেটআপ করা হচ্ছে।
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* TransactionProvider দিয়ে অ্যাপের মূল কন্টেন্টকে র‍্যাপ (wrap) করা হয়েছে 
          যাতে যেকোনো স্ক্রিন বা ট্যাব থেকে খরচের হিসাব অ্যাক্সেস করা যায়। */}
      <TransactionProvider>
        <AnimatedSplashOverlay />
        <AppTabs />
      </TransactionProvider>
    </ThemeProvider>
  );
}


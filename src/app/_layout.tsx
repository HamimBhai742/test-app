import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
// ট্রানজেকশন স্টেটকে অ্যাপের সর্বত্র ব্যবহার উপযোগী করার জন্য TransactionProvider ইমপোর্ট করা হচ্ছে।
import { TransactionProvider } from '@/context/TransactionContext';
import { DueProvider } from '@/context/DueContext';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SecurityProvider } from '@/context/SecurityContext';
import { AppLockScreen } from '@/components/app-lock-screen';
import { InvestmentProvider } from '@/context/InvestmentContext';

import React, { useState, useEffect } from 'react';
import { OnboardingScreen, getOnboardingCompleted, setOnboardingCompleted } from '@/components/onboarding';

import ProfileScreen from './profile';
import { useAuth } from '@/context/AuthContext';

import { PointsProvider } from '@/context/PointsContext';
import { NotificationBannerProvider } from '@/context/NotificationBannerContext';

SplashScreen.preventAutoHideAsync();

function MainContent() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    getOnboardingCompleted().then((completed) => {
      setShowOnboarding(!completed);
    });
  }, []);

  const handleOnboardingComplete = async () => {
    await setOnboardingCompleted(true);
    setShowOnboarding(false);
  };

  return (
    <>
      <AnimatedSplashOverlay />
      <AppLockScreen />
      {showOnboarding === true && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {showOnboarding === false && (
        !user ? <ProfileScreen /> : <AppTabs />
      )}
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    // ThemeProvider এর মাধ্যমে অ্যাপের লাইট/ডার্ক মোড সেটআপ করা হচ্ছে।
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <InvestmentProvider>
          <TransactionProvider>
            <DueProvider>
              <AuthProvider>
                <SecurityProvider>
                  <PointsProvider>
                    <NotificationBannerProvider>
                      <MainContent />
                    </NotificationBannerProvider>
                  </PointsProvider>
                </SecurityProvider>
              </AuthProvider>
            </DueProvider>
          </TransactionProvider>
        </InvestmentProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}


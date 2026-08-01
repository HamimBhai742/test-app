import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  Layout,
} from 'react-native-reanimated';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = '@hisabkitab_onboarding_completed';
let memoryOnboardingState: boolean | null = null;

export const getOnboardingCompleted = async (): Promise<boolean> => {
  if (memoryOnboardingState !== null) return memoryOnboardingState;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(STORAGE_KEY);
        memoryOnboardingState = val === 'true';
        return memoryOnboardingState;
      }
    } else {
      try {
        const secureVal = await SecureStore.getItemAsync(STORAGE_KEY);
        if (secureVal !== null) {
          memoryOnboardingState = secureVal === 'true';
          return memoryOnboardingState;
        }
      } catch {}

      try {
        const asyncVal = await AsyncStorage.getItem(STORAGE_KEY);
        if (asyncVal !== null) {
          memoryOnboardingState = asyncVal === 'true';
          return memoryOnboardingState;
        }
      } catch {}
    }
  } catch (e) {}
  return memoryOnboardingState ?? false;
};

export const setOnboardingCompleted = async (completed: boolean): Promise<void> => {
  memoryOnboardingState = completed;
  try {
    const val = completed ? 'true' : 'false';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, val);
      }
    } else {
      try {
        await SecureStore.setItemAsync(STORAGE_KEY, val);
      } catch {}
      try {
        await AsyncStorage.setItem(STORAGE_KEY, val);
      } catch {}
    }
  } catch (e) {}
};

interface OnboardingProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const { language } = useLanguage();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const t = translations[language];
  const { user } = useAuth();
  const router = useRouter();

  const handleFinish = async () => {
    await setOnboardingCompleted(true);
    onComplete();
    if (!user) {
      router.replace('/profile');
    }
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleTouchStart = (e: any) => {
    setTouchStartX(e.nativeEvent.pageX);
  };

  const handleTouchEnd = (e: any) => {
    if (touchStartX === null) return;
    const touchEndX = e.nativeEvent.pageX;
    const distance = touchStartX - touchEndX;

    // Swipe Left -> Next slide
    if (distance > 40) {
      handleNext();
    }
    // Swipe Right -> Previous slide
    else if (distance < -40) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  const isLastSlide = currentSlide === 2;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandIcon}>💰</Text>
            <Text style={[styles.brandTitle, { color: theme.text }]}>হিসাব কিতাব</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleFinish}
            style={[styles.skipButton, { backgroundColor: isDark ? '#2A2C30' : '#EAECEF' }]}
          >
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
              {t.onboardingSkip}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Carousel Area */}
        <View
          style={styles.slideContainer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentSlide === 0 && (
            <Animated.View
              key="slide-0"
              entering={FadeInRight.duration(350)}
              exiting={FadeOutLeft.duration(250)}
              style={styles.slide}
            >
              {/* Graphic Card 1 */}
              <View style={[styles.cardGraphic, { backgroundColor: isDark ? '#1A1D24' : '#F3F6FA', borderColor: isDark ? '#2F3442' : '#E2E8F0' }]}>
                <View style={styles.balancePreviewBox}>
                  <Text style={styles.balanceLabel}>মোট ব্যালেন্স</Text>
                  <Text style={styles.balanceValue}>৳ ৪৫,২০০</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                    <Text style={styles.statIcon}>📈</Text>
                    <Text style={[styles.statTitle, { color: '#16A34A' }]}>+ ৳ ৬৫,০০০</Text>
                    <Text style={styles.statSub}>মোট আয়</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Text style={styles.statIcon}>📉</Text>
                    <Text style={[styles.statTitle, { color: '#DC2626' }]}>- ৳ ১৯,৮০০</Text>
                    <Text style={styles.statSub}>মোট ব্যয়</Text>
                  </View>
                </View>

                <View style={[styles.recentItemRow, { backgroundColor: isDark ? '#252932' : '#FFFFFF' }]}>
                  <View style={styles.recentItemLeft}>
                    <Text style={styles.recentEmoji}>🛒</Text>
                    <View>
                      <Text style={[styles.recentTitle, { color: theme.text }]}>গ্রোসারি বাজার</Text>
                      <Text style={styles.recentSub}>আজ • Food</Text>
                    </View>
                  </View>
                  <Text style={styles.recentAmount}>- ৳ ৩,৫০০</Text>
                </View>
              </View>

              <View style={styles.textGroup}>
                <Text style={[styles.slideTitle, { color: theme.text }]}>
                  {t.onboardingSlide1Title}
                </Text>
                <Text style={[styles.slideSub, { color: theme.textSecondary }]}>
                  {t.onboardingSlide1Sub}
                </Text>
              </View>
            </Animated.View>
          )}

          {currentSlide === 1 && (
            <Animated.View
              key="slide-1"
              entering={FadeInRight.duration(350)}
              exiting={FadeOutLeft.duration(250)}
              style={styles.slide}
            >
              {/* Graphic Card 2 */}
              <View style={[styles.cardGraphic, { backgroundColor: isDark ? '#1A1D24' : '#F3F6FA', borderColor: isDark ? '#2F3442' : '#E2E8F0' }]}>
                <Text style={[styles.categoryHeader, { color: theme.text }]}>মাসিক ক্যাটাগরি বাজেট</Text>

                <View style={styles.categoryItem}>
                  <View style={styles.categoryLabelRow}>
                    <Text style={[styles.categoryName, { color: theme.text }]}>🍔 খাবার (Food)</Text>
                    <Text style={styles.categoryValue}>৳ ৩,৫০০ / ৳ ৫,০০০</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: '70%', backgroundColor: '#F97316' }]} />
                  </View>
                </View>

                <View style={styles.categoryItem}>
                  <View style={styles.categoryLabelRow}>
                    <Text style={[styles.categoryName, { color: theme.text }]}>🏠 বাসা ভাড়া (Rent)</Text>
                    <Text style={styles.categoryValue}>৳ ১৫,০০০ / ৳ ১৫,০০০</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: '100%', backgroundColor: '#3B82F6' }]} />
                  </View>
                </View>

                <View style={styles.categoryItem}>
                  <View style={styles.categoryLabelRow}>
                    <Text style={[styles.categoryName, { color: theme.text }]}>🛍️ শপিং (Shopping)</Text>
                    <Text style={styles.categoryValue}>৳ ৪,২০০ / ৳ ১০,০০০</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: '42%', backgroundColor: '#A855F7' }]} />
                  </View>
                </View>
              </View>

              <View style={styles.textGroup}>
                <Text style={[styles.slideTitle, { color: theme.text }]}>
                  {t.onboardingSlide2Title}
                </Text>
                <Text style={[styles.slideSub, { color: theme.textSecondary }]}>
                  {t.onboardingSlide2Sub}
                </Text>
              </View>
            </Animated.View>
          )}

          {currentSlide === 2 && (
            <Animated.View
              key="slide-2"
              entering={FadeInRight.duration(350)}
              exiting={FadeOutLeft.duration(250)}
              style={styles.slide}
            >
              {/* Graphic Card 3 */}
              <View style={[styles.cardGraphic, { backgroundColor: isDark ? '#1A1D24' : '#F3F6FA', borderColor: isDark ? '#2F3442' : '#E2E8F0' }]}>
                <View style={styles.chartTitleRow}>
                  <Text style={[styles.categoryHeader, { color: theme.text, marginBottom: 0 }]}>
                    আয় বনাম ব্যয় বিশ্লেষণ
                  </Text>
                  <View style={styles.exportBadge}>
                    <Text style={styles.exportBadgeText}>📊 Report Ready</Text>
                  </View>
                </View>

                {/* Simulated Bar Graph */}
                <View style={styles.chartGraphBox}>
                  <View style={styles.barGroup}>
                    <View style={[styles.bar, { height: 40, backgroundColor: '#3B82F6' }]} />
                    <View style={[styles.bar, { height: 25, backgroundColor: '#EF4444' }]} />
                    <Text style={styles.barMonth}>মে</Text>
                  </View>
                  <View style={styles.barGroup}>
                    <View style={[styles.bar, { height: 65, backgroundColor: '#3B82F6' }]} />
                    <View style={[styles.bar, { height: 35, backgroundColor: '#EF4444' }]} />
                    <Text style={styles.barMonth}>জুন</Text>
                  </View>
                  <View style={styles.barGroup}>
                    <View style={[styles.bar, { height: 80, backgroundColor: '#3B82F6' }]} />
                    <View style={[styles.bar, { height: 30, backgroundColor: '#EF4444' }]} />
                    <Text style={styles.barMonth}>জুলাই</Text>
                  </View>
                </View>

                <View style={styles.tipBox}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipText}>
                    গত মাসের তুলনায় আপনার মোট সঞ্চয় +২৩% বৃদ্ধি পেয়েছে!
                  </Text>
                </View>
              </View>

              <View style={styles.textGroup}>
                <Text style={[styles.slideTitle, { color: theme.text }]}>
                  {t.onboardingSlide3Title}
                </Text>
                <Text style={[styles.slideSub, { color: theme.textSecondary }]}>
                  {t.onboardingSlide3Sub}
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {/* Pagination Indicators */}
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((idx) => {
              const active = idx === currentSlide;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setCurrentSlide(idx)}
                  activeOpacity={0.7}
                >
                  <Animated.View
                    layout={Layout.springify()}
                    style={[
                      styles.dot,
                      active
                        ? [styles.activeDot, { backgroundColor: '#208AEF' }]
                        : [styles.inactiveDot, { backgroundColor: isDark ? '#3A3D45' : '#CBD5E1' }],
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            style={styles.mainButton}
          >
            <Text style={styles.mainButtonText}>
              {isLastSlide ? t.onboardingGetStarted : t.onboardingNext}
            </Text>
            <Text style={styles.arrowIcon}>{isLastSlide ? '🚀' : '➔'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    fontSize: 24,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  slide: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  cardGraphic: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  balancePreviewBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#208AEF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statSub: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentEmoji: {
    fontSize: 20,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentSub: {
    fontSize: 11,
    color: '#8E8E93',
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  categoryHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 14,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryValue: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportBadge: {
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exportBadgeText: {
    fontSize: 11,
    color: '#208AEF',
    fontWeight: '700',
  },
  chartGraphBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 110,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 14,
  },
  barGroup: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
  },
  bar: {
    width: 12,
    borderRadius: 4,
  },
  barMonth: {
    position: 'absolute',
    bottom: -20,
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
    flex: 1,
  },
  textGroup: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  slideSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
  },
  mainButton: {
    width: '100%',
    maxWidth: 420,
    height: 54,
    backgroundColor: '#208AEF',
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

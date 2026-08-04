import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useLanguage } from './LanguageContext';

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  badge: string;
  isCurrentUser?: boolean;
}

interface PointsContextType {
  points: number;
  userBadge: string;
  dailyLoginEarnedToday: boolean;
  dailyTxEarnedToday: boolean;
  claimDailyOpenReward: () => Promise<boolean>;
  claimDailyTxReward: () => Promise<boolean>;
  getLeaderboard: () => LeaderboardUser[];
  addPoints: (amount: number) => Promise<void>;
}

const STORAGE_KEY_POINTS = 'hisab_kitab_user_points';
const STORAGE_KEY_DAILY_LOGIN_DATE = 'hisab_kitab_last_login_reward_date';
const STORAGE_KEY_DAILY_TX_DATE = 'hisab_kitab_last_tx_reward_date';

const PointsContext = createContext<PointsContextType | undefined>(undefined);

// Safe storage helpers
const getItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    }
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) return val;
    } catch {}
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const setItem = async (key: string, value: string) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {
        await AsyncStorage.setItem(key, value);
      }
    }
  } catch (e) {}
};

const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getBadgeForPoints = (pts: number, lang: string = 'bn'): string => {
  if (lang === 'bn') {
    if (pts >= 600) return '💎 ডায়মন্ড লিজেন্ড';
    if (pts >= 300) return '🥇 গোল্ড মাস্টার';
    if (pts >= 100) return '🥈 সিলভার ম্যানেজার';
    return '🥉 ব্রোঞ্জ সেভার';
  } else {
    if (pts >= 600) return '💎 Diamond Legend';
    if (pts >= 300) return '🥇 Gold Master';
    if (pts >= 100) return '🥈 Silver Manager';
    return '🥉 Bronze Saver';
  }
};

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [points, setPoints] = useState<number>(50);
  const [dailyLoginEarnedToday, setDailyLoginEarnedToday] = useState<boolean>(false);
  const [dailyTxEarnedToday, setDailyTxEarnedToday] = useState<boolean>(false);
  const { language } = useLanguage();

  useEffect(() => {
    const initPointsSystem = async () => {
      const today = getTodayDateString();

      // Load points
      const storedPoints = await getItem(STORAGE_KEY_POINTS);
      let currentPts = 50;
      if (storedPoints !== null) {
        currentPts = parseInt(storedPoints, 10) || 50;
        setPoints(currentPts);
      } else {
        await setItem(STORAGE_KEY_POINTS, '50');
      }

      // Check daily login reward date
      const lastLoginDate = await getItem(STORAGE_KEY_DAILY_LOGIN_DATE);
      if (lastLoginDate === today) {
        setDailyLoginEarnedToday(true);
      } else {
        // Auto-award 10 points for opening app today
        currentPts += 10;
        setPoints(currentPts);
        setDailyLoginEarnedToday(true);
        await setItem(STORAGE_KEY_POINTS, currentPts.toString());
        await setItem(STORAGE_KEY_DAILY_LOGIN_DATE, today);
      }

      // Check daily transaction reward date
      const lastTxDate = await getItem(STORAGE_KEY_DAILY_TX_DATE);
      if (lastTxDate === today) {
        setDailyTxEarnedToday(true);
      } else {
        setDailyTxEarnedToday(false);
      }
    };

    initPointsSystem();
  }, []);

  // Claim Daily Open Reward
  const claimDailyOpenReward = async (): Promise<boolean> => {
    const today = getTodayDateString();
    if (dailyLoginEarnedToday) return false;

    const newPts = points + 10;
    setPoints(newPts);
    setDailyLoginEarnedToday(true);
    await setItem(STORAGE_KEY_POINTS, newPts.toString());
    await setItem(STORAGE_KEY_DAILY_LOGIN_DATE, today);
    return true;
  };

  // Claim Daily Transaction Reward
  const claimDailyTxReward = async (): Promise<boolean> => {
    const today = getTodayDateString();
    if (dailyTxEarnedToday) return false;

    const newPts = points + 10;
    setPoints(newPts);
    setDailyTxEarnedToday(true);
    await setItem(STORAGE_KEY_POINTS, newPts.toString());
    await setItem(STORAGE_KEY_DAILY_TX_DATE, today);
    return true;
  };

  // Community Leaderboard Data Generator
  const getLeaderboard = (): LeaderboardUser[] => {
    const mockCommunity: LeaderboardUser[] = [
      { id: '1', name: language === 'bn' ? 'হামিম আহমেদ' : 'Hamim Ahmed', points: Math.max(points + 120, 520), badge: getBadgeForPoints(Math.max(points + 120, 520), language) },
      { id: '2', name: language === 'bn' ? 'তানভীর হাসান' : 'Tanvir Hasan', points: 430, badge: getBadgeForPoints(430, language) },
      { id: '3', name: language === 'bn' ? 'সাকিব রহমান' : 'Sakib Rahman', points: 340, badge: getBadgeForPoints(340, language) },
      { id: '4', name: language === 'bn' ? 'আপনি' : 'You', points: points, badge: getBadgeForPoints(points, language), isCurrentUser: true },
      { id: '5', name: language === 'bn' ? 'রফিক উদ্দিন' : 'Rafiq Uddin', points: Math.max(points - 20, 80), badge: getBadgeForPoints(Math.max(points - 20, 80), language) },
      { id: '6', name: language === 'bn' ? 'আরিফ হোসেন' : 'Arif Hossain', points: 60, badge: getBadgeForPoints(60, language) },
    ];

    // Sort descending by points
    return mockCommunity.sort((a, b) => b.points - a.points);
  };

  return (
    <PointsContext.Provider
      value={{
        points,
        userBadge: getBadgeForPoints(points, language),
        dailyLoginEarnedToday,
        dailyTxEarnedToday,
        claimDailyOpenReward,
        claimDailyTxReward,
        getLeaderboard,
        addPoints: async (amount: number) => {
          const newPts = points + amount;
          setPoints(newPts);
          await setItem(STORAGE_KEY_POINTS, newPts.toString());
        },
      }}
    >
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
}

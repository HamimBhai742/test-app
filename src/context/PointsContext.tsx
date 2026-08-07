import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/constants/config';
import { triggerPointsNotification } from '@/services/notificationService';

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
  leaderboard: LeaderboardUser[];
  isLeaderboardLoading: boolean;
  fetchLeaderboard: () => Promise<void>;
  addPoints: (amount: number) => Promise<void>;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState<boolean>(false);
  const { language } = useLanguage();
  const { user, token, refreshUser } = useAuth();

  const getApiBaseUrl = () => {
    return API_BASE_URL;
  };

  // Sync points and claim statuses from user object when it changes
  useEffect(() => {
    if (user) {
      setPoints(user.points ?? 50);

      const today = getTodayDateString();
      if (user.lastLoginRewardClaimedAt) {
        const lastClaimed = user.lastLoginRewardClaimedAt.toString().split('T')[0];
        setDailyLoginEarnedToday(today === lastClaimed);
      } else {
        setDailyLoginEarnedToday(false);
      }

      if (user.lastTxRewardClaimedAt) {
        const lastClaimed = user.lastTxRewardClaimedAt.toString().split('T')[0];
        setDailyTxEarnedToday(today === lastClaimed);
      } else {
        setDailyTxEarnedToday(false);
      }
    } else {
      setPoints(50);
      setDailyLoginEarnedToday(false);
      setDailyTxEarnedToday(false);
    }
  }, [user]);

  // Show welcome points notification for new users on signup/first-login
  useEffect(() => {
    const triggerWelcomePointsNotification = async () => {
      if (!user) return;
      try {
        const welcomed = await AsyncStorage.getItem('hisabkitab_welcomed_points');
        if (!welcomed) {
          await AsyncStorage.setItem('hisabkitab_welcomed_points', 'true');
          // Trigger welcome points notification
          triggerPointsNotification(user.points ?? 50, 'welcome');
        }
      } catch (e) {
        console.warn('Error checking welcome points notification state:', e);
      }
    };
    triggerWelcomePointsNotification();
  }, [user]);

  // Securely auto-claim login reward on startup/auth if not claimed today
  // Use a ref to prevent double-claiming in the same session
  const hasAttemptedLoginClaim = React.useRef(false);
  useEffect(() => {
    // Only run when user+token are available, and only once per session
    if (!user || !token || hasAttemptedLoginClaim.current) return;

    const autoClaimLoginReward = async () => {
      const today = getTodayDateString();
      let lastClaimed = '';
      if (user.lastLoginRewardClaimedAt) {
        lastClaimed = user.lastLoginRewardClaimedAt.toString().split('T')[0];
      }

      if (lastClaimed !== today && !dailyLoginEarnedToday) {
        hasAttemptedLoginClaim.current = true; // Mark as attempted before API call
        try {
          const response = await fetch(`${getApiBaseUrl()}/user/me/claim-daily-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setPoints(data.data.points);
              setDailyLoginEarnedToday(true);
              await refreshUser();
              triggerPointsNotification(10, 'login');
            }
          }
        } catch (e) {
          hasAttemptedLoginClaim.current = false; // Allow retry on network error
          console.warn('Error auto-claiming login reward:', e);
        }
      } else {
        hasAttemptedLoginClaim.current = true; // Already claimed, no need to retry
      }
    };

    autoClaimLoginReward();
  }, [user, token]); // Removed dailyLoginEarnedToday from deps to prevent re-render loop

  // Fetch dynamic leaderboard from server
  const fetchLeaderboard = async () => {
    if (!token) return;
    setIsLeaderboardLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/user/leaderboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const formatted: LeaderboardUser[] = data.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar || undefined,
            points: u.points,
            badge: getBadgeForPoints(u.points, language),
            isCurrentUser: u.id === user?.id,
          }));
          setLeaderboard(formatted);
        }
      }
    } catch (e) {
      console.warn('Error fetching leaderboard:', e);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // Fetch initial leaderboard if token is present
  useEffect(() => {
    if (token) {
      fetchLeaderboard();
    }
  }, [token]);

  // Claim Daily Open Reward (Button Click Fallback)
  const claimDailyOpenReward = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await fetch(`${getApiBaseUrl()}/user/me/claim-daily-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPoints(data.data.points);
          setDailyLoginEarnedToday(true);
          await refreshUser();
          triggerPointsNotification(10, 'login');
          // Refresh leaderboard to sync rankings
          fetchLeaderboard();
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  // Claim Daily Transaction Reward
  const claimDailyTxReward = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const response = await fetch(`${getApiBaseUrl()}/user/me/claim-daily-tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPoints(data.data.points);
          setDailyTxEarnedToday(true);
          await refreshUser();
          triggerPointsNotification(10, 'transaction');
          // Refresh leaderboard to sync rankings
          fetchLeaderboard();
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  const addPoints = async (amount: number): Promise<void> => {
    if (!token) return;
    try {
      const response = await fetch(`${getApiBaseUrl()}/user/me/add-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPoints(data.data.points);
          await refreshUser();
          triggerPointsNotification(amount, 'goal');
          fetchLeaderboard();
        }
      }
    } catch (e) {}
  };

  const getLeaderboard = (): LeaderboardUser[] => {
    return leaderboard;
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
        leaderboard,
        isLeaderboardLoading,
        fetchLeaderboard,
        addPoints,
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

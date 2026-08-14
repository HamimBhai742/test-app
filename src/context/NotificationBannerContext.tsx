import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface BannerNotification {
  id: string;
  title: string;
  body: string;
  type?: 'daily' | 'due' | 'budget' | 'info';
  timestamp: string;
  isRead: boolean;
}

interface NotificationBannerContextType {
  showNotification: (title: string, body: string, type?: 'daily' | 'due' | 'budget' | 'info') => void;
  notifications: BannerNotification[];
  clearAll: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

const NotificationBannerContext = createContext<NotificationBannerContextType | undefined>(undefined);

export const NotificationBannerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeBanner, setActiveBanner] = useState<BannerNotification | null>(null);
  const [notifications, setNotifications] = useState<BannerNotification[]>([]);

  // Load saved notifications on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const stored = await AsyncStorage.getItem('hisabkitab_saved_notifications');
        if (stored) {
          setNotifications(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Error loading notifications:', e);
      }
    };
    loadSaved();
  }, []);

  const showNotification = (title: string, body: string, type: 'daily' | 'due' | 'budget' | 'info' = 'info') => {
    const id = Math.random().toString();
    const newNotif: BannerNotification = {
      id,
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setActiveBanner(newNotif);

    // Persist to list
    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      AsyncStorage.setItem('hisabkitab_saved_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Auto hide after 5 seconds
    setTimeout(() => {
      setActiveBanner((prev) => (prev?.id === id ? null : prev));
    }, 5000);
  };

  const clearAll = async () => {
    setNotifications([]);
    await AsyncStorage.removeItem('hisabkitab_saved_notifications').catch(() => {});
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      AsyncStorage.setItem('hisabkitab_saved_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      AsyncStorage.setItem('hisabkitab_saved_notifications', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const getBadgeColor = (type?: string) => {
    switch (type) {
      case 'budget': return '#EF4444';
      case 'due': return '#F59E0B';
      case 'daily': return '#3B82F6';
      default: return '#10B981';
    }
  };

  const getBadgeIcon = (type?: string) => {
    switch (type) {
      case 'budget': return '⚡';
      case 'due': return '⏰';
      case 'daily': return '📝';
      default: return '🔔';
    }
  };

  return (
    <NotificationBannerContext.Provider value={{ showNotification, notifications, clearAll, markAllAsRead, markAsRead }}>
      {children}
      {activeBanner && (
        <SafeAreaView style={styles.bannerWrapper} pointerEvents="box-none">
          <Animated.View
            entering={SlideInUp.duration(350)}
            exiting={SlideOutUp.duration(300)}
            style={styles.bannerContainer}
          >
            <View style={styles.bannerHeader}>
              <View style={styles.bannerAppInfo}>
                <View style={[styles.iconCircle, { backgroundColor: `${getBadgeColor(activeBanner.type)}25` }]}>
                  <Text style={styles.iconText}>{getBadgeIcon(activeBanner.type)}</Text>
                </View>
                <Text style={styles.appName}>হিসাব কিতাব • নোটিফিকেশন</Text>
              </View>
              <Text style={styles.timeText}>এখনই</Text>
            </View>

            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>{activeBanner.title}</Text>
              <Text style={styles.bannerText}>{activeBanner.body}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setActiveBanner(null)}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      )}
    </NotificationBannerContext.Provider>
  );
};

export const useNotificationBanner = () => {
  const context = useContext(NotificationBannerContext);
  if (!context) {
    throw new Error('useNotificationBanner must be used within NotificationBannerProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 30,
    left: 14,
    right: 14,
    zIndex: 999999,
  },
  bannerContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerAppInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 13,
  },
  appName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    color: '#64748B',
    fontSize: 11,
  },
  bannerBody: {
    marginTop: 2,
    paddingRight: 24,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

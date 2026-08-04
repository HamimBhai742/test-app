import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe dynamic require for expo-notifications to prevent Expo Go SDK 53+ Android crashes
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Expo Go fallback
}

const NOTIFICATION_SETTINGS_KEY = 'hisabkitab_notification_settings';
const DAILY_REMINDER_ID = 'hisabkitab_daily_reminder';
const PUSH_TOKEN_KEY = 'hisabkitab_push_token';

export interface NotificationSettings {
  dailyEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  dueEnabled: boolean;
  budgetEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyEnabled: true,
  dailyHour: 21, // 9:00 PM
  dailyMinute: 0,
  dueEnabled: true,
  budgetEnabled: true,
};

// Configure Expo notification presentation safely
if (Platform.OS !== 'web' && Notifications && typeof Notifications.setNotificationHandler === 'function') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {}
}

/**
 * Request notification permissions from device
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !Notifications) return false;

  try {
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      }).catch(() => {});
    }

    if (typeof Notifications.getPermissionsAsync === 'function') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    }
  } catch (error) {}
  return false;
};

/**
 * Get cached notification settings from AsyncStorage
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (json) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    }
  } catch (e) {}
  return DEFAULT_SETTINGS;
};

/**
 * Save notification settings to AsyncStorage
 */
export const saveNotificationSettings = async (
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  let updated = DEFAULT_SETTINGS;
  try {
    const current = await getNotificationSettings();
    updated = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated)).catch(() => {});
  } catch (e) {}

  // Update scheduled daily reminder safely
  try {
    if (updated.dailyEnabled) {
      await scheduleDailyReminder(updated.dailyHour, updated.dailyMinute);
    } else {
      await cancelDailyReminder();
    }
  } catch (e) {}

  return updated;
};

/**
 * Schedule recurring daily accounting reminder
 */
export const scheduleDailyReminder = async (
  hour: number = 21,
  minute: number = 0
): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await cancelDailyReminder();

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_REMINDER_ID,
        content: {
          title: 'আজকের হিসাব লিখেছেন তো? 📝',
          body: 'আপনার দৈনন্দিন আয়-ব্যয়ের সঠিক হিসাব রাখতে এখনই এন্ট্রি করুন।',
          data: { type: 'daily_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      }).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Cancel daily reminder
 */
export const cancelDailyReminder = async (): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    if (typeof Notifications.cancelScheduledNotificationAsync === 'function') {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Schedule a local notification for due payment deadline
 */
export const scheduleDueReminder = async (
  dueId: string,
  personName: string,
  amount: number,
  dueDateStr: string,
  type: string
): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications || !dueDateStr) return;

  try {
    const settings = await getNotificationSettings();
    if (!settings.dueEnabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const targetDate = new Date(dueDateStr);
    targetDate.setHours(9, 0, 0, 0); // Trigger at 9:00 AM on due date

    if (targetDate.getTime() <= Date.now()) return;

    const isReceivable = type === 'receivable';
    const title = isReceivable ? 'পাওনা টাকা পরিশোধের তাগাদা 💰' : 'দেনা পরিশোধের সময়সূচি ⚠️';
    const body = isReceivable
      ? `${personName}-এর কাছে ৳${amount.toLocaleString()} পাওনার আজ শেষ তারিখ।`
      : `${personName}-কে ৳${amount.toLocaleString()} পরিশোধের আজ শেষ তারিখ।`;

    const identifier = `due_reminder_${dueId}`;
    if (typeof Notifications.cancelScheduledNotificationAsync === 'function') {
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    }

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: 'due_reminder', dueId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      }).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Cancel scheduled notification for a specific due item
 */
export const cancelDueReminder = async (dueId: string): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    if (typeof Notifications.cancelScheduledNotificationAsync === 'function') {
      await Notifications.cancelScheduledNotificationAsync(`due_reminder_${dueId}`).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Trigger immediate budget warning notification
 */
export const triggerBudgetWarning = async (
  spentAmount: number,
  totalBudget: number,
  percent: number
): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const settings = await getNotificationSettings();
    if (!settings.budgetEnabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const isExceeded = percent >= 100;
    const title = isExceeded ? '⚠️ বাজেট ১০০% অতিক্রম করেছে!' : '🟡 বাজেটের ৮০% খরচ হয়ে গেছে!';
    const body = isExceeded
      ? `আপনার নির্ধারিত বাজেট ৳${totalBudget.toLocaleString()} এর বিপরীতে মোট ৳${spentAmount.toLocaleString()} খরচ হয়েছে।`
      : `আপনার নির্ধারিত বাজেট ৳${totalBudget.toLocaleString()} এর মধ্যে ৳${spentAmount.toLocaleString()} (${Math.round(percent)}%) ইতিমধ্যেই খরচ হয়ে গেছে।`;

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'budget_warning' },
          sound: true,
        },
        trigger: null, // Trigger immediately
      }).catch(() => {});
    }
  } catch (e) {}
};

/**
 * Register device for Expo Push Notifications and save token
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    let token: string | null = null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

    if (Notifications && typeof Notifications.getExpoPushTokenAsync === 'function') {
      const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);
      if (tokenData && tokenData.data) {
        token = tokenData.data;
      }
    }

    // Fallback device token for Expo Go / Local Development Testing so DB gets populated
    if (!token) {
      const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (storedToken) {
        token = storedToken;
      } else {
        token = `ExponentPushToken[dev_test_${(Device.modelName || 'device').replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 8)}]`;
      }
    }

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
    }
    return token;
  } catch (e) {
    console.warn('Error getting push token:', e);
  }
  return null;
};

/**
 * Schedule a 5-second delayed test notification for physical device testing
 */
export const scheduleFiveSecondTestNotification = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !Notifications) return false;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'আজকের হিসাব লিখেছেন তো? 📝',
          body: 'আপনার দৈনন্দিন আয়-ব্যয়ের সঠিক হিসাব রাখতে এখনই এন্ট্রি করুন।',
          data: { type: 'test' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      }).catch(() => {});
      return true;
    }
  } catch (e) {}
  return false;
};

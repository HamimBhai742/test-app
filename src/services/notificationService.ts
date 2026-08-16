import { Platform, Alert, DeviceEventEmitter } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage } from '@/context/LanguageContext';

// Safe dynamic require for expo-notifications to prevent Expo Go SDK 53+ Android crashes
let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
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

    const lang = getCurrentLanguage();
    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_REMINDER_ID,
        content: {
          title: lang === 'bn' ? 'আজকের হিসাব লিখেছেন তো? 📝' : 'Did you record your expenses today? 📝',
          body: lang === 'bn' ? 'আপনার দৈনন্দিন আয়-ব্যয়ের সঠিক হিসাব রাখতে এখনই এন্ট্রি করুন।' : 'Keep your daily income and expense records updated, log them now.',
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
    const lang = getCurrentLanguage();
    let title = '';
    let body = '';
    if (lang === 'bn') {
      title = isReceivable ? 'পাওনা টাকা পরিশোধের তাগাদা 💰' : 'দেনা পরিশোধের সময়সূচি ⚠️';
      body = isReceivable
        ? `${personName}-এর কাছে ৳${amount.toLocaleString()} পাওনার আজ শেষ তারিখ।`
        : `${personName}-কে ৳${amount.toLocaleString()} পরিশোধের আজ শেষ তারিখ।`;
    } else {
      title = isReceivable ? 'Receivable Due Reminder 💰' : 'Payable Due Deadline ⚠️';
      body = isReceivable
        ? `Today is the deadline to receive ৳${amount.toLocaleString()} from ${personName}.`
        : `Today is the deadline to pay ৳${amount.toLocaleString()} to ${personName}.`;
    }

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
 * Save notification to AsyncStorage and notify active context listeners
 */
const saveNotificationLocallyAndNotify = async (
  title: string,
  body: string,
  type: 'daily' | 'due' | 'budget' | 'info' = 'info'
) => {
  try {
    const id = Math.random().toString();
    const newNotif = {
      id,
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    const stored = await AsyncStorage.getItem('hisabkitab_saved_notifications');
    const list = stored ? JSON.parse(stored) : [];
    list.unshift(newNotif);
    await AsyncStorage.setItem('hisabkitab_saved_notifications', JSON.stringify(list));
    DeviceEventEmitter.emit('new_in_app_notification', newNotif);
  } catch (e) {
    console.warn('Error saving local notification:', e);
  }
};

/**
 * Trigger immediate budget warning notification
 */
export const triggerBudgetWarning = async (
  spentAmount: number,
  totalBudget: number,
  percent: number,
  categoryName?: string
): Promise<void> => {
  const isExceeded = percent >= 100;
  const lang = getCurrentLanguage();
  let title = '';
  let body = '';

  if (lang === 'bn') {
    const categoryPrefix = categoryName ? `"${categoryName}" ক্যাটাগরির ` : 'আপনার নির্ধারিত ';
    if (isExceeded) {
      title = `⚠️ ${categoryName ? `"${categoryName}" ` : ''}বজেট ১০০% অতিক্রম করেছে!`;
      body = `${categoryPrefix}বজেট ৳${totalBudget.toLocaleString()} এর বিপরীতে মোট ৳${spentAmount.toLocaleString()} খরচ হয়েছে।`;
    } else if (percent >= 90) {
      title = `🟠 ${categoryName ? `"${categoryName}" ` : ''}বাজেটের ৯০% খরচ হয়ে গেছে!`;
      body = `${categoryPrefix}বজেট ৳${totalBudget.toLocaleString()} এর মধ্যে ৳${spentAmount.toLocaleString()} (${Math.round(percent)}%) ইতিমধ্যেই খরচ হয়ে গেছে।`;
    } else {
      title = `🟡 ${categoryName ? `"${categoryName}" ` : ''}বাজেটের ৮০% খরচ হয়ে গেছে!`;
      body = `${categoryPrefix}বজেট ৳${totalBudget.toLocaleString()} এর মধ্যে ৳${spentAmount.toLocaleString()} (${Math.round(percent)}%) ইতিমধ্যেই খরচ হয়ে গেছে।`;
    }
  } else {
    const categoryPrefix = categoryName ? `"${categoryName}" category ` : 'Your set ';
    if (isExceeded) {
      title = `⚠️ ${categoryName ? `"${categoryName}" ` : ''}Budget exceeded 100%!`;
      body = `${categoryPrefix}budget of ৳${totalBudget.toLocaleString()} has been exceeded by spent amount of ৳${spentAmount.toLocaleString()}.`;
    } else if (percent >= 90) {
      title = `🟠 ${categoryName ? `"${categoryName}" ` : ''}90% of budget spent!`;
      body = `৳${spentAmount.toLocaleString()} (${Math.round(percent)}%) out of ৳${totalBudget.toLocaleString()} of ${categoryPrefix}budget has already been spent.`;
    } else {
      title = `🟡 ${categoryName ? `"${categoryName}" ` : ''}80% of budget spent!`;
      body = `৳${spentAmount.toLocaleString()} (${Math.round(percent)}%) out of ৳${totalBudget.toLocaleString()} of ${categoryPrefix}budget has already been spent.`;
    }
  }

  // Save notification locally for the Notification Box
  await saveNotificationLocallyAndNotify(title, body, 'budget');

  // Show native alert immediately if app is in foreground
  if (Platform.OS !== 'web') {
    Alert.alert(title, body);
  }

  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const settings = await getNotificationSettings();
    if (!settings.budgetEnabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'budget_warning', categoryName },
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

    // Get native device push token (FCM/APNs) to support direct Firebase Admin messaging on the server
    // Restrict to Android as iOS requires native Firebase library setup to use FCM tokens, otherwise returns raw APNs tokens
    if (Platform.OS === 'android' && Notifications && typeof Notifications.getDevicePushTokenAsync === 'function') {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync().catch(() => null);
      if (deviceTokenData && deviceTokenData.data) {
        token = deviceTokenData.data;
      }
    } else if (Platform.OS === 'ios') {
      console.warn('iOS detected: Direct Firebase Admin Messaging requires native Firebase configuration. Using Expo Push Token fallback.');
    }

    // Secondary fallback to Expo Push Token if native FCM token is not returned (e.g. inside Expo Go)
    if (!token && Notifications && typeof Notifications.getExpoPushTokenAsync === 'function') {
      const expoTokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);
      if (expoTokenData && expoTokenData.data) {
        token = expoTokenData.data;
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
  const lang = getCurrentLanguage();
  const title = lang === 'bn' ? 'আজকের হিসাব লিখেছেন তো? 📝' : 'Did you record your expenses today? 📝';
  const body = lang === 'bn' ? 'আপনার দৈনন্দিন আয়-ব্যয়ের সঠিক হিসাব রাখতে এখনই এন্ট্রি করুন।' : 'Keep your daily income and expense records updated, log them now.';

  // Save local notification after 5 seconds to match OS timing
  setTimeout(async () => {
    await saveNotificationLocallyAndNotify(title, body, 'daily');
  }, 5000);

  if (Platform.OS === 'web' || !Notifications) return true; // Fallback to local box only if notifications are disabled/web

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return true;

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'test' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      }).catch(() => {});
    }
  } catch (e) {}
  return true;
};

/**
 * Trigger push notification when reward points are successfully claimed
 */
export const triggerPointsNotification = async (
  pointsClaimed: number,
  type: 'login' | 'transaction' | 'goal' | 'welcome'
): Promise<void> => {
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const settings = await getNotificationSettings();
    if (!settings.dailyEnabled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const lang = getCurrentLanguage();
    let title = lang === 'bn' ? 'রিওয়ার্ড পয়েন্ট যুক্ত হয়েছে! 🎉' : 'Reward points added! 🎉';
    let body = '';

    if (lang === 'bn') {
      if (type === 'login') {
        body = `দৈনিক অ্যাপ ওপেন করার জন্য +${pointsClaimed} পয়েন্ট সফলভাবে ক্লেইম করা হয়েছে।`;
      } else if (type === 'transaction') {
        body = `দৈনিক হিসাব সংরক্ষণ করার জন্য +${pointsClaimed} পয়েন্ট সফলভাবে ক্লেইম করা হয়েছে।`;
      } else if (type === 'welcome') {
        title = 'স্বাগতম বোনাস পয়েন্ট! 🎁';
        body = `নতুন ইউজার হিসেবে +${pointsClaimed} পয়েন্ট আপনার ওয়ালেটে যোগ করা হয়েছে।`;
      } else {
        body = `লক্ষ্য অর্জন করার জন্য +${pointsClaimed} পয়েন্ট সফলভাবে ক্লেইম করা হয়েছে।`;
      }
    } else {
      if (type === 'login') {
        body = `+${pointsClaimed} points successfully claimed for opening the app today.`;
      } else if (type === 'transaction') {
        body = `+${pointsClaimed} points successfully claimed for recording a transaction today.`;
      } else if (type === 'welcome') {
        title = 'Welcome Bonus Points! 🎁';
        body = `+${pointsClaimed} welcome bonus points added to your wallet.`;
      } else {
        body = `+${pointsClaimed} points successfully claimed for achieving your savings goal.`;
      }
    }

    // Save notification locally for the Notification Box
    await saveNotificationLocallyAndNotify(title, body, 'daily');

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'points_claim', pointsClaimed },
          sound: true,
        },
        trigger: null, // Trigger immediately
      }).catch(() => {});
    }
  } catch (e) {}
};

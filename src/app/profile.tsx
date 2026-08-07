import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  Switch,
  Linking,
  Text,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { GOOGLE_CLIENT_ID } from '@/constants/config';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import * as ImagePicker from 'expo-image-picker';
import { OnboardingScreen } from '@/components/onboarding';
import { useSecurity } from '@/context/SecurityContext';
import { usePoints } from '@/context/PointsContext';
import LeaderboardScreen from './leaderboard';
import InvestmentScreen from '@/components/InvestmentScreen';
import GoalScreen from '@/components/GoalScreen';
import {
  getNotificationSettings,
  saveNotificationSettings,
  registerForPushNotificationsAsync,
  scheduleFiveSecondTestNotification,
  NotificationSettings,
} from '@/services/notificationService';
import { useNotificationBanner } from '@/context/NotificationBannerContext';

let GoogleSignin: any = null;
let statusCodes: any = {};
try {
  const gModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gModule.GoogleSignin;
  statusCodes = gModule.statusCodes || {};
  if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_ID,
      offlineAccess: false,
    });
  }
} catch (e) {
  // Expo Go safe fallback
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { showNotification } = useNotificationBanner();
  const { themeMode, setThemeMode } = useThemeMode();
  const { user, isLoading, login, register, verifyOtp, resendOtp, loginWithGoogle, updateProfile, uploadAvatarImage, logout } = useAuth();
  
  // Custom Auth State to support login/signup & OTP
  const { transactions, totalBalance, totalIncome, totalExpenses, deleteTransaction, deleteAllTransactions } = useTransactions();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authStep, setAuthStep] = useState<'auth' | 'otp'>('auth');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  const { isPinSet, isLockEnabled, isBiometricEnabled, setupPin, verifyPin, toggleLock, toggleBiometrics, autoLockDelay, updateAutoLockDelay, lockApp } = useSecurity();

  // Security PIN Modal states
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinStep, setPinStep] = useState<'verify_old' | 'create' | 'confirm' | 'disable'>('create');
  const [pinInputTemp, setPinInputTemp] = useState<string>('');
  const [firstPin, setFirstPin] = useState<string>('');
  const [pinModalError, setPinModalError] = useState<string>('');

  // PIN Input Animation variables
  const modalShakeAnim = React.useRef(new Animated.Value(0)).current;
  const modalCellScales = React.useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;
  const pinTextInputRef = React.useRef<any>(null);

  const triggerModalShake = () => {
    Animated.sequence([
      Animated.timing(modalShakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(modalShakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(modalShakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(modalShakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(modalShakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(modalShakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(modalShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const animateModalCell = (index: number) => {
    Animated.sequence([
      Animated.timing(modalCellScales[index], { toValue: 1.35, duration: 70, useNativeDriver: true }),
      Animated.spring(modalCellScales[index], { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  // Info Modals (About, Contact, Privacy, Google Auth, Leaderboard)
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [showLeaderboardPage, setShowLeaderboardPage] = useState<boolean>(false);
  const [showInvestmentPage, setShowInvestmentPage] = useState<boolean>(false);
  const [showGoalPage, setShowGoalPage] = useState<boolean>(false);

  // Points & Rewards Context
  const { points, userBadge, dailyLoginEarnedToday, dailyTxEarnedToday, getLeaderboard } = usePoints();

  // Notification Settings State
  const [showTimePickerModal, setShowTimePickerModal] = useState<boolean>(false);
  const [customHour, setCustomHour] = useState<number>(9);
  const [customMinute, setCustomMinute] = useState<number>(0);
  const [customAmPm, setCustomAmPm] = useState<'AM' | 'PM'>('PM');
  const [timePickerTab, setTimePickerTab] = useState<'hour' | 'minute'>('hour');
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    dailyEnabled: true,
    dailyHour: 21,
    dailyMinute: 0,
    dueEnabled: true,
    budgetEnabled: true,
  });

  useEffect(() => {
    getNotificationSettings().then(setNotifSettings);
    registerForPushNotificationsAsync();
  }, []);

  // Google Modal Inputs
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('mdhamim5088@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState<string>('Hamim Ahmed');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP States
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // UI Toggle & Feedback States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [errors, setErrors] = useState<{name?: string, email?: string, password?: string, confirm?: string}>({});

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [isUploadingCloudinary, setIsUploadingCloudinary] = useState(false);
  const [editError, setEditError] = useState('');

  // Floating Toast Notification State
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=256&auto=format&fit=crop',
  ];

  // Device Image Gallery Picker & Cloudinary Uploader
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setEditError('ছবি সিলেক্ট করতে ফাইল/গ্যালারির পারমিশন প্রয়োজন');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setEditAvatar(asset.uri); // Optimistic immediate preview
        setIsUploadingCloudinary(true);
        setEditError('');

        const uploadRes = await uploadAvatarImage(base64Data);
        setIsUploadingCloudinary(false);

        if (uploadRes.success && uploadRes.url) {
          setEditAvatar(uploadRes.url);
          showToast(t.uploadSuccess, 'success');
        } else {
          setEditError('Cloudinary-তে ছবি সেভ করা সম্ভব হয়নি। আবার চেষ্টা করুন।');
        }
      }
    } catch (e: any) {
      console.error('Image picker error:', e);
      setIsUploadingCloudinary(false);
      setEditError('গ্যালারি থেকে ছবি আপলোড করতে সমস্যা হয়েছে');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditError(t.valNameRequired);
      return;
    }
    setEditLoading(true);
    setEditError('');
    const res = await updateProfile({
      name: editName.trim(),
      avatar: editAvatar.trim(),
    });
    setEditLoading(false);
    if (res.success) {
      setShowEditModal(false);
      showToast(t.profileUpdateSuccess, 'success');
    } else {
      setEditError(res.message || t.profileUpdateError);
    }
  };

  // Resend Timer countdown
  React.useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Password strength helper for sign up
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (pass.length >= 10 && /[^A-Za-z0-9]/.test(pass)) score++;

    if (score === 1) return { score: 1, label: t.passWeak, color: '#EF4444' };
    if (score === 2) return { score: 2, label: t.passMedium, color: '#F59E0B' };
    return { score: 3, label: t.passStrong, color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Email authentication (Sign In & Sign Up) handler
  const handleEmailAuth = async () => {
    setAuthError('');
    setAuthSuccessMsg('');
    const newErrors: typeof errors = {};

    if (authMode === 'signup') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        newErrors.name = t.valNameRequired;
      }
    }

    if (!email.trim()) {
      newErrors.email = t.valEmailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = t.valEmailInvalid;
    }

    if (!password.trim()) {
      newErrors.password = t.valPasswordRequired;
    } else if (password.length < 6) {
      newErrors.password = t.valPasswordMin;
    }

    if (authMode === 'signup') {
      if (!confirmPassword.trim()) {
        newErrors.confirm = t.valConfirmRequired;
      } else if (password !== confirmPassword) {
        newErrors.confirm = t.valConfirmMatch;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    if (authMode === 'login') {
      const res = await login(email.trim(), password);
      if (!res.success) {
        if (res.message === 'NETWORK_ERROR') {
          setAuthError(t.errNetworkFail);
        } else if (res.message?.includes('already exists')) {
          setAuthError(t.errUserExists);
        } else if (res.message?.includes('does not exist')) {
          setAuthError(t.errUserNotFound);
        } else if (res.message?.includes('Invalid credentials')) {
          setAuthError(t.errInvalidCreds);
        } else if (res.message?.includes('blocked') || res.message?.includes('inactive')) {
          setAuthError(t.errAccountBlocked);
        } else if (res.message?.includes('Password is not set')) {
          setAuthError(t.errGooglePassNotSet);
        } else {
          setAuthError(res.message || (language === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
        }
      }
    } else {
      const res = await register(fullName.trim(), email.trim(), password);
      if (res.success && res.requireOtp) {
        setPendingEmail(res.email || email.trim());
        setAuthStep('otp');
        setResendTimer(30);
        setOtpInput('');
        setAuthError('');
        setAuthSuccessMsg('');
      } else {
        if (res.message === 'NETWORK_ERROR') {
          setAuthError(t.errNetworkFail);
        } else if (res.message?.includes('already exists')) {
          setAuthError(t.errUserExists);
        } else {
          setAuthError(res.message || (language === 'bn' ? 'সাইন আপ ব্যর্থ হয়েছে' : 'Registration failed'));
        }
      }
    }
  };

  // OTP Verification Handler
  const handleVerifyOtp = async () => {
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setAuthError(t.valOtpRequired);
      return;
    }
    setAuthError('');
    setAuthSuccessMsg('');
    const res = await verifyOtp(pendingEmail, otpInput.trim());
    if (!res.success) {
      if (res.message === 'NETWORK_ERROR') {
        setAuthError(t.errNetworkFail);
      } else if (res.message?.includes('Invalid OTP') || res.message?.includes('expired')) {
        setAuthError(t.otpInvalid);
      } else {
        setAuthError(res.message || t.otpInvalid);
      }
    }
  };

  // Resend OTP Handler
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setAuthError('');
    setAuthSuccessMsg('');
    const res = await resendOtp(pendingEmail);
    if (res.success) {
      setResendTimer(30);
      setAuthSuccessMsg(t.otpResent);
    } else {
      setAuthError(res.message || 'Resend failed');
    }
  };

  // Safe Google Login Handler
  const handleGoogleAuth = async () => {
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      if (Platform.OS !== 'web' && GoogleSignin && typeof GoogleSignin.hasPlayServices === 'function') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        // Force account chooser by clearing cached sign-in state first
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          // Ignore errors when not signed in
        }
        const userInfo: any = await GoogleSignin.signIn();
        const userEmail = userInfo.data?.user?.email || userInfo.user?.email;
        const userName = userInfo.data?.user?.name || userInfo.user?.name;
        const userAvatar = userInfo.data?.user?.photo || userInfo.user?.photo;
        const idToken = userInfo.data?.idToken || userInfo.idToken;

        if (userEmail) {
          const res = await loginWithGoogle({
            idToken: idToken || undefined,
            email: userEmail,
            name: userName || 'Google User',
            avatar: userAvatar || undefined,
          });
          if (res.success) {
            showToast('গুগল অ্যাকাউন্ট দিয়ে সফলভাবে প্রবেশ করেছেন! ✨', 'success');
          } else {
            setAuthError(res.message || t.errGoogleFailed);
          }
          return;
        }
      }
      setShowGoogleModal(true);
    } catch (error: any) {
      console.warn('Google Sign-in Error Details:', error);
      if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
        setAuthError('গুগল সাইন-ইন বাতিল করা হয়েছে (Sign In Cancelled)');
      } else {
        setShowGoogleModal(true);
      }
    }
  };

  const handleConfirmGoogleAuth = async () => {
    if (!googleEmailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googleEmailInput.trim())) {
      setAuthError('সঠিক গুগল ইমেইল অ্যাড্রেস দিন');
      return;
    }
    setAuthError('');
    setShowGoogleModal(false);
    const res = await loginWithGoogle({
      email: googleEmailInput.trim(),
      name: googleNameInput.trim() || 'Google User',
    });
    if (res.success) {
      showToast('গুগল সাইন-ইন সফল হয়েছে! ✨', 'success');
    } else {
      setAuthError(res.message || t.errGoogleFailed);
    }
  };

  // Reset password simulation
  const handleSendReset = async () => {
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotMsg(t.valEmailInvalid);
      return;
    }
    setForgotLoading(true);
    setForgotMsg('');
    setTimeout(() => {
      setForgotLoading(false);
      setForgotMsg(t.resetLinkSent);
    }, 1000);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hisab_kitab_transactions.json';
      link.click();
      URL.revokeObjectURL(url);
      alert(t.exportSuccess);
    } else {
      Alert.alert(t.exportSuccess, dataStr.substring(0, 300) + '...');
    }
  };

  const handleResetData = () => {
    const confirmAction = async () => {
      await deleteAllTransactions();
      if (Platform.OS === 'web') {
        alert(t.resetSuccess);
      } else {
        Alert.alert(t.resetSuccess);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(t.resetConfirmMsg)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        t.resetConfirmTitle,
        t.resetConfirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Delete', style: 'destructive', onPress: confirmAction },
        ]
      );
    }
  };

  const handleSupport = () => {
    if (Platform.OS === 'web') {
      alert(t.supportMsg);
    } else {
      Alert.alert(t.helpSupport, t.supportMsg);
    }
  };

  const handleOpenTimePicker = () => {
    const h24 = notifSettings.dailyHour;
    const m = notifSettings.dailyMinute;
    const isPm = h24 >= 12;
    const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
    setCustomHour(h12);
    setCustomMinute(m);
    setCustomAmPm(isPm ? 'PM' : 'AM');
    setTimePickerTab('hour');
    setShowTimePickerModal(true);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (confirm(t.logoutConfirmMsg)) {
        logout();
      }
    } else {
      Alert.alert(
        t.logoutConfirmTitle,
        t.logoutConfirmMsg,
        [
          { text: t.cancelBtn, style: 'cancel' },
          { text: t.confirmLogoutBtn, style: 'destructive', onPress: logout },
        ]
      );
    }
  };

  // Sign In / Sign Up Interface
  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.loginCardContainer}>
                {/* Brand Header */}
                <View style={styles.brandContainer}>
                  <View style={[styles.logoBadge, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText style={styles.logoBadgeText}>📊</ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={styles.brandName}>
                    হিসাব কিতাব
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Daily Expense Tracker
                  </ThemedText>
                </View>

                {/* Main Auth Form Card */}
                {authStep === 'otp' ? (
                  <View style={[styles.loginCard, { backgroundColor: theme.backgroundElement }]}>
                    <TouchableOpacity
                      style={styles.otpBackBtn}
                      onPress={() => { setAuthStep('auth'); setAuthError(''); setAuthSuccessMsg(''); }}
                    >
                      <ThemedText style={{ color: '#3b82f6', fontSize: 13, fontWeight: 'bold' }}>
                        {t.changeEmailBtn}
                      </ThemedText>
                    </TouchableOpacity>

                    <ThemedText type="subtitle" style={[styles.brandName, { marginTop: Spacing.two }]}>
                      {t.otpTitle}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.formSubtitle}>
                      {t.otpSubtitle}{'\n'}
                      <ThemedText type="smallBold" style={{ color: theme.text }}>{pendingEmail}</ThemedText>
                    </ThemedText>

                    {/* Success Banner */}
                    {authSuccessMsg ? (
                      <View style={styles.successContainer}>
                        <ThemedText type="smallBold" style={styles.successText}>✅ {authSuccessMsg}</ThemedText>
                      </View>
                    ) : null}

                    {/* Error Banner */}
                    {authError ? (
                      <View style={styles.errorContainer}>
                        <ThemedText type="code" style={styles.errorText}>⚠️ {authError}</ThemedText>
                      </View>
                    ) : null}

                    {/* Form Fields */}
                    <View style={styles.formContainer}>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={[
                            styles.inputField,
                            {
                              color: theme.text,
                              backgroundColor: theme.background,
                              borderColor: authError ? '#EF4444' : '#3b82f6',
                              textAlign: 'center',
                              fontSize: 22,
                              letterSpacing: 8,
                              fontWeight: 'bold',
                            },
                          ]}
                          placeholder="123456"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otpInput}
                          onChangeText={(text) => {
                            setOtpInput(text);
                            if (authError) setAuthError('');
                          }}
                        />
                      </View>

                      {/* Verify Button */}
                      <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: '#3b82f6' }]}
                        onPress={handleVerifyOtp}
                        disabled={isLoading}
                        activeOpacity={0.9}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <ThemedText type="smallBold" style={styles.primaryButtonText}>
                            {t.verifyOtpBtn}
                          </ThemedText>
                        )}
                      </TouchableOpacity>

                      {/* Resend Section */}
                      <View style={styles.resendSection}>
                        {resendTimer > 0 ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {t.resendInPrefix} <ThemedText type="smallBold" style={{ color: '#3b82f6' }}>{resendTimer}s</ThemedText>
                          </ThemedText>
                        ) : (
                          <TouchableOpacity onPress={handleResendOtp}>
                            <ThemedText type="smallBold" style={{ color: '#3b82f6' }}>
                              🔄 {t.resendOtpBtn}
                            </ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.loginCard, { backgroundColor: theme.backgroundElement }]}>
                    {/* Segment Tab Switcher */}
                    <View style={[styles.tabBar, { backgroundColor: theme.backgroundSelected }]}>
                      <TouchableOpacity
                        style={[
                          styles.tabItem,
                          authMode === 'login' && { backgroundColor: theme.background, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
                        ]}
                        onPress={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); setErrors({}); }}
                      >
                        <ThemedText type="smallBold" style={{ color: authMode === 'login' ? theme.text : theme.textSecondary }}>
                          {t.loginTab}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.tabItem,
                          authMode === 'signup' && { backgroundColor: theme.background, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
                        ]}
                        onPress={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccessMsg(''); setErrors({}); }}
                      >
                        <ThemedText type="smallBold" style={{ color: authMode === 'signup' ? theme.text : theme.textSecondary }}>
                          {t.signupTab}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    <ThemedText type="small" themeColor="textSecondary" style={styles.formSubtitle}>
                      {t.subtitle}
                    </ThemedText>

                    {/* Success Banner */}
                    {authSuccessMsg ? (
                      <View style={styles.successContainer}>
                        <ThemedText type="smallBold" style={styles.successText}>✅ {authSuccessMsg}</ThemedText>
                      </View>
                    ) : null}

                    {/* Error Banner */}
                    {authError ? (
                      <View style={styles.errorContainer}>
                        <ThemedText type="code" style={styles.errorText}>⚠️ {authError}</ThemedText>
                      </View>
                    ) : null}

                    {/* Form Fields */}
                    <View style={styles.formContainer}>
                      {authMode === 'signup' && (
                        <View style={styles.inputWrapper}>
                          <ThemedText type="smallBold" style={[styles.inputLabel, errors.name && { color: '#EF4444' }]}>
                            {t.nameLabel}
                          </ThemedText>
                          <TextInput
                            style={[
                              styles.inputField,
                              {
                                color: theme.text,
                                backgroundColor: theme.background,
                                borderColor: errors.name ? '#EF4444' : focusedInput === 'name' ? '#3b82f6' : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                            placeholder="Ex: Hamim Ahmed"
                            placeholderTextColor={theme.textSecondary}
                            value={fullName}
                            onChangeText={(text) => {
                              setFullName(text);
                              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                            onFocus={() => setFocusedInput('name')}
                            onBlur={() => setFocusedInput(null)}
                          />
                          {errors.name && (
                            <ThemedText style={styles.inlineErrorText}>⚠️ {errors.name}</ThemedText>
                          )}
                        </View>
                      )}

                      <View style={styles.inputWrapper}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, errors.email && { color: '#EF4444' }]}>
                          {t.emailLabel}
                        </ThemedText>
                        <TextInput
                          style={[
                            styles.inputField,
                            {
                              color: theme.text,
                              backgroundColor: theme.background,
                              borderColor: errors.email ? '#EF4444' : focusedInput === 'email' ? '#3b82f6' : 'rgba(0,0,0,0.05)',
                            },
                          ]}
                          placeholder="example@mail.com"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={email}
                          onChangeText={(text) => {
                            setEmail(text);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                          }}
                          onFocus={() => setFocusedInput('email')}
                          onBlur={() => setFocusedInput(null)}
                        />
                        {errors.email && (
                          <ThemedText style={styles.inlineErrorText}>⚠️ {errors.email}</ThemedText>
                        )}
                      </View>

                      <View style={styles.inputWrapper}>
                        <View style={styles.passwordLabelRow}>
                          <ThemedText type="smallBold" style={[styles.inputLabel, errors.password && { color: '#EF4444' }]}>
                            {t.passwordLabel}
                          </ThemedText>
                          {authMode === 'login' && (
                            <TouchableOpacity onPress={() => { setForgotEmail(email); setForgotMsg(''); setShowForgotModal(true); }}>
                              <ThemedText type="code" style={styles.forgotText}>
                                {t.forgotPassword}
                              </ThemedText>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.passwordContainer}>
                          <TextInput
                            style={[
                              styles.inputField,
                              {
                                flex: 1,
                                color: theme.text,
                                backgroundColor: theme.background,
                                borderColor: errors.password ? '#EF4444' : focusedInput === 'password' ? '#3b82f6' : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                            placeholder="••••••••"
                            placeholderTextColor={theme.textSecondary}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={(text) => {
                              setPassword(text);
                              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                            }}
                            onFocus={() => setFocusedInput('password')}
                            onBlur={() => setFocusedInput(null)}
                          />
                          <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                          >
                            <ThemedText style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🙈'}</ThemedText>
                          </TouchableOpacity>
                        </View>

                      {/* Password Strength Meter (Sign Up Only) */}
                      {authMode === 'signup' && password.length > 0 && (
                        <View style={styles.strengthContainer}>
                          <View style={styles.strengthBarsRow}>
                            <View style={[styles.strengthBar, { backgroundColor: passwordStrength.score >= 1 ? passwordStrength.color : '#E5E7EB' }]} />
                            <View style={[styles.strengthBar, { backgroundColor: passwordStrength.score >= 2 ? passwordStrength.color : '#E5E7EB' }]} />
                            <View style={[styles.strengthBar, { backgroundColor: passwordStrength.score >= 3 ? passwordStrength.color : '#E5E7EB' }]} />
                          </View>
                          <ThemedText type="code" style={{ fontSize: 11, color: passwordStrength.color, fontWeight: 'bold' }}>
                            {t.passStrengthLabel} {passwordStrength.label}
                          </ThemedText>
                        </View>
                      )}

                      {errors.password && (
                        <ThemedText style={styles.inlineErrorText}>⚠️ {errors.password}</ThemedText>
                      )}
                    </View>

                    {authMode === 'signup' && (
                      <View style={styles.inputWrapper}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, errors.confirm && { color: '#EF4444' }]}>
                          {t.confirmPasswordLabel}
                        </ThemedText>
                        <View style={styles.passwordContainer}>
                          <TextInput
                            style={[
                              styles.inputField,
                              {
                                flex: 1,
                                color: theme.text,
                                backgroundColor: theme.background,
                                borderColor: errors.confirm ? '#EF4444' : focusedInput === 'confirm' ? '#3b82f6' : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                            placeholder="••••••••"
                            placeholderTextColor={theme.textSecondary}
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={(text) => {
                              setConfirmPassword(text);
                              if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                            }}
                            onFocus={() => setFocusedInput('confirm')}
                            onBlur={() => setFocusedInput(null)}
                          />
                          <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            <ThemedText style={{ fontSize: 16 }}>{showConfirmPassword ? '👁️' : '🙈'}</ThemedText>
                          </TouchableOpacity>
                        </View>
                        {errors.confirm && (
                          <ThemedText style={styles.inlineErrorText}>⚠️ {errors.confirm}</ThemedText>
                        )}
                      </View>
                    )}

                    {/* Email Sign In/Up Button */}
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: '#3b82f6' }]}
                      onPress={handleEmailAuth}
                      disabled={isLoading}
                      activeOpacity={0.9}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ThemedText type="smallBold" style={styles.primaryButtonText}>
                          {authMode === 'login' ? t.loginBtn : t.signupBtn}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.line} />
                    <ThemedText type="code" themeColor="textSecondary" style={styles.dividerText}>
                      {t.orText}
                    </ThemedText>
                    <View style={styles.line} />
                  </View>

                  {/* Google Button - High fidelity using official developers.google.com PNG asset */}
                  <TouchableOpacity
                    style={[
                      styles.googleButton,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.background === '#ffffff' ? '#e2e8f0' : '#2e3035',
                      },
                    ]}
                    onPress={handleGoogleAuth}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                      <>
                        <Image
                          source={{
                            uri: 'https://developers.google.com/static/identity/images/g-logo.png',
                          }}
                          style={styles.googleIcon}
                          resizeMode="contain"
                        />
                        <ThemedText type="smallBold" style={[styles.googleButtonText, { color: theme.text }]}>
                          {t.googleBtn}
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                )}

                {/* Language Switch */}
                <TouchableOpacity
                  style={[styles.langToggle, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'))}
                >
                  <ThemedText type="small">🌐 Language: {t.currentLang}</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Google Account Selector Modal */}
          <Modal
            visible={showGoogleModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowGoogleModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowGoogleModal(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1 }]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>Google সাইন-ইন</ThemedText>
                  <TouchableOpacity onPress={() => setShowGoogleModal(false)} style={styles.modalCloseBtn}>
                    <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <Image
                    source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }}
                    style={{ width: 44, height: 44, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                  <ThemedText type="subtitle" style={{ fontSize: 18, fontWeight: '800' }}>
                    গুগল অ্যাকাউন্ট নির্বাচন করুন
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>
                    হিসাব কিতাব অ্যাপে প্রবেশ করতে আপনার গুগল অ্যাকাউন্ট তথ্য দিন:
                  </ThemedText>
                </View>

                <View style={{ gap: 12, marginVertical: 10 }}>
                  <View>
                    <ThemedText type="smallBold" style={{ fontSize: 12, marginBottom: 6 }}>গুগল ইমেইল (Google Email):</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                      placeholder="your.email@gmail.com"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={googleEmailInput}
                      onChangeText={setGoogleEmailInput}
                    />
                  </View>

                  <View>
                    <ThemedText type="smallBold" style={{ fontSize: 12, marginBottom: 6 }}>সম্পূর্ণ নাম (Full Name):</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                      placeholder="Hamim Ahmed"
                      placeholderTextColor={theme.textSecondary}
                      value={googleNameInput}
                      onChangeText={setGoogleNameInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(32, 138, 239, 0.12)',
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(32, 138, 239, 0.3)',
                    }}
                    onPress={() => {
                      setGoogleEmailInput('mdhamim5088@gmail.com');
                      setGoogleNameInput('Hamim Ahmed');
                    }}
                  >
                    <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#208AEF' }}>mdhamim5088@gmail.com</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>Hamim Ahmed (গুগল ভেরিফাইড)</ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#208AEF', borderRadius: 16, marginTop: 10 }]}
                  onPress={handleConfirmGoogleAuth}
                >
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Google অ্যাকাউন্ট দিয়ে প্রবেশ করুন ➔
                  </ThemedText>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </SafeAreaView>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">{t.resetPassTitle}</ThemedText>
                <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                  <ThemedText style={{ fontSize: 18, color: theme.textSecondary }}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.three, marginTop: Spacing.one }}>
                {t.resetPassInstruction}
              </ThemedText>

              {forgotMsg ? (
                <View style={[styles.successContainer, { marginBottom: Spacing.three }]}>
                  <ThemedText type="smallBold" style={styles.successText}>{forgotMsg}</ThemedText>
                </View>
              ) : null}

              <TextInput
                style={[
                  styles.inputField,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: 'rgba(0,0,0,0.1)',
                    marginBottom: Spacing.three,
                  },
                ]}
                placeholder="example@mail.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={forgotEmail}
                onChangeText={setForgotEmail}
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#3b82f6', marginTop: 0 }]}
                onPress={handleSendReset}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    {t.sendResetLink}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ThemedView>
    );
  }

  // Render Full-Page Leaderboard
  if (showLeaderboardPage) {
    return <LeaderboardScreen onBack={() => setShowLeaderboardPage(false)} />;
  }

  // Render Full-Page Investment Screen
  if (showInvestmentPage) {
    return <InvestmentScreen onBack={() => setShowInvestmentPage(false)} />;
  }

  // Render Full-Page Goal Screen
  if (showGoalPage) {
    return <GoalScreen onBack={() => setShowGoalPage(false)} />;
  }

  // Profile View (When Logged In)
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Enhanced Profile Header with glowing background */}
          <View style={styles.profileHeader}>
            <View style={[styles.glowingBackground, { backgroundColor: theme.backgroundElement }]} />
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickImage}
              activeOpacity={0.85}
            >
              {(user.avatar || user.photo) ? (
                <Image source={{ uri: user.avatar || user.photo }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="subtitle" style={{ color: theme.text }}>
                    {user.name.charAt(0)}
                  </ThemedText>
                </View>
              )}

              {/* 📷 Camera Edit Badge */}
              <View style={styles.cameraBadgeContainer}>
                <ThemedText style={{ fontSize: 13, color: '#ffffff' }}>📷</ThemedText>
              </View>

              {/* Points Rank Badge display right on Profile Image */}
              <TouchableOpacity
                style={styles.pointsBadgeOverlay}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowLeaderboardPage(true);
                }}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.pointsBadgeOverlayText}>{userBadge}</ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setEditName(user.name);
                setEditAvatar(user.avatar || user.photo || '');
                setEditError('');
                setShowEditModal(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 2 }}
              activeOpacity={0.7}
            >
              <ThemedText type="subtitle" style={[styles.userName, { marginTop: 0 }]}>
                {user.name} 📝
              </ThemedText>
            </TouchableOpacity>

            <ThemedText type="small" themeColor="textSecondary" style={styles.userEmail}>
              {user.email}
            </ThemedText>

            {/* 🏆 Reward Points & Leaderboard Hero Banner */}
            <TouchableOpacity
              style={{
                width: '100%',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginTop: 16,
                borderWidth: 1.5,
                borderColor: 'rgba(234, 179, 8, 0.4)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() => setShowLeaderboardPage(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ThemedText style={{ fontSize: 28 }}>🏆</ThemedText>
                <View>
                  <ThemedText style={{ fontSize: 15, fontWeight: '800', color: '#EAB308' }}>
                    {t.rewardPointsLabel.replace('{points}', points.toString())}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    {t.badgeLabel.replace('{badge}', userBadge)}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Statistics Grid */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {t.statsHeader}
            </ThemedText>
            <View style={styles.headerIndicatorDot} />
          </View>

          <View style={styles.statsGrid}>
            {/* Total Balance */}
            <View style={[styles.statItem, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                💰 {t.totalBal}
              </ThemedText>
              <ThemedText
                style={[
                  styles.statValue,
                  { color: totalBalance >= 0 ? '#10B981' : '#EF4444', fontSize: 20 },
                ]}
              >
                TK {totalBalance.toLocaleString('en-US')}
              </ThemedText>
            </View>

            {/* Total Transactions */}
            <View style={[styles.statItem, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                📝 {t.totalTx}
              </ThemedText>
              <ThemedText style={[styles.statValue, { color: theme.text }]}>
                {transactions.length}
              </ThemedText>
            </View>

            {/* Total Income */}
            <View style={[styles.statItem, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                📈 {t.totalInc}
              </ThemedText>
              <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
                TK {totalIncome.toLocaleString('en-US')}
              </ThemedText>
            </View>

            {/* Total Expense */}
            <View style={[styles.statItem, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                📉 {t.totalExp}
              </ThemedText>
              <ThemedText style={[styles.statValue, { color: '#EF4444' }]}>
                TK {totalExpenses.toLocaleString('en-US')}
              </ThemedText>
            </View>
          </View>

          {/* 🔒 Card 1: Security & App Lock Section */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {t.securityTitle}
            </ThemedText>
            <View style={styles.headerIndicatorDot} />
          </View>

          <View style={[styles.actionsList, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.four }]}>
            {/* Security PIN Lock Toggle */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                if (!isPinSet) {
                  setPinStep('create');
                  setPinInputTemp('');
                  setFirstPin('');
                  setPinModalError('');
                  setShowPinModal(true);
                } else if (isLockEnabled) {
                  // Require PIN to disable
                  setPinStep('disable');
                  setPinInputTemp('');
                  setPinModalError('');
                  setShowPinModal(true);
                } else {
                  toggleLock(true);
                }
              }}
            >
              <ThemedText style={styles.actionIcon}>🔒</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.pinLockLabel}</ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={styles.actionValue}>
                  {isLockEnabled ? (language === 'bn' ? 'চালু' : 'Enabled') : (language === 'bn' ? 'বন্ধ' : 'Disabled')}
                </ThemedText>
              </View>
              <Switch
                value={isLockEnabled}
                onValueChange={(val) => {
                  if (val && !isPinSet) {
                    setPinStep('create');
                    setPinInputTemp('');
                    setFirstPin('');
                    setPinModalError('');
                    setShowPinModal(true);
                  } else if (!val && isLockEnabled) {
                    // Require PIN to disable
                    setPinStep('disable');
                    setPinInputTemp('');
                    setPinModalError('');
                    setShowPinModal(true);
                  } else {
                    toggleLock(val);
                  }
                }}
                trackColor={{ false: '#64748B', true: '#208AEF' }}
                thumbColor="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Change PIN Button (only if pin is set AND lock is enabled) */}
            {isPinSet && isLockEnabled && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    setPinStep('verify_old');
                    setPinInputTemp('');
                    setFirstPin('');
                    setPinModalError('');
                    setShowPinModal(true);
                  }}
                >
                  <ThemedText style={styles.actionIcon}>🔑</ThemedText>
                  <View style={styles.actionTextContainer}>
                    <ThemedText type="small">{t.changePinBtn}</ThemedText>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* Auto-Lock Delay Selector */}
            {isPinSet && isLockEnabled && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    const nextDelay = autoLockDelay === 'instant' ? '30s' : autoLockDelay === '30s' ? '1m' : 'instant';
                    updateAutoLockDelay(nextDelay);
                  }}
                >
                  <ThemedText style={styles.actionIcon}>⏱️</ThemedText>
                  <View style={styles.actionTextContainer}>
                    <ThemedText type="small">{t.autoLockDelayLabel}</ThemedText>
                    <ThemedText type="code" themeColor="textSecondary" style={styles.actionValue}>
                      {autoLockDelay === 'instant' ? t.delayInstant : autoLockDelay === '30s' ? t.delay30s : t.delay1m}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </>
            )}

          </View>

          {/* ⚙️ Card 2: App Preferences Section */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {t.settingsHeader}
            </ThemedText>
            <View style={styles.headerIndicatorDot} />
          </View>

          <View style={[styles.actionsList, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.four }]}>
            {/* 📈 Investment Option */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowInvestmentPage(true)}
            >
              <ThemedText style={styles.actionIcon}>📈</ThemedText>
              <View style={styles.actionTextContainer}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: '600' }}>{t.investmentTitle}</ThemedText>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {t.investmentSubtitle}
                  </Text>
                </View>
                <ThemedText style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 16 }}>→</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* 🎯 Goal Option */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowGoalPage(true)}
            >
              <ThemedText style={styles.actionIcon}>🎯</ThemedText>
              <View style={styles.actionTextContainer}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: '600' }}>{t.goalTitle}</ThemedText>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {t.goalSubtitle}
                  </Text>
                </View>
                <ThemedText style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 16 }}>→</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Language Switch */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'))}
            >
              <ThemedText style={styles.actionIcon}>🌐</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.languageText}</ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={styles.actionValue}>
                  {t.currentLang}
                </ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Theme Mode Switch */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setThemeMode((prev) => {
                  if (prev === 'light') return 'dark';
                  if (prev === 'dark') return 'system';
                  return 'light';
                });
              }}
            >
              <ThemedText style={styles.actionIcon}>
                {themeMode === 'dark' ? '🌙' : themeMode === 'light' ? '☀️' : '🌗'}
              </ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.themeText}</ThemedText>
                <ThemedText type="code" themeColor="textSecondary" style={styles.actionValue}>
                  {themeMode === 'dark' ? t.themeDark : themeMode === 'light' ? t.themeLight : t.themeSystem}
                </ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Export Transactions */}
            <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
              <ThemedText style={styles.actionIcon}>📤</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.exportData}</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          {/* 🔔 Card 3: Notification & Alert Settings Section */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {t.notificationSectionTitle}
            </ThemedText>
            <View style={styles.headerIndicatorDot} />
          </View>

          <View style={[styles.actionsList, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.four }]}>
            {/* Daily Accounting Reminder */}
            <View style={styles.actionRow}>
              <View style={[styles.notifBadge, { backgroundColor: '#3B82F61E' }]}>
                <Text style={styles.notifIcon}>📝</Text>
              </View>
              <View style={styles.notifTextContainer}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>{t.dailyReminderTitle}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.notifSubText}>
                  {t.dailyReminderSub}
                </ThemedText>
                {notifSettings.dailyEnabled && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleOpenTimePicker}
                    style={styles.timeBadgeContainer}
                  >
                    <Text style={styles.timeBadgeText}>
                      ⏰ {notifSettings.dailyHour > 12 ? notifSettings.dailyHour - 12 : notifSettings.dailyHour === 0 ? 12 : notifSettings.dailyHour}:{notifSettings.dailyMinute < 10 ? '0' : ''}{notifSettings.dailyMinute} {notifSettings.dailyHour >= 12 ? 'PM' : 'AM'} ✏️
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Switch
                value={notifSettings.dailyEnabled}
                onValueChange={(val) => {
                  saveNotificationSettings({ dailyEnabled: val }).then((updated) => {
                    setNotifSettings(updated);
                    if (val) {
                      handleOpenTimePicker();
                    }
                  });
                }}
                trackColor={{ false: theme.backgroundSelected, true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Due & Debt Alerts */}
            <View style={styles.actionRow}>
              <View style={[styles.notifBadge, { backgroundColor: '#F59E0B1E' }]}>
                <Text style={styles.notifIcon}>⏰</Text>
              </View>
              <View style={styles.notifTextContainer}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>{t.dueReminderTitle}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.notifSubText}>
                  {t.dueReminderSub}
                </ThemedText>
              </View>
              <Switch
                value={notifSettings.dueEnabled}
                onValueChange={(val) => {
                  saveNotificationSettings({ dueEnabled: val }).then(setNotifSettings);
                }}
                trackColor={{ false: theme.backgroundSelected, true: '#F59E0B' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Budget Threshold Warnings */}
            <View style={styles.actionRow}>
              <View style={[styles.notifBadge, { backgroundColor: '#EF44441E' }]}>
                <Text style={styles.notifIcon}>⚡</Text>
              </View>
              <View style={styles.notifTextContainer}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>{t.budgetWarningTitle}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.notifSubText}>
                  {t.budgetWarningSub}
                </ThemedText>
              </View>
              <Switch
                value={notifSettings.budgetEnabled}
                onValueChange={(val) => {
                  saveNotificationSettings({ budgetEnabled: val }).then(setNotifSettings);
                }}
                trackColor={{ false: theme.backgroundSelected, true: '#EF4444' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* ℹ️ Card 3: Help & Support Section */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {language === 'bn' ? 'তথ্য ও সহায়তা' : 'Help & Support'}
            </ThemedText>
            <View style={styles.headerIndicatorDot} />
          </View>

          <View style={[styles.actionsList, { backgroundColor: theme.backgroundElement }]}>
            {/* Help & Support (Contact Us) */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowContactModal(true)}>
              <ThemedText style={styles.actionIcon}>📞</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.contactTitle}</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* About Us */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowAboutModal(true)}>
              <ThemedText style={styles.actionIcon}>ℹ️</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.aboutTitle}</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Privacy Policy & Terms */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowPrivacyModal(true)}>
              <ThemedText style={styles.actionIcon}>📜</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.privacyTitle}</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Clear All Transactions */}
            <TouchableOpacity style={styles.actionRow} onPress={handleResetData}>
              <ThemedText style={styles.actionIcon}>🗑️</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small" style={{ color: '#EF4444' }}>
                  {t.resetData}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Sync status indicators */}
          <View style={styles.syncContainer}>
            <View style={styles.syncIndicator} />
            <ThemedText type="code" themeColor="textSecondary">
              {t.deviceSync}
            </ThemedText>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: '#fee2e2' }]}
            onPress={handleLogout}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <ThemedText type="smallBold" style={{ color: '#EF4444' }}>
                🛑 {t.logoutBtn}
              </ThemedText>
            )}
          </TouchableOpacity>

          <View style={{ height: BottomTabInset + 40 }} />
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">{t.editProfileTitle}</ThemedText>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <ThemedText style={{ fontSize: 20, color: theme.textSecondary }}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              {editError ? (
                <View style={[styles.feedbackBanner, { backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1 }]}>
                  <ThemedText style={{ color: '#dc2626', fontSize: 13, fontWeight: '500' }}>⚠️ {editError}</ThemedText>
                </View>
              ) : null}

              {/* Name Input */}
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 12, marginBottom: 6 }}>
                {t.nameLabel}
              </ThemedText>
              <TextInput
                style={[
                  styles.inputField,
                  { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected, marginBottom: 20 },
                ]}
                placeholder={t.nameLabel}
                placeholderTextColor={theme.textSecondary}
                value={editName}
                onChangeText={setEditName}
              />

              {/* Premium Redesigned Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveProfileButton,
                  { opacity: editLoading || isUploadingCloudinary ? 0.75 : 1 }
                ]}
                onPress={handleSaveProfile}
                disabled={editLoading || isUploadingCloudinary}
                activeOpacity={0.85}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ThemedText style={{ fontSize: 18, color: '#ffffff' }}>✓</ThemedText>
                    <ThemedText style={styles.saveProfileButtonText}>
                      {t.saveProfileBtn}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Setup PIN Modal */}
        <Modal
          visible={showPinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>
                  {pinStep === 'verify_old'
                    ? t.verifyOldPinPrompt
                    : pinStep === 'create'
                    ? t.setupPinPrompt
                    : pinStep === 'confirm'
                    ? t.confirmPinPrompt
                    : t.disablePinPrompt}
                </ThemedText>
                <TouchableOpacity onPress={() => setShowPinModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              {pinModalError ? (
                <View style={[styles.feedbackBanner, { backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1, marginBottom: 12 }]}>
                  <ThemedText style={{ color: '#dc2626', fontSize: 13, fontWeight: '500' }}>⚠️ {pinModalError}</ThemedText>
                </View>
              ) : null}

              {/* Custom Animated 4-Cell PIN Code Input Grid */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => pinTextInputRef.current?.focus()}
                style={{ width: '100%', marginVertical: 18 }}
              >
                <Animated.View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', transform: [{ translateX: modalShakeAnim }] }}>
                  {[0, 1, 2, 3].map((index) => {
                    const hasVal = pinInputTemp.length > index;
                    const isFocused = pinInputTemp.length === index;
                    return (
                      <Animated.View
                        key={index}
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          borderWidth: 2,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.backgroundElement,
                          borderColor: isFocused ? '#208AEF' : (hasVal ? '#208AEF' : theme.textSecondary + '33'),
                          transform: [{ scale: modalCellScales[index] }]
                        }}
                      >
                        {hasVal ? (
                          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.text }} />
                        ) : null}
                      </Animated.View>
                    );
                  })}
                </Animated.View>
              </TouchableOpacity>

              {/* Hidden text input to receive native keyboard entries */}
              <TextInput
                ref={pinTextInputRef}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                keyboardType="numeric"
                maxLength={4}
                value={pinInputTemp}
                onChangeText={(text) => {
                  const clean = text.replace(/[^0-9]/g, '');
                  if (clean.length > pinInputTemp.length) {
                    animateModalCell(pinInputTemp.length);
                  }
                  setPinInputTemp(clean);
                  setPinModalError('');
                }}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: pinStep === 'disable' ? '#EF4444' : '#208AEF', marginTop: 16 }]}
                onPress={async () => {
                  if (pinInputTemp.length !== 4) {
                    setPinModalError('৪ ডিজিটের পিন কোড দিন');
                    triggerModalShake();
                    if (Platform.OS !== 'web') Vibration.vibrate(250);
                    return;
                  }

                  if (pinStep === 'verify_old') {
                    const isValid = verifyPin(pinInputTemp);
                    if (isValid) {
                      setPinStep('create');
                      setPinInputTemp('');
                      setPinModalError('');
                    } else {
                      setPinModalError(t.wrongPinError);
                      triggerModalShake();
                      if (Platform.OS !== 'web') Vibration.vibrate(250);
                      setPinInputTemp('');
                    }
                    return;
                  }

                  if (pinStep === 'disable') {
                    const isValid = verifyPin(pinInputTemp);
                    if (isValid) {
                      await toggleLock(false);
                      setShowPinModal(false);
                      showToast(t.pinDisabledSuccess, 'success');
                    } else {
                      setPinModalError(t.wrongPinError);
                      triggerModalShake();
                      if (Platform.OS !== 'web') Vibration.vibrate(250);
                      setPinInputTemp('');
                    }
                    return;
                  }

                  if (pinStep === 'create') {
                    setFirstPin(pinInputTemp);
                    setPinInputTemp('');
                    setPinStep('confirm');
                  } else {
                    if (pinInputTemp !== firstPin) {
                      setPinModalError(t.wrongPinError);
                      triggerModalShake();
                      if (Platform.OS !== 'web') Vibration.vibrate(250);
                      setPinInputTemp('');
                      return;
                    }
                    const success = await setupPin(firstPin);
                    if (success) {
                      setShowPinModal(false);
                      showToast(t.pinSuccess, 'success');
                    }
                  }
                }}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {pinStep === 'verify_old'
                    ? (language === 'bn' ? 'যাচাই করুন ➔' : 'Verify PIN ➔')
                    : pinStep === 'create'
                    ? (language === 'bn' ? 'পরবর্তীধাপ ➔' : 'Next ➔')
                    : pinStep === 'confirm'
                    ? (language === 'bn' ? 'সেভ করুন ✓' : 'Save PIN ✓')
                    : (language === 'bn' ? 'লক বন্ধ করুন ✓' : 'Turn Off Lock ✓')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* About Us Modal */}
        <Modal
          visible={showAboutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAboutModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAboutModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>{t.aboutTitle}</ThemedText>
                <TouchableOpacity onPress={() => setShowAboutModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 14 }}>
                <ThemedText style={{ fontSize: 48 }}>📊</ThemedText>
                <ThemedText type="subtitle" style={{ fontSize: 20, fontWeight: '800', marginTop: 4 }}>
                  হিসাব কিতাব
                </ThemedText>
                <View style={{ backgroundColor: 'rgba(32, 138, 239, 0.15)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, marginTop: 8 }}>
                  <ThemedText style={{ color: '#208AEF', fontSize: 12, fontWeight: '700' }}>
                    {t.appVersionLabel}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 22, marginBottom: 16, textAlign: 'center' }}>
                {t.aboutDesc}
              </ThemedText>

              <ScrollView style={{ maxHeight: 220, backgroundColor: theme.background, borderRadius: 16, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.backgroundSelected }}>
                <ThemedText type="smallBold" style={{ fontSize: 13, marginBottom: 6 }}>⚡ আমাদের সেবাসমূহ (Our Services):</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 📊 **আয়-ব্যয় ট্র্যাকিং:** সহজে আয় ও খরচের হিসাব এন্ট্রি এবং ক্যাটাগরি অনুযায়ী পর্যবেক্ষণ।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 📝 **স্মার্ট বাজেট প্ল্যানার:** ক্যাটাগরি লিমিট সেট করে খরচ পূর্ণ নিয়ন্ত্রণে রাখার সুবিধা।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 🪙 **রিওয়ার্ড পয়েন্ট ও লিডারবোর্ড:** দৈনিক লগইন ও হিসাব লিখে রিওয়ার্ড কয়েন অর্জন এবং র‍্যাঙ্কিং লড়াই।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 🤝 **দেনা-পাওনার ডিজিটাল খাতা:** দেনা ও পাওনার হিসাব রাখা এবং ১-ক্লিকে WhatsApp রিমাইন্ডার পাঠানো।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 🎯 **সঞ্চয় লক্ষ্য (Savings Goals):** নিজের ভবিষ্যৎ লক্ষ্য নির্ধারণ করে সঞ্চয়ের অগ্রগতি ট্র্যাক করা।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 📈 **বিনিয়োগ ট্র্যাকার (Investments):** বিভিন্ন ব্যবসা বা প্রজেক্টে করা বিনিয়োগ এবং লাভ-ক্ষতি পর্যবেক্ষণ।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 📱 **মোবাইল SMS পার্সিং:** বিকাশ, নগদ ও ব্যাংক SMS থেকে অটোমেটিক ট্রানজেকশন এন্ট্রি।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 📄 **PDF স্টেটমেন্ট ও মেমো:** যেকোনো মাসের রিপোর্ট প্রফেশনাল মেমো বা শিট আকারে ডাউনলোড।</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 18, marginBottom: 4 }}>• 🔒 **উচ্চ নিরাপত্তা:** ক্লাউড ডেটা ব্যাকআপ ও বায়োমেট্রিক পিন লক সিকিউরিটি।</ThemedText>
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#208AEF', borderRadius: 16 }]}
                onPress={() => setShowAboutModal(false)}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  বন্ধ করুন ✓
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Contact Us Modal */}
        <Modal
          visible={showContactModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowContactModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowContactModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>{t.contactTitle}</ThemedText>
                <TouchableOpacity onPress={() => setShowContactModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 20, marginBottom: 18, marginTop: 8 }}>
                {t.contactSupportDesc}
              </ThemedText>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: theme.backgroundSelected,
                }}
                onPress={() => Linking.openURL('mailto:mdhamim5088@gmail.com').catch(() => {})}
              >
                <ThemedText style={{ fontSize: 26 }}>📩</ThemedText>
                <View>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11, fontWeight: '600' }}>{t.supportEmailLabel}</ThemedText>
                  <ThemedText style={{ color: '#208AEF', fontSize: 15, fontWeight: '800', marginTop: 2 }}>mdhamim5088@gmail.com</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 22,
                  borderWidth: 1.5,
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                }}
                onPress={() => Linking.openURL('https://wa.me/8801318398640?text=Hi%20Hisab%20Kitab%20Support').catch(() => {})}
              >
                <ThemedText style={{ fontSize: 26 }}>📲</ThemedText>
                <View>
                  <ThemedText style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>{t.supportPhoneLabel}</ThemedText>
                  <ThemedText style={{ color: '#10B981', fontSize: 15, fontWeight: '800', marginTop: 2 }}>+880 1318-398640</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#208AEF', borderRadius: 16 }]}
                onPress={() => setShowContactModal(false)}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  ঠিক আছে ✓
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Privacy Policy Modal */}
        <Modal
          visible={showPrivacyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPrivacyModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>{t.privacyTitle}</ThemedText>
                <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 320, marginVertical: 14 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 14 }}>
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    <ThemedText style={{ fontSize: 24 }}>🔒</ThemedText>
                    <ThemedText style={{ color: '#10B981', fontSize: 12.5, fontWeight: '700', flex: 1, lineHeight: 18 }}>
                      আপনার সকল আর্থিক ডাটা ১০০% গোপনীয় ও আপনার নিজস্ব নিয়ন্ত্রণে সুরক্ষিত।
                    </ThemedText>
                  </View>

                  <ThemedText type="smallBold" style={{ fontSize: 13 }}>১. তথ্য সুরক্ষা ও গোপনীয়তা:</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 20 }}>
                    হিসাব কিতাব অ্যাপ আপনার কোনো ব্যক্তিগত আর্থিক লেনদেনের তথ্য তৃতীয় কোনো পক্ষের কাছে বিক্রি বা শেয়ার করে না।
                  </ThemedText>

                  <ThemedText type="smallBold" style={{ fontSize: 13 }}>২. SMS পার্সিং ও নিরাপত্তা:</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 20 }}>
                    বিকাশ বা নগদ SMS পার্সিং অ্যালগরিদম সম্পূর্ণ আপনার ডিভাইসে অফলাইনে কাজ করে। আপনার মেসেজের টেক্সট কোনো সার্ভারে পাঠানো হয় না।
                  </ThemedText>

                  <ThemedText type="smallBold" style={{ fontSize: 13 }}>৩. ডাটা ব্যাকআপ ও সিঙ্ক:</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 20 }}>
                    ক্লাউড সিঙ্ক ফিচার ব্যবহার করলে আপনার হিসাব নিরাপদ এনক্রিপ্টেড ব্যাকআপ হিসেবে জমা থাকে যা শুধুমাত্র আপনার অ্যাকাউন্ট থেকে অ্যাক্সেসযোগ্য।
                  </ThemedText>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#208AEF', borderRadius: 16 }]}
                onPress={() => setShowPrivacyModal(false)}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  বুঝেছি ✓
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Google Account Selector Modal */}
        <Modal
          visible={showGoogleModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGoogleModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowGoogleModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, borderWidth: 1 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>Google সাইন-ইন</ThemedText>
                <TouchableOpacity onPress={() => setShowGoogleModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Image
                  source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }}
                  style={{ width: 44, height: 44, marginBottom: 8 }}
                  resizeMode="contain"
                />
                <ThemedText type="subtitle" style={{ fontSize: 18, fontWeight: '800' }}>
                  গুগল অ্যাকাউন্ট নির্বাচন করুন
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 4, fontSize: 12 }}>
                  হিসাব কিতাব অ্যাপে প্রবেশ করতে আপনার গুগল অ্যাকাউন্ট তথ্য দিন:
                </ThemedText>
              </View>

              <View style={{ gap: 12, marginVertical: 10 }}>
                {/* Email Input */}
                <View>
                  <ThemedText type="smallBold" style={{ fontSize: 12, marginBottom: 6 }}>গুগল ইমেইল (Google Email):</ThemedText>
                  <TextInput
                    style={[styles.inputField, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                    placeholder="your.email@gmail.com"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={googleEmailInput}
                    onChangeText={setGoogleEmailInput}
                  />
                </View>

                {/* Name Input */}
                <View>
                  <ThemedText type="smallBold" style={{ fontSize: 12, marginBottom: 6 }}>সম্পূর্ণ নাম (Full Name):</ThemedText>
                  <TextInput
                    style={[styles.inputField, { color: theme.text, backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}
                    placeholder="Hamim Ahmed"
                    placeholderTextColor={theme.textSecondary}
                    value={googleNameInput}
                    onChangeText={setGoogleNameInput}
                  />
                </View>

                {/* Quick Account Selector Badge */}
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(32, 138, 239, 0.12)',
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(32, 138, 239, 0.3)',
                  }}
                  onPress={() => {
                    setGoogleEmailInput('mdhamim5088@gmail.com');
                    setGoogleNameInput('Hamim Ahmed');
                  }}
                >
                  <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#208AEF' }}>mdhamim5088@gmail.com</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>Hamim Ahmed (গুগল ভেরিফাইড)</ThemedText>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#208AEF', borderRadius: 16, marginTop: 10 }]}
                onPress={handleConfirmGoogleAuth}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  Google অ্যাকাউন্ট দিয়ে প্রবেশ করুন ➔
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ⏰ Time Picker Modal for Daily Reminder */}
        <Modal
          visible={showTimePickerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePickerModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePickerModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, maxWidth: 390 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1 }}>
                  {language === 'bn' ? 'রিমাইন্ডার সময় নির্বাচন ⏰' : 'Select Reminder Time ⏰'}
                </ThemedText>
                <TouchableOpacity onPress={() => setShowTimePickerModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText themeColor="textSecondary" style={{ fontSize: 13, marginBottom: 12 }}>
                {language === 'bn' ? 'প্রতিদিন কোন সময়ে হিসাব লেখার নোটিফিকেশন পেতে চান?' : 'When would you like to receive daily accounting reminders?'}
              </ThemedText>

              {/* Preset Time Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8, justifyContent: 'space-between' }}>
                {[
                  { label: language === 'bn' ? '🌅 সকাল ০৮:০০' : '🌅 08:00 AM', hour: 8, minute: 0 },
                  { label: language === 'bn' ? '☀️ দুপুর ০১:০০' : '☀️ 01:00 PM', hour: 13, minute: 0 },
                  { label: language === 'bn' ? '🌇 সন্ধ্যা ০৬:০০' : '🌇 06:00 PM', hour: 18, minute: 0 },
                  { label: language === 'bn' ? '🌙 রাত ০৮:০০' : '🌙 08:00 PM', hour: 20, minute: 0 },
                  { label: language === 'bn' ? '🌙 রাত ০৯:০০' : '🌙 09:00 PM', hour: 21, minute: 0 },
                  { label: language === 'bn' ? '🌙 রাত ১০:০০' : '🌙 10:00 PM', hour: 22, minute: 0 },
                ].map((item, idx) => {
                  const isSelected = notifSettings.dailyHour === item.hour && notifSettings.dailyMinute === item.minute;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => {
                        saveNotificationSettings({ dailyHour: item.hour, dailyMinute: item.minute }).then(setNotifSettings);
                        setShowTimePickerModal(false);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#3B82F6' : theme.backgroundSelected,
                        borderWidth: 1,
                        borderColor: isSelected ? '#2563EB' : 'transparent',
                        width: '48%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: isSelected ? '#3B82F6' : '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isSelected ? 0.2 : 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFFFFF' : theme.text }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ marginVertical: 12, height: 1, backgroundColor: theme.backgroundSelected }} />

              <ThemedText type="smallBold" style={{ fontSize: 13, marginBottom: 12, color: theme.textSecondary, textAlign: 'center' }}>
                {language === 'bn' ? '⏱️ কাস্টম সময় সেট করুন:' : '⏱️ Set Custom Time:'}
              </ThemedText>

              {/* Digital Time Picker Display Card */}
              <View style={{
                backgroundColor: theme.background,
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: theme.backgroundSelected,
              }}>
                {/* Hour Segment */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTimePickerTab('hour')}
                  style={{
                    backgroundColor: timePickerTab === 'hour' ? '#3B82F6' : theme.backgroundSelected,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    minWidth: 64,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: timePickerTab === 'hour' ? '#2563EB' : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: timePickerTab === 'hour' ? '#FFFFFF' : theme.text,
                  }}>
                    {customHour < 10 ? `0${customHour}` : customHour}
                  </Text>
                  <Text style={{
                    fontSize: 9,
                    fontWeight: '700',
                    marginTop: 2,
                    color: timePickerTab === 'hour' ? '#E0F2FE' : theme.textSecondary,
                  }}>
                    {language === 'bn' ? 'ঘণ্টা' : 'HOUR'}
                  </Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 28, fontWeight: '800', color: theme.textSecondary, marginHorizontal: 2 }}>:</Text>

                {/* Minute Segment */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTimePickerTab('minute')}
                  style={{
                    backgroundColor: timePickerTab === 'minute' ? '#3B82F6' : theme.backgroundSelected,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    minWidth: 64,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: timePickerTab === 'minute' ? '#2563EB' : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: timePickerTab === 'minute' ? '#FFFFFF' : theme.text,
                  }}>
                    {customMinute < 10 ? `0${customMinute}` : customMinute}
                  </Text>
                  <Text style={{
                    fontSize: 9,
                    fontWeight: '700',
                    marginTop: 2,
                    color: timePickerTab === 'minute' ? '#E0F2FE' : theme.textSecondary,
                  }}>
                    {language === 'bn' ? 'মিনিট' : 'MIN'}
                  </Text>
                </TouchableOpacity>

                {/* AM / PM Toggle Pill */}
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: theme.backgroundSelected,
                  borderRadius: 12,
                  padding: 4,
                  marginLeft: 10,
                }}>
                  {(['AM', 'PM'] as const).map((mode) => {
                    const isSelected = customAmPm === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        activeOpacity={0.8}
                        onPress={() => setCustomAmPm(mode)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                          shadowColor: isSelected ? '#3B82F6' : 'transparent',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: isSelected ? 0.2 : 0,
                          shadowRadius: 2,
                          elevation: isSelected ? 2 : 0,
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: isSelected ? '#FFFFFF' : theme.textSecondary,
                        }}>
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selector Grids */}
              {timePickerTab === 'hour' ? (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                    {language === 'bn' ? 'ঘণ্টা নির্বাচন করুন (১-১২)' : 'Select Hour (1-12)'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => {
                      const isSelected = customHour === hour;
                      return (
                        <TouchableOpacity
                          key={hour}
                          activeOpacity={0.8}
                          onPress={() => {
                            setCustomHour(hour);
                            setTimePickerTab('minute');
                          }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: isSelected ? '#3B82F6' : theme.background,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: isSelected ? '#2563EB' : theme.backgroundSelected,
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: isSelected ? '#FFFFFF' : theme.text,
                          }}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                    {language === 'bn' ? 'মিনিট নির্বাচন করুন' : 'Select Minute'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => {
                      const isSelected = customMinute === minute;
                      return (
                        <TouchableOpacity
                          key={minute}
                          activeOpacity={0.8}
                          onPress={() => setCustomMinute(minute)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: isSelected ? '#3B82F6' : theme.background,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: isSelected ? '#2563EB' : theme.backgroundSelected,
                          }}
                        >
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: isSelected ? '#FFFFFF' : theme.text,
                          }}>
                            {minute < 10 ? `0${minute}` : minute}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Fine Tuning controls */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    backgroundColor: theme.background,
                    borderRadius: 12,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: theme.backgroundSelected,
                    alignSelf: 'center',
                    width: '70%',
                  }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setCustomMinute((prev) => (prev <= 0 ? 59 : prev - 1))}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.backgroundSelected,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '900', color: theme.text }}>-</Text>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, minWidth: 60, textAlign: 'center' }}>
                      {language === 'bn' ? `${customMinute} মিনিট` : `${customMinute} min`}
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setCustomMinute((prev) => (prev >= 59 ? 0 : prev + 1))}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.backgroundSelected,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '900', color: theme.text }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Save Custom Time Button */}
              <TouchableOpacity
                onPress={() => {
                  let h24 = customHour;
                  if (customAmPm === 'PM' && customHour < 12) h24 += 12;
                  if (customAmPm === 'AM' && customHour === 12) h24 = 0;
                  saveNotificationSettings({ dailyHour: h24, dailyMinute: customMinute }).then(setNotifSettings);
                  setShowTimePickerModal(false);
                }}
                style={[styles.primaryButton, { backgroundColor: '#3B82F6', borderRadius: 14, marginTop: 16 }]}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {language === 'bn' ? 'কাস্টম সময় সেট করুন 🔔' : 'Set Custom Time 🔔'}
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 🏆 Leaderboard & Reward Points Modal */}
        <Modal
          visible={showLeaderboardModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowLeaderboardModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLeaderboardModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, maxHeight: '85%' }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, paddingRight: 8 }}>🏆 {t.leaderboardHeader}</ThemedText>
                <TouchableOpacity onPress={() => setShowLeaderboardModal(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              {/* User Stats Card */}
              <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', borderRadius: 16, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.3)', alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 28, fontWeight: '900', color: '#EAB308' }}>⭐ {points} {t.pointsPillLabel}</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '700', marginTop: 4 }}>{language === 'bn' ? `আপনার ব্যাজ: ${userBadge}` : `Your Badge: ${userBadge}`}</ThemedText>
              </View>

              {/* Daily Tasks Progress Checklist */}
              <View style={{ backgroundColor: theme.background, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                <ThemedText type="smallBold" style={{ marginBottom: 8, fontSize: 13 }}>{t.dailyRewardTasksTitle}</ThemedText>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <ThemedText type="small" style={{ fontSize: 12 }}>{t.dailyAppOpenBonus}:</ThemedText>
                  <ThemedText style={{ fontSize: 12, fontWeight: '800', color: dailyLoginEarnedToday ? '#10B981' : '#EAB308' }}>
                    {dailyLoginEarnedToday ? `✓ +10 ${t.pointsPillLabel} (${t.earnedBadge})` : `⏳ +10 ${t.pointsPillLabel}`}
                  </ThemedText>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <ThemedText type="small" style={{ fontSize: 12 }}>{t.dailyTxBonus}:</ThemedText>
                  <ThemedText style={{ fontSize: 12, fontWeight: '800', color: dailyTxEarnedToday ? '#10B981' : '#EAB308' }}>
                    {dailyTxEarnedToday ? `✓ +10 ${t.pointsPillLabel} (${t.earnedBadge})` : `⏳ +10 ${t.pointsPillLabel} ${t.pendingBadge}`}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="smallBold" style={{ marginBottom: 8, fontSize: 13 }}>{t.topUserLeaderboard}:</ThemedText>

              {/* Leaderboard List */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
                {getLeaderboard().map((userItem, index) => {
                  const rank = index + 1;
                  const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                  return (
                    <View
                      key={userItem.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        marginBottom: 6,
                        backgroundColor: userItem.isCurrentUser ? 'rgba(32, 138, 239, 0.15)' : theme.background,
                        borderWidth: userItem.isCurrentUser ? 1.5 : 0,
                        borderColor: '#208AEF',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ThemedText style={{ fontSize: 16, fontWeight: '900', minWidth: 28 }}>{rankBadge}</ThemedText>
                        <View>
                          <ThemedText style={{ fontSize: 13, fontWeight: userItem.isCurrentUser ? '800' : '600' }}>
                            {userItem.name} {userItem.isCurrentUser ? '(আপনি)' : ''}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>{userItem.badge}</ThemedText>
                        </View>
                      </View>

                      <ThemedText style={{ fontSize: 14, fontWeight: '800', color: '#EAB308' }}>
                        {userItem.points} Pts
                      </ThemedText>
                    </View>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#208AEF', borderRadius: 16, marginTop: 14 }]}
                onPress={() => setShowLeaderboardModal(false)}
              >
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  ঠিক আছে ✓
                </ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Floating Modern Toast Feedback Notification */}
        {toast.visible && (
          <TouchableOpacity
            style={[
              styles.toastContainer,
              { backgroundColor: toast.type === 'error' ? '#EF4444' : '#059669' }
            ]}
            activeOpacity={0.8}
            onPress={() => setToast({ visible: false, message: '', type: 'success' })}
          >
            <ThemedText style={styles.toastIcon}>
              {toast.type === 'error' ? '⚠️' : '✨'}
            </ThemedText>
            <ThemedText style={styles.toastText}>
              {toast.message}
            </ThemedText>
          </TouchableOpacity>
        )}
        {/* Onboarding Overlay when replaying from settings */}
        {showOnboarding && (
          <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    alignItems: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  loginCardContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  logoBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  logoBadgeText: {
    fontSize: 34,
  },
  brandName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: Spacing.half,
  },
  loginCard: {
    width: '100%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    padding: 4,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  otpBackBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  demoOtpBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    width: '100%',
    marginBottom: Spacing.three,
    alignItems: 'center',
  },
  resendSection: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  formSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    width: '100%',
    marginBottom: Spacing.three,
  },
  successText: {
    color: '#15803d',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    width: '100%',
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#d97706',
    fontSize: 12,
  },
  strengthContainer: {
    marginTop: 6,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    width: '100%',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  feedbackBanner: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginVertical: Spacing.one,
    width: '100%',
  },
  formContainer: {
    width: '100%',
    gap: Spacing.three,
  },
  inputWrapper: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: Spacing.one,
  },
  inlineErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  forgotText: {
    color: '#3b82f6',
    fontSize: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  inputField: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.three,
    height: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 50,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.three,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  dividerText: {
    marginHorizontal: Spacing.two,
    fontSize: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: Spacing.two,
  },
  googleButtonText: {
    fontSize: 15,
  },
  langToggle: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: Spacing.three,
    width: '100%',
    position: 'relative',
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  glowingBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.5,
    borderRadius: Spacing.four,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cameraBadgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#208AEF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pointsBadgeOverlay: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#EAB308',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pointsBadgeOverlayText: {
    color: '#EAB308',
    fontSize: 11,
    fontWeight: '900',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3.5,
    borderColor: '#3b82f6',
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#3b82f6',
  },
  proBadgeContainer: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  proBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.half,
  },
  userEmail: {
    fontSize: 14,
  },
  editProfileBtnRow: {
    marginTop: Spacing.three,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#3b82f6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.two,
  },
  statItem: {
    width: '48%',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: Spacing.one,
  },
  actionsList: {
    width: '100%',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.three,
  },
  actionTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionValue: {
    fontSize: 13,
  },
  rowDivider: {
    height: 1.5,
    marginHorizontal: Spacing.two,
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
    alignSelf: 'center',
  },
  syncIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: Spacing.one,
  },
  logoutButton: {
    width: '100%',
    height: 52,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  saveProfileButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  saveProfileButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 25,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
    maxWidth: '90%',
  },
  toastIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  notifBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: 10,
  },
  notifIcon: {
    fontSize: 18,
  },
  notifSubText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  timeBadgeContainer: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#3B82F618',
    borderWidth: 1,
    borderColor: '#3B82F633',
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
});

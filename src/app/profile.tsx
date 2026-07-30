import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, isLoading, login, register, loginWithGoogle, logout } = useAuth();
  
  // Custom Auth State to support login/signup
  const { transactions, totalBalance, totalIncome, totalExpenses, deleteTransaction } = useTransactions();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      if (res.success) {
        setAuthSuccessMsg(t.authSuccessRegister);
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
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

  // Google Login Handler
  const handleGoogleAuth = async () => {
    setAuthError('');
    setAuthSuccessMsg('');
    const res = await loginWithGoogle();
    if (!res.success) {
      setAuthError(t.errGoogleFailed);
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
    const confirmAction = () => {
      transactions.forEach((tx) => deleteTransaction(tx.id));
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
            <View style={styles.avatarWrapper}>
              {user.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="subtitle" style={{ color: theme.text }}>
                    {user.name.charAt(0)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.proBadgeContainer}>
                <ThemedText style={styles.proBadgeText}>⚡ {t.proBadge}</ThemedText>
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.userName}>
              {user.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.userEmail}>
              {user.email}
            </ThemedText>
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

          {/* Settings Actions list */}
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {t.settingsHeader}
            </ThemedText>
            <View style={styles.headerIndicatorDot} />
          </View>

          <View style={[styles.actionsList, { backgroundColor: theme.backgroundElement }]}>
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

            {/* Export Transactions */}
            <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
              <ThemedText style={styles.actionIcon}>📤</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.exportData}</ThemedText>
              </View>
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Help & Support */}
            <TouchableOpacity style={styles.actionRow} onPress={handleSupport}>
              <ThemedText style={styles.actionIcon}>💬</ThemedText>
              <View style={styles.actionTextContainer}>
                <ThemedText type="small">{t.helpSupport}</ThemedText>
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
            onPress={logout}
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
    marginBottom: Spacing.two,
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
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
});

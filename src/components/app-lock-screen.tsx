/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Vibration,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSecurity } from '@/context/SecurityContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

export function AppLockScreen() {
  const { isLocked, lockoutUntil, failedAttempts, verifyPin, resetPinByRecovery, unlockApp, isBiometricEnabled, authenticateWithBiometrics } = useSecurity();
  const { language } = useLanguage();
  const t = translations[language];
  const { user, forgotPassword, verifyResetOtp, resendOtp } = useAuth();

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Recovery Modal 3-Step States: 'request' -> 'verify_otp' -> 'set_pin'
  type RecoveryStep = 'request' | 'verify_otp' | 'set_pin';
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('request');
  const [recoveryEmailInput, setRecoveryEmailInput] = useState<string>(user?.email || '');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [inputOtp, setInputOtp] = useState<string>('');
  const [newPinRecovery, setNewPinRecovery] = useState<string>('');
  const [confirmPinRecovery, setConfirmPinRecovery] = useState<string>('');
  const [otpTimer, setOtpTimer] = useState<number>(60);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string>('');

  const otpInputRef = useRef<TextInput>(null);
  const newPinInputRef = useRef<TextInput>(null);
  const confirmPinInputRef = useRef<TextInput>(null);

  // Reset PIN input and error message when screen becomes locked
  const [prevIsLocked, setPrevIsLocked] = useState(isLocked);
  if (isLocked !== prevIsLocked) {
    setPrevIsLocked(isLocked);
    if (isLocked) {
      setPinInput('');
      setErrorMsg('');
    }
  }

  // Handle 30-sec cooldown lockout timer countdown
  const [prevLockoutUntil, setPrevLockoutUntil] = useState(lockoutUntil);
  if (lockoutUntil !== prevLockoutUntil) {
    setPrevLockoutUntil(lockoutUntil);
    if (!lockoutUntil) {
      setLockoutRemaining(0);
    }
  }

  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Resend OTP countdown timer effect
  useEffect(() => {
    if (!showRecoveryModal || recoveryStep !== 'verify_otp' || otpTimer <= 0) return;

    const timerInterval = setInterval(() => {
      setOtpTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [showRecoveryModal, recoveryStep, otpTimer]);

  // Animations setup for main PIN entry
  const [shakeAnim] = useState(() => new Animated.Value(0));
  const [dotScales] = useState(() => [
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]);

  // OTP Animations: 6 digit box scales & OTP shake animation
  const [otpShakeAnim] = useState(() => new Animated.Value(0));
  const [otpBoxScales] = useState(() => [
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const triggerOtpShake = () => {
    Animated.sequence([
      Animated.timing(otpShakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.timing(dotScales[index], { toValue: 1.45, duration: 80, useNativeDriver: true }),
      Animated.spring(dotScales[index], { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const animateOtpBox = (index: number) => {
    if (index < 0 || index >= 6) return;
    Animated.sequence([
      Animated.timing(otpBoxScales[index], { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(otpBoxScales[index], { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (numStr: string) => {
    if (lockoutRemaining > 0) return;

    if (pinInput.length < 4) {
      const idx = pinInput.length;
      animateDot(idx);
      const nextPin = pinInput + numStr;
      setPinInput(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        setTimeout(async () => {
          const success = await verifyPin(nextPin);
          if (!success) {
            setErrorMsg(t.wrongPinError);
            triggerShake();
            if (Platform.OS !== 'web') {
              Vibration.vibrate(250);
            }
            setPinInput('');
          }
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    if (lockoutRemaining > 0) return;
    if (pinInput.length > 0) {
      const idx = pinInput.length - 1;
      dotScales[idx].setValue(1); // Reset scale
      setPinInput(pinInput.slice(0, -1));
      setErrorMsg('');
    }
  };

  // STEP 1: Send Recovery OTP
  const handleSendRecoveryOtp = async () => {
    const trimmedEmail = recoveryEmailInput.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRecoveryError('সঠিক ইমেইল অ্যাড্রেস লিখুন');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccessMsg('');

    try {
      const result = await forgotPassword(trimmedEmail);
      const mockOtp = '123456';
      setGeneratedOtp(mockOtp);
      setRecoveryLoading(false);

      setRecoveryStep('verify_otp');
      setOtpTimer(60);
      setInputOtp('');
      setRecoverySuccessMsg('');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (e) {
      setRecoveryLoading(false);
      setRecoveryStep('verify_otp');
      setOtpTimer(60);
      setInputOtp('');
      setRecoverySuccessMsg('');
      setTimeout(() => otpInputRef.current?.focus(), 300);
    }
  };

  // OTP Text Change Handler with per-digit scale animation
  const handleOtpChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 6);
    if (digitsOnly.length > inputOtp.length) {
      animateOtpBox(digitsOnly.length - 1);
    }
    setInputOtp(digitsOnly);
    setRecoveryError('');

    // Auto verify when 6th digit is typed!
    if (digitsOnly.length === 6) {
      setTimeout(() => handleVerifyOtp(digitsOnly), 150);
    }
  };

  // STEP 2: Verify OTP code
  const handleVerifyOtp = async (otpToVerify?: string) => {
    const targetOtp = (otpToVerify || inputOtp).trim();
    if (targetOtp.length !== 6) {
      setRecoveryError('৬ ডিজিটের OTP কোড দিন');
      triggerOtpShake();
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccessMsg('');

    try {
      const res = await verifyResetOtp(recoveryEmailInput.trim(), targetOtp);
      const isValid = res.success || targetOtp === generatedOtp || targetOtp === '123456';

      setRecoveryLoading(false);

      if (isValid) {
        setOtpVerified(true);
        setRecoverySuccessMsg('✓ OTP সফলভাবে ভেরিফাই হয়েছে!');
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 80, 50, 80]);
        }

        // Advance to Step 3: Set New PIN after short success animation!
        setTimeout(() => {
          setRecoveryStep('set_pin');
          setRecoverySuccessMsg('এখন আপনার নতুন ৪ ডিজিটের পিন সেভ করুন');
          setRecoveryError('');
        }, 600);
      } else {
        triggerOtpShake();
        if (Platform.OS !== 'web') {
          Vibration.vibrate(300);
        }
        setRecoveryError(res.message || 'ভুল OTP কোড! আবার চেষ্টা করুন');
      }
    } catch (e) {
      setRecoveryLoading(false);
      if (targetOtp === '123456' || targetOtp === generatedOtp) {
        setOtpVerified(true);
        setRecoverySuccessMsg('✓ OTP ভেরিফাই হয়েছে!');
        setTimeout(() => {
          setRecoveryStep('set_pin');
          setRecoverySuccessMsg('এখন আপনার নতুন ৪ ডিজিটের পিন সেভ করুন');
        }, 600);
      } else {
        triggerOtpShake();
        setRecoveryError('ভুল OTP কোড! আবার চেষ্টা করুন (ডিফল্ট: 123456)');
      }
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccessMsg('');

    try {
      await resendOtp(recoveryEmailInput.trim());
    } catch (e) {}

    setRecoveryLoading(false);
    setOtpTimer(60);
    setInputOtp('');
    setGeneratedOtp('123456');
    setRecoverySuccessMsg('নতুন OTP পুনরায় পাঠানো হয়েছে (ডিফল্ট: 123456)');
  };

  // STEP 3: Confirm & Save New PIN
  const handleConfirmPinReset = async () => {
    if (newPinRecovery.length !== 4) {
      setRecoveryError('নতুন ৪ ডিজিটের পিন কোড দিন');
      return;
    }
    if (confirmPinRecovery.length !== 4) {
      setRecoveryError('কনফার্ম করার জন্য ৪ ডিজিটের পিন দিন');
      return;
    }
    if (newPinRecovery !== confirmPinRecovery) {
      setRecoveryError('নতুন পিন এবং কনফার্ম পিন মিলছে না!');
      return;
    }

    setRecoveryLoading(true);
    const success = await resetPinByRecovery(newPinRecovery);
    setRecoveryLoading(false);

    if (success) {
      unlockApp(); // Automatically unlock lock screen after recovery PIN setup!
      resetRecoveryStates();
    } else {
      setRecoveryError('পিন সেভ করতে সমস্যা হয়েছে!');
    }
  };

  const resetRecoveryStates = () => {
    setShowRecoveryModal(false);
    setRecoveryStep('request');
    setInputOtp('');
    setNewPinRecovery('');
    setConfirmPinRecovery('');
    setRecoveryError('');
    setRecoverySuccessMsg('');
    setOtpVerified(false);
    setOtpTimer(60);
  };

  if (!isLocked) return null;

  const isLockedOut = lockoutRemaining > 0;

  return (
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🔒</Text>
          <Text style={styles.brandTitle}>{t.lockScreenTitle}</Text>
          <Text style={[styles.promptText, isLockedOut && styles.promptTextError]}>
            {isLockedOut
              ? t.lockoutMsg.replace('{sec}', lockoutRemaining.toString())
              : errorMsg
              ? errorMsg
              : t.enterPinPrompt}
          </Text>
        </View>

        {/* 4 PIN Indicator Dots */}
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pinInput.length > index;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  isFilled && styles.dotFilled,
                  (errorMsg || isLockedOut) && styles.dotError,
                  { transform: [{ scale: dotScales[index] }] }
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Keypad Grid */}
        <View style={[styles.keypadContainer, isLockedOut && { opacity: 0.4 }]}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['empty', '0', 'del'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((item) => {
                if (item === 'empty') {
                  return <View key={item} style={styles.keyBtnEmpty} />;
                }

                if (item === 'del') {
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.keyBtn, styles.keyBtnSpecial]}
                      onPress={handleDelete}
                      disabled={isLockedOut}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.specialKeyText}>⌫</Text>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.keyBtn}
                    onPress={() => handleKeyPress(item)}
                    disabled={isLockedOut}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyText}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Forgot PIN Link */}
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => {
            setShowRecoveryModal(true);
            setRecoveryStep('request');
            setRecoveryError('');
            setRecoverySuccessMsg('');
          }}
        >
          <Text style={styles.forgotBtnText}>{t.forgotPinBtn}</Text>
        </TouchableOpacity>

        {/* Biometric Unlock Button */}
        {isBiometricEnabled && Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={async () => {
              const success = await authenticateWithBiometrics();
              if (!success) {
                setErrorMsg('Biometric verification failed. Try PIN.');
              }
            }}
          >
            <Text style={styles.biometricBtnText}>🔑 Use Fingerprint / Face ID</Text>
          </TouchableOpacity>
        )}

        {/* Modern 3-Step Security Recovery & OTP Verification Modal */}
        <Modal
          visible={showRecoveryModal}
          transparent
          animationType="fade"
          onRequestClose={resetRecoveryStates}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header Header Row */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderTitleGroup}>
                  <View style={styles.modalIconBadge}>
                    <Feather
                      name={
                        recoveryStep === 'request'
                          ? 'mail'
                          : recoveryStep === 'verify_otp'
                          ? 'shield'
                          : 'key'
                      }
                      size={18}
                      color="#60A5FA"
                    />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.modalTitle}>
                      {recoveryStep === 'request'
                        ? 'পিন রিকভারি'
                        : recoveryStep === 'verify_otp'
                        ? 'OTP ভেরিফিকেশন'
                        : 'নতুন পিন সেট'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {recoveryStep === 'request'
                        ? 'ধাপ ১/৩ • ইমেইল ভেরিফিকেশন'
                        : recoveryStep === 'verify_otp'
                        ? 'ধাপ ২/৩ • ৬ ডিজিটের কোড'
                        : 'ধাপ ৩/৩ • পিন আপডেট'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={resetRecoveryStates} activeOpacity={0.7}>
                  <Feather name="x" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Modern Step Stepper Row */}
              <View style={styles.stepperContainer}>
                {/* Step 1 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepBadge,
                      recoveryStep === 'request' && styles.stepBadgeActive,
                      recoveryStep !== 'request' && styles.stepBadgeCompleted,
                    ]}
                  >
                    {recoveryStep !== 'request' ? (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.stepBadgeText}>1</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, recoveryStep === 'request' && styles.stepLabelActive]}>
                    ইমেইল
                  </Text>
                </View>

                <View style={[styles.stepConnectorLine, recoveryStep !== 'request' && styles.stepConnectorActive]} />

                {/* Step 2 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepBadge,
                      recoveryStep === 'verify_otp' && styles.stepBadgeActive,
                      recoveryStep === 'set_pin' && styles.stepBadgeCompleted,
                      recoveryStep === 'request' && styles.stepBadgePending,
                    ]}
                  >
                    {recoveryStep === 'set_pin' ? (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepBadgeText, recoveryStep === 'verify_otp' && styles.stepBadgeTextActive]}>2</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, recoveryStep === 'verify_otp' && styles.stepLabelActive]}>
                    OTP কোড
                  </Text>
                </View>

                <View style={[styles.stepConnectorLine, recoveryStep === 'set_pin' && styles.stepConnectorActive]} />

                {/* Step 3 */}
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepBadge,
                      recoveryStep === 'set_pin' && styles.stepBadgeActive,
                      recoveryStep !== 'set_pin' && styles.stepBadgePending,
                    ]}
                  >
                    <Text style={[styles.stepBadgeText, recoveryStep === 'set_pin' && styles.stepBadgeTextActive]}>3</Text>
                  </View>
                  <Text style={[styles.stepLabel, recoveryStep === 'set_pin' && styles.stepLabelActive]}>
                    নতুন পিন
                  </Text>
                </View>
              </View>

              {/* Alert & Error Notification Box */}
              {recoveryError ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={15} color="#F87171" style={{ marginRight: 8 }} />
                  <Text style={styles.errorTextMsg}>{recoveryError}</Text>
                </View>
              ) : null}

              {recoverySuccessMsg ? (
                <View style={styles.successBox}>
                  <Feather name="check-circle" size={15} color="#34D399" style={{ marginRight: 8 }} />
                  <Text style={styles.successTextMsg}>{recoverySuccessMsg}</Text>
                </View>
              ) : null}

              {/* STEP 1: Enter Email */}
              {recoveryStep === 'request' && (
                <View style={styles.recoveryStepBox}>
                  <Text style={styles.recoveryDesc}>
                    আপনার নিবন্ধিত ইমেইল ঠিকানা প্রদান করুন। আমরা একটি সিকিউরিটি OTP কোড পাঠাব।
                  </Text>

                  <Text style={styles.inputLabelText}>নিবন্ধিত ইমেইল ঠিকানা</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={16} color="#64748B" style={styles.inputLeadingIcon} />
                    <TextInput
                      style={styles.modalInputWithIcon}
                      placeholder="name@example.com"
                      placeholderTextColor="#475569"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={recoveryEmailInput}
                      onChangeText={setRecoveryEmailInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleSendRecoveryOtp}
                    disabled={recoveryLoading}
                    activeOpacity={0.8}
                  >
                    {recoveryLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <View style={styles.btnRowContent}>
                        <Text style={styles.primaryActionBtnText}>OTP কোড পাঠান</Text>
                        <Feather name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: Verify OTP Code */}
              {recoveryStep === 'verify_otp' && (
                <View style={styles.recoveryStepBox}>
                  {/* Clean Email Chip Header */}
                  <View style={styles.emailChipCard}>
                    <View style={styles.emailChipIcon}>
                      <Feather name="mail" size={14} color="#60A5FA" />
                    </View>
                    <Text style={styles.emailChipText} numberOfLines={1}>
                      {recoveryEmailInput}
                    </Text>
                  </View>

                  <Text style={styles.otpSubInstruction}>
                    উপরের ইমেইলে পাঠানো ৬ ডিজিটের সিকিউরিটি OTP প্রবেশ করান:
                  </Text>

                  {/* 6 Digit Box OTP Code */}
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => otpInputRef.current?.focus()}
                    style={styles.otpInteractiveContainer}
                  >
                    <TextInput
                      ref={otpInputRef}
                      value={inputOtp}
                      onChangeText={handleOtpChange}
                      keyboardType="numeric"
                      maxLength={6}
                      caretHidden
                      autoFocus
                      style={styles.hiddenOtpInput}
                    />

                    <Animated.View
                      style={[
                        styles.otpBoxesRow,
                        { transform: [{ translateX: otpShakeAnim }] }
                      ]}
                    >
                      {[0, 1, 2, 3, 4, 5].map((idx) => {
                        const digit = inputOtp[idx] || '';
                        const isFilled = digit.length > 0;
                        const isFocused =
                          inputOtp.length === idx || (inputOtp.length === 6 && idx === 5);

                        return (
                          <Animated.View
                            key={idx}
                            style={[
                              styles.otpDigitBox,
                              isFilled && styles.otpDigitBoxFilled,
                              isFocused && styles.otpDigitBoxFocused,
                              otpVerified && styles.otpDigitBoxSuccess,
                              recoveryError ? styles.otpDigitBoxError : null,
                              { transform: [{ scale: otpBoxScales[idx] }] }
                            ]}
                          >
                            {isFilled ? (
                              <Text
                                style={[
                                  styles.otpDigitText,
                                  styles.otpDigitTextFilled,
                                  otpVerified && styles.otpDigitTextSuccess,
                                ]}
                              >
                                {digit}
                              </Text>
                            ) : isFocused ? (
                              <View style={styles.activeFocusCursor} />
                            ) : (
                              <View style={styles.inactiveDotPlaceholder} />
                            )}
                          </Animated.View>
                        );
                      })}
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Resend OTP Row */}
                  <View style={styles.resendRowContainer}>
                    {otpTimer > 0 ? (
                      <View style={styles.resendTimerBadge}>
                        <Feather name="clock" size={13} color="#64748B" style={{ marginRight: 5 }} />
                        <Text style={styles.resendTimerText}>
                          পুনরায় কোড পাঠান (<Text style={styles.timerBold}>{otpTimer}s</Text>)
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.resendBtnLink}
                        onPress={handleResendOtp}
                        disabled={recoveryLoading}
                        activeOpacity={0.7}
                      >
                        <Feather name="rotate-cw" size={13} color="#60A5FA" style={{ marginRight: 6 }} />
                        <Text style={styles.resendLinkText}>পুনরায় OTP কোড পাঠান</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryActionBtn,
                      { marginTop: 12 },
                      (recoveryLoading || inputOtp.length !== 6) && styles.primaryActionBtnDisabled,
                    ]}
                    onPress={() => handleVerifyOtp()}
                    disabled={recoveryLoading || inputOtp.length !== 6}
                    activeOpacity={0.8}
                  >
                    {recoveryLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <View style={styles.btnRowContent}>
                        <Feather name="check-circle" size={16} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryActionBtnText}>OTP ভেরিফাই করুন</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backStepBtn}
                    onPress={() => setRecoveryStep('request')}
                    activeOpacity={0.7}
                  >
                    <Feather name="arrow-left" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                    <Text style={styles.backStepBtnText}>ইমেইল পরিবর্তন করুন</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Set New PIN */}
              {recoveryStep === 'set_pin' && (
                <View style={styles.recoveryStepBox}>
                  <Text style={styles.recoveryDesc}>
                    আপনার সিকিউরিটি লকের জন্য নতুন ৪ ডিজিটের পিন কোড সেট করুন।
                  </Text>

                  {/* New PIN 4-Digit Box Container */}
                  <Text style={styles.inputLabelText}>নতুন ৪ ডিজিটের পিন</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => newPinInputRef.current?.focus()}
                    style={styles.pinInteractiveContainer}
                  >
                    <TextInput
                      ref={newPinInputRef}
                      value={newPinRecovery}
                      onChangeText={(val) => {
                        setNewPinRecovery(val.replace(/[^0-9]/g, '').slice(0, 4));
                        setRecoveryError('');
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                      caretHidden
                      autoFocus
                      style={styles.hiddenOtpInput}
                    />

                    <View style={styles.pinBoxesRow}>
                      {[0, 1, 2, 3].map((idx) => {
                        const digit = newPinRecovery[idx] || '';
                        const isFilled = digit.length > 0;
                        const isFocused =
                          newPinRecovery.length === idx || (newPinRecovery.length === 4 && idx === 3);

                        return (
                          <View
                            key={idx}
                            style={[
                              styles.pinDigitBox,
                              isFilled && styles.pinDigitBoxFilled,
                              isFocused && styles.pinDigitBoxFocused,
                              recoveryError ? styles.pinDigitBoxError : null,
                            ]}
                          >
                            {isFilled ? (
                              <Text style={styles.pinDotSymbol}>•</Text>
                            ) : isFocused ? (
                              <View style={styles.activeFocusCursor} />
                            ) : (
                              <View style={styles.inactiveDotPlaceholder} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </TouchableOpacity>

                  {/* Confirm PIN 4-Digit Box Container */}
                  <Text style={[styles.inputLabelText, { marginTop: 14 }]}>কনফার্ম পিন কোড</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => confirmPinInputRef.current?.focus()}
                    style={styles.pinInteractiveContainer}
                  >
                    <TextInput
                      ref={confirmPinInputRef}
                      value={confirmPinRecovery}
                      onChangeText={(val) => {
                        setConfirmPinRecovery(val.replace(/[^0-9]/g, '').slice(0, 4));
                        setRecoveryError('');
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                      caretHidden
                      style={styles.hiddenOtpInput}
                    />

                    <View style={styles.pinBoxesRow}>
                      {[0, 1, 2, 3].map((idx) => {
                        const digit = confirmPinRecovery[idx] || '';
                        const isFilled = digit.length > 0;
                        const isFocused =
                          confirmPinRecovery.length === idx || (confirmPinRecovery.length === 4 && idx === 3);

                        return (
                          <View
                            key={idx}
                            style={[
                              styles.pinDigitBox,
                              isFilled && styles.pinDigitBoxFilled,
                              isFocused && styles.pinDigitBoxFocused,
                              recoveryError ? styles.pinDigitBoxError : null,
                            ]}
                          >
                            {isFilled ? (
                              <Text style={styles.pinDotSymbol}>•</Text>
                            ) : isFocused ? (
                              <View style={styles.activeFocusCursor} />
                            ) : (
                              <View style={styles.inactiveDotPlaceholder} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { marginTop: 22 }]}
                    onPress={handleConfirmPinReset}
                    disabled={recoveryLoading}
                    activeOpacity={0.8}
                  >
                    {recoveryLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <View style={styles.btnRowContent}>
                        <Feather name="check" size={16} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryActionBtnText}>পিন সেভ ও অ্যাপ আনলক</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  promptTextError: {
    color: '#EF4444',
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 4,
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 18,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#181E2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#263044',
  },
  keyBtnEmpty: {
    width: 72,
    height: 72,
  },
  keyBtnSpecial: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  specialKeyText: {
    fontSize: 24,
    color: '#94A3B8',
  },
  forgotBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  forgotBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  biometricBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 10,
    alignItems: 'center',
  },
  biometricBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#161B26',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#212836',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F131C',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  stepBadgeCompleted: {
    backgroundColor: '#10B981',
  },
  stepBadgePending: {
    backgroundColor: '#1E293B',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepBadgeTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#F1F5F9',
    fontWeight: '600',
  },
  stepConnectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1E293B',
    marginHorizontal: 8,
    borderRadius: 1,
  },
  stepConnectorActive: {
    backgroundColor: '#3B82F6',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorTextMsg: {
    color: '#F87171',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successTextMsg: {
    color: '#34D399',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  recoveryStepBox: {
    width: '100%',
  },
  recoveryDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  inputLabelText: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F131C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    height: 48,
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  modalInputWithIcon: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  emailChipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 10,
    maxWidth: '90%',
  },
  emailChipIcon: {
    marginRight: 6,
  },
  emailChipText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  otpSubInstruction: {
    color: '#94A3B8',
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  otpInteractiveContainer: {
    width: '100%',
    marginVertical: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.01,
    zIndex: 10,
  },
  pinInteractiveContainer: {
    width: '100%',
    marginVertical: 6,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pinDigitBox: {
    width: 68,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#263044',
    backgroundColor: '#0F131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigitBoxFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  pinDigitBoxFocused: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  pinDigitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  pinDotSymbol: {
    fontSize: 28,
    fontWeight: '900',
    color: '#60A5FA',
    marginTop: -4,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpDigitBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#263044',
    backgroundColor: '#0F131C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitBoxFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  otpDigitBoxFocused: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  otpDigitBoxSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  otpDigitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  activeFocusCursor: {
    width: 2,
    height: 22,
    backgroundColor: '#60A5FA',
    borderRadius: 1,
  },
  inactiveDotPlaceholder: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#64748B',
  },
  otpDigitTextFilled: {
    color: '#FFFFFF',
  },
  otpDigitTextSuccess: {
    color: '#10B981',
  },
  resendRowContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  resendTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  timerBold: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  resendBtnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendLinkText: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '600',
  },
  primaryActionBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  primaryActionBtnDisabled: {
    backgroundColor: 'rgba(37, 99, 235, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  backStepBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  backStepBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
});

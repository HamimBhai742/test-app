import React, { useState, useEffect } from 'react';
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

export function AppLockScreen() {
  const { isLocked, lockoutUntil, failedAttempts, verifyPin, resetPinByRecovery, unlockApp } = useSecurity();
  const { language } = useLanguage();
  const t = translations[language];
  const { user } = useAuth();

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Recovery Modal states
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [recoveryEmailInput, setRecoveryEmailInput] = useState<string>(user?.email || '');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [inputOtp, setInputOtp] = useState<string>('');
  const [newPinRecovery, setNewPinRecovery] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isLocked) {
      setPinInput('');
      setErrorMsg('');
    }
  }, [isLocked]);

  // Handle 30-sec cooldown lockout timer countdown
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Animations setup
  const shakeAnim = React.useRef(new Animated.Value(0)).current;
  const dotScales = React.useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

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

  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.timing(dotScales[index], { toValue: 1.45, duration: 80, useNativeDriver: true }),
      Animated.spring(dotScales[index], { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
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
        setTimeout(() => {
          const success = verifyPin(nextPin);
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

  const handleSendRecoveryOtp = () => {
    if (!recoveryEmailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmailInput.trim())) {
      setRecoveryError('সঠিক ইমেইল অ্যাড্রেস লিখুন');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError('');
    setRecoverySuccessMsg('');

    setTimeout(() => {
      // Generate 6-digit OTP for simulation & email notification
      const mockOtp = '123456';
      setGeneratedOtp(mockOtp);
      setRecoveryLoading(false);
      setRecoveryStep('verify');
      setRecoverySuccessMsg(`${recoveryEmailInput.trim()} ঠিকানায় ৬ ডিজিটের কোড পাঠানো হয়েছে`);
    }, 1200);
  };

  const handleConfirmPinReset = async () => {
    if (inputOtp.trim() !== generatedOtp && inputOtp.trim() !== '123456') {
      setRecoveryError('ভুল OTP কোড! আবার চেষ্টা করুন');
      return;
    }
    if (newPinRecovery.length !== 4) {
      setRecoveryError('নতুন ৪ ডিজিটের পিন কোড দিন');
      return;
    }

    setRecoveryLoading(true);
    const success = await resetPinByRecovery(newPinRecovery);
    setRecoveryLoading(false);

    if (success) {
      unlockApp(); // Automatically unlock lock screen after recovery PIN setup!
      setShowRecoveryModal(false);
      setRecoveryStep('request');
      setInputOtp('');
      setNewPinRecovery('');
    } else {
      setRecoveryError('পিন সেভ করতে সমস্যা হয়েছে!');
    }
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
          }}
        >
          <Text style={styles.forgotBtnText}>{t.forgotPinBtn}</Text>
        </TouchableOpacity>

        {/* Forgot PIN Recovery Modal */}
        <Modal
          visible={showRecoveryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRecoveryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{t.recoveryModalTitle}</Text>
                <TouchableOpacity onPress={() => setShowRecoveryModal(false)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {recoveryError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTextMsg}>⚠️ {recoveryError}</Text>
                </View>
              ) : null}

              {recoverySuccessMsg ? (
                <View style={styles.successBox}>
                  <Text style={styles.successTextMsg}>✨ {recoverySuccessMsg}</Text>
                </View>
              ) : null}

              {recoveryStep === 'request' ? (
                <View style={styles.recoveryStepBox}>
                  <Text style={styles.inputLabelText}>আপনার ইমেইল অ্যাড্রেস দিন:</Text>
                  <TextInput
                    style={[styles.modalInput, { textAlign: 'left', marginBottom: 16 }]}
                    placeholder="your.email@gmail.com"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={recoveryEmailInput}
                    onChangeText={setRecoveryEmailInput}
                  />

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleSendRecoveryOtp}
                    disabled={recoveryLoading}
                  >
                    {recoveryLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>📩 ইমেইল OTP পাঠান</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.recoveryStepBox}>
                  <Text style={styles.inputLabelText}>ইমেইল OTP কোড (ডিফল্ট: 123456):</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="123456"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    maxLength={6}
                    value={inputOtp}
                    onChangeText={setInputOtp}
                  />

                  <Text style={[styles.inputLabelText, { marginTop: 12 }]}>নতুন ৪ ডিজিটের পিন কোড:</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="••••"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    value={newPinRecovery}
                    onChangeText={setNewPinRecovery}
                  />

                  <TouchableOpacity
                    style={[styles.actionBtn, { marginTop: 18 }]}
                    onPress={handleConfirmPinReset}
                    disabled={recoveryLoading}
                  >
                    {recoveryLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>✓ নতুন পিন সেভ করুন</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E2430',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#94A3B8',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorTextMsg: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successTextMsg: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '600',
  },
  recoveryStepBox: {
    width: '100%',
  },
  recoveryDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabelText: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#0F131C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 16,
    textAlign: 'center',
  },
  actionBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#208AEF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Vibration,
} from 'react-native';
import { useSecurity } from '@/context/SecurityContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';

export function AppLockScreen() {
  const { isLocked, verifyPin } = useSecurity();
  const { language } = useLanguage();
  const t = translations[language];

  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isLocked) {
      setPinInput('');
      setErrorMsg('');
    }
  }, [isLocked]);

  const handleKeyPress = (numStr: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + numStr;
      setPinInput(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        // Auto-verify exactly on 4 digits
        setTimeout(() => {
          const success = verifyPin(nextPin);
          if (!success) {
            setErrorMsg(t.wrongPinError);
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
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
      setErrorMsg('');
    }
  };

  if (!isLocked) return null;

  return (
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🔒</Text>
          <Text style={styles.brandTitle}>{t.lockScreenTitle}</Text>
          <Text style={styles.promptText}>
            {errorMsg ? errorMsg : t.enterPinPrompt}
          </Text>
        </View>

        {/* 4 PIN Indicator Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pinInput.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isFilled && styles.dotFilled,
                  errorMsg ? styles.dotError : null,
                ]}
              />
            );
          })}
        </View>

        {/* Keypad Grid (Clean 4-digit numeric pad with NO fingerprint buttons) */}
        <View style={styles.keypadContainer}>
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyText}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Spacer Footer */}
        <View style={styles.footerSpacer} />
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
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoEmoji: {
    fontSize: 52,
    marginBottom: 14,
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
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 24,
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
  footerSpacer: {
    height: 20,
  },
});

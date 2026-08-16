import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay({ isReady = true }: { isReady?: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const image = (
    <View style={styles.splashContent}>
      <View style={styles.logoBadgeContainer}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </View>
      <Animated.Text style={styles.splashTitle}>হিসাব কিতাব</Animated.Text>
      <Animated.Text style={styles.splashSubtitle}>আপনার স্মার্ট ফিনান্সিয়াল ম্যানেজার 💰</Animated.Text>
    </View>
  );

  return isReady ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
});

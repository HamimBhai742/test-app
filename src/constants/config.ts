import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine the base API URL dynamically for local testing.
// - On Android Emulator: 'http://10.0.2.2:5042/api/v1' is used as a fallback.
// - On physical Android/iOS devices running via Expo Go: it automatically extracts the computer's local IP address.
const getDynamicLocalUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri || '';
  const ip = hostUri.split(':')[0];
  if (ip) {
    return `http://${ip}:5042/api/v1`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5042/api/v1' : 'http://localhost:5042/api/v1';
};

// Toggle between LOCAL development and PRODUCTION server by commenting/uncommenting:
export const API_BASE_URL = getDynamicLocalUrl(); // For Local Development (Auto-resolves your computer's IP)
// export const API_BASE_URL = 'http://52.221.243.198:5042/api/v1'; // For Production / Cloud Staging

// Google OAuth Web Client ID for Authentication configuration.
export const GOOGLE_WEB_CLIENT_ID = '470337556940-5984eilfuqh3epjhlljfhkq7t54vd1k1.apps.googleusercontent.com';

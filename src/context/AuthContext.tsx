import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { registerForPushNotificationsAsync } from '@/services/notificationService';
import { API_BASE_URL } from '@/constants/config';

export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  avatar?: string;
  role?: string;
  provider?: string;
  points?: number;
  lastLoginRewardClaimedAt?: string | Date;
  lastTxRewardClaimedAt?: string | Date;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
}

export interface RegisterResponse extends AuthResponse {
  requireOtp?: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<RegisterResponse>;
  verifyOtp: (email: string, otp: string) => Promise<AuthResponse>;
  resendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (data?: { idToken?: string; email?: string; name?: string; avatar?: string }) => Promise<AuthResponse>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<AuthResponse>;
  uploadAvatarImage: (base64Image: string) => Promise<{ success: boolean; url?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyResetOtp: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  requestFinancialReport: () => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get Base API URL based on platform & Expo host IP
const getApiBaseUrl = () => {
  return API_BASE_URL;
};

const STORAGE_KEY_USER = 'hisab_kitab_auth_user';
const STORAGE_KEY_TOKEN = 'hisab_kitab_auth_token';

// Safe persistent storage helpers for Web, Android, and iOS
const setStorageItem = async (key: string, value: string) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {}
      await AsyncStorage.setItem(key, value).catch(() => {});
    }
  } catch (e) {}
};

const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } else {
      try {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
      } catch {}
      return await AsyncStorage.getItem(key).catch(() => null);
    }
  } catch (e) {
    return null;
  }
};

const removeStorageItem = async (key: string) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
      await AsyncStorage.removeItem(key).catch(() => {});
    }
  } catch (e) {}
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync pushToken with server
  const syncPushTokenWithServer = async (userToken?: string) => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        const activeToken = userToken || (await getStorageItem(STORAGE_KEY_TOKEN));
        if (activeToken) {
          await fetch(`${getApiBaseUrl()}/user/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeToken}`,
            },
            body: JSON.stringify({ pushToken }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Error syncing push token:', e);
    }
  };

  // Logout Handler
  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await removeStorageItem(STORAGE_KEY_USER);
      await removeStorageItem(STORAGE_KEY_TOKEN);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  // Restore user session permanently on app start across device restarts
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await getStorageItem(STORAGE_KEY_USER);
        const storedToken = await getStorageItem(STORAGE_KEY_TOKEN);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (storedToken) {
          setToken(storedToken);
          syncPushTokenWithServer(storedToken);

          // Fetch fresh user profile from server to sync points and claims
          try {
            const response = await fetch(`${getApiBaseUrl()}/user/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${storedToken}`,
              },
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                setUser(data.data);
                await setStorageItem(STORAGE_KEY_USER, JSON.stringify(data.data));
              }
            } else if (response.status === 401 || response.status === 403) {
              // Token expired or invalid! Invalidate session cleanly.
              await logout();
            }
          } catch (profileErr) {
            console.warn('Error syncing profile on startup:', profileErr);
          }
        }
      } catch (e) {
        console.warn('Session restoration error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // Save session state helper
  const saveSession = (userData: User, userToken?: string) => {
    setUser(userData);
    if (userToken) setToken(userToken);
    setStorageItem(STORAGE_KEY_USER, JSON.stringify(userData));
    if (userToken) {
      setStorageItem(STORAGE_KEY_TOKEN, userToken);
      syncPushTokenWithServer(userToken);
    }
  };

  // Sign In Handler
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userData: User = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          provider: data.data.user.provider || 'local',
          photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
        };
        saveSession(userData, data.data.accessToken);
        return { success: true, message: data.message, user: userData };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login Network/Server Error:', error);
      return {
        success: false,
        message: 'NETWORK_ERROR',
      };
    }
  };

  // Sign Up Handler (Requires OTP Verification)
  const register = async (name: string, email: string, password: string): Promise<RegisterResponse> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          requireOtp: true,
          email: email,
          message: data.message,
        };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error: any) {
      console.error('Registration Network/Server Error:', error);
      return {
        success: false,
        message: 'NETWORK_ERROR',
      };
    }
  };

  // Verify OTP Handler
  const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const userData: User = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          provider: data.data.user.provider || 'local',
          photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
        };
        saveSession(userData, data.data.accessToken);
        return { success: true, message: data.message, user: userData };
      } else {
        return { success: false, message: data.message || 'OTP verification failed' };
      }
    } catch (error: any) {
      console.error('Verify OTP Error:', error);
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  // Resend OTP Handler
  const resendOtp = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to resend OTP' };
      }
    } catch (error: any) {
      console.error('Resend OTP Error:', error);
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  // Google Login Handler (Using real Google OAuth token or Google user profile payload)
  const loginWithGoogle = async (googleData?: { idToken?: string; email?: string; name?: string; avatar?: string }): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: googleData?.idToken || undefined,
          email: googleData?.email || undefined,
          name: googleData?.name || undefined,
          avatar: googleData?.avatar || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const userData: User = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          provider: 'google',
          avatar: data.data.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
          photo: data.data.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
        };
        saveSession(userData, data.data.accessToken);
        return { success: true, message: data.message, user: userData };
      } else {
        return { success: false, message: data.message || 'গুগল সাইন-ইন ব্যর্থ হয়েছে (Google Sign In Failed)' };
      }
    } catch (error: any) {
      console.error('Google Sign In Network Error:', error);
      return { success: false, message: 'সার্ভার কানেকশন এরর! ইন্টারনেট বা ব্যাকএন্ড চেক করুন' };
    }
  };

  // Update Profile Handler (Name & Avatar/Photo)
  const updateProfile = async (dataToUpdate: { name?: string; avatar?: string }): Promise<AuthResponse> => {
    try {
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/user/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToUpdate),
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          const updatedUser: User = {
            ...user!,
            name: resData.data.name || user?.name || '',
            avatar: resData.data.avatar || dataToUpdate.avatar || user?.avatar,
            photo: resData.data.avatar || dataToUpdate.avatar || user?.photo,
          };
          saveSession(updatedUser);
          return { success: true, message: resData.message, user: updatedUser };
        }
      }

      // Local / Offline / Mock fallback
      if (user) {
        const updatedUser: User = {
          ...user,
          ...(dataToUpdate.name ? { name: dataToUpdate.name } : {}),
          ...(dataToUpdate.avatar ? { avatar: dataToUpdate.avatar, photo: dataToUpdate.avatar } : {}),
        };
        saveSession(updatedUser);
        return { success: true, user: updatedUser };
      }

      return { success: false, message: 'No user session found' };
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      if (user) {
        const updatedUser: User = {
          ...user,
          ...(dataToUpdate.name ? { name: dataToUpdate.name } : {}),
          ...(dataToUpdate.avatar ? { avatar: dataToUpdate.avatar, photo: dataToUpdate.avatar } : {}),
        };
        saveSession(updatedUser);
        return { success: true, user: updatedUser };
      }
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  // Upload Avatar Image to Cloudinary Handler
  const uploadAvatarImage = async (base64Image: string): Promise<{ success: boolean; url?: string; message?: string }> => {
    try {
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/user/upload-avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ image: base64Image }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const uploadedUrl = data.data.url;
          if (user) {
            const updatedUser: User = {
              ...user,
              avatar: uploadedUrl,
              photo: uploadedUrl,
            };
            saveSession(updatedUser);
          }
          return { success: true, url: uploadedUrl, message: data.message };
        }
      }

      const fallbackUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      if (user) {
        const updatedUser: User = {
          ...user,
          avatar: fallbackUrl,
          photo: fallbackUrl,
        };
        saveSession(updatedUser);
      }
      return { success: true, url: fallbackUrl };
    } catch (error: any) {
      console.error('Upload Avatar Error:', error);
      const fallbackUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
      return { success: true, url: fallbackUrl };
    }
  };


  // Refresh user details from server to keep local state up to date
  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${getApiBaseUrl()}/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          saveSession(data.data);
        }
      }
    } catch (e) {
      console.warn('Error refreshing user profile:', e);
    }
  };

  // Forgot Password Handler
  const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to send reset code' };
      }
    } catch (error: any) {
      console.error('Forgot Password Network Error:', error);
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  // Reset Password Handler
  const resetPassword = async (email: string, otp: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Reset password failed' };
      }
    } catch (error: any) {
      console.error('Reset Password Network Error:', error);
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  // Verify Reset OTP Handler
  const verifyResetOtp = async (email: string, otp: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'OTP verification failed' };
      }
    } catch (error: any) {
      console.error('Verify Reset OTP Network Error:', error);
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  // Request Financial Report Handler
  const requestFinancialReport = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!token) return { success: false, message: 'UNAUTHORIZED' };

      const response = await fetch(`${getApiBaseUrl()}/user/me/financial-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to send report' };
      }
    } catch (error: any) {
      console.error('Request Financial Report Error:', error);
      return { success: false, message: 'NETWORK_ERROR' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        verifyOtp,
        resendOtp,
        loginWithGoogle,
        updateProfile,
        uploadAvatarImage,
        logout,
        refreshUser,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        requestFinancialReport,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


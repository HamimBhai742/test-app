import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  avatar?: string;
  role?: string;
  provider?: string;
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
  loginWithGoogle: (idToken?: string) => Promise<AuthResponse>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<AuthResponse>;
  uploadAvatarImage: (base64Image: string) => Promise<{ success: boolean; url?: string; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get Base API URL based on platform & Expo host IP
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5001/api/v1';
  }
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5001/api/v1`;
      }
    }
  } catch (e) {
    console.warn('Could not determine host IP, using default fallback:', e);
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api/v1';
  }
  return 'http://localhost:5001/api/v1';
};

const STORAGE_KEY_USER = 'hisab_kitab_auth_user';
const STORAGE_KEY_TOKEN = 'hisab_kitab_auth_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore user session on app start
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const storedUser = localStorage.getItem(STORAGE_KEY_USER);
          const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
          if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
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
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
        if (userToken) localStorage.setItem(STORAGE_KEY_TOKEN, userToken);
      }
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  // Sign In Handler
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Handler (Requires OTP Verification)
  const register = async (name: string, email: string, password: string): Promise<RegisterResponse> => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP Handler
  const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  // Google Login Handler
  const loginWithGoogle = async (idToken?: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: idToken || undefined,
          email: 'hamim.google@example.com',
          name: 'Hamim Ahmed (Google)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
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
        return { success: false, message: data.message || 'Google Sign In Failed' };
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, message: 'GOOGLE_SIGNIN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  };

  // Update Profile Handler (Name & Avatar/Photo)
  const updateProfile = async (dataToUpdate: { name?: string; avatar?: string }): Promise<AuthResponse> => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  // Logout Handler
  const logout = async () => {
    setIsLoading(true);
    try {
      setUser(null);
      setToken(null);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
      }
    } catch (error) {
      console.error('Logout Error:', error);
    } finally {
      setIsLoading(false);
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


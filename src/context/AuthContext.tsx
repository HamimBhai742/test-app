import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  role?: string;
  provider?: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  loginWithGoogle: (idToken?: string) => Promise<AuthResponse>;
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

  // Sign Up Handler
  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true, message: data.message };
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

  // Google Login Handler
  const loginWithGoogle = async (idToken?: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      // If an ID token was supplied, attempt backend authentication
      if (idToken) {
        const response = await fetch(`${getApiBaseUrl()}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const userData: User = {
            id: data.data.user.id,
            name: data.data.user.name,
            email: data.data.user.email,
            role: data.data.user.role,
            provider: 'google',
            photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
          };
          saveSession(userData, data.data.accessToken);
          return { success: true, message: data.message, user: userData };
        }
      }

      // Default seamless Google Authentication (Mock/Direct Google sign-in profile for demo mode)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const googleUser: User = {
        name: 'Hamim Ahmed (Google)',
        email: 'hamim.google@example.com',
        provider: 'google',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
      };
      saveSession(googleUser, 'mock_google_jwt_token_123');
      return { success: true, user: googleUser };
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, message: 'GOOGLE_SIGNIN_ERROR' };
    } finally {
      setIsLoading(false);
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
        loginWithGoogle,
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


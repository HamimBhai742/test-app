import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';
import { getLocalDateString } from '@/utils/date';

export interface InvestmentLog {
  id: string;
  title: string;
  amount: number;
  date: string;
}

export interface InvestmentProject {
  id: string;
  name: string;
  targetBudget?: number;
  description?: string;
  createdAt: string;
  logs: InvestmentLog[];
}

interface InvestmentContextType {
  investments: InvestmentProject[];
  isLoading: boolean;
  addInvestment: (name: string, targetBudget?: number, description?: string) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  updateInvestment: (id: string, name: string, targetBudget?: number, description?: string) => Promise<void>;
  addLogToInvestment: (investmentId: string, title: string, amount: number, date: string) => Promise<void>;
  deleteLogFromInvestment: (investmentId: string, logId: string) => Promise<void>;
  updateLogInInvestment: (investmentId: string, logId: string, title: string, amount: number, date: string) => Promise<void>;
}

const STORAGE_KEY = '@hisabkitab_investments';

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

const getApiBaseUrl = () => {
  return API_BASE_URL;
};

const getAuthToken = async () => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('hisab_kitab_auth_token') || localStorage.getItem('token');
      }
    } else {
      try {
        return await SecureStore.getItemAsync('hisab_kitab_auth_token');
      } catch {
        return await AsyncStorage.getItem('hisab_kitab_auth_token');
      }
    }
  } catch (e) {
    return null;
  }
  return null;
};

export const InvestmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [investments, setInvestments] = useState<InvestmentProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load investments
  const loadInvestments = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/investments`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            setInvestments(json.data);
            const value = JSON.stringify(json.data);
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
            } else {
              await AsyncStorage.setItem(STORAGE_KEY, value);
            }
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch investments from backend, using local:', e);
    }

    // Fallback to local storage
    try {
      let stored: string | null = null;
      if (Platform.OS === 'web') {
        stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      } else {
        stored = await AsyncStorage.getItem(STORAGE_KEY);
      }

      if (stored) {
        setInvestments(JSON.parse(stored));
      } else {
        setInvestments([]);
      }
    } catch (e) {
      console.warn('Failed to load investments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, []);

  // Save investments locally helper
  const saveInvestmentsLocal = async (updated: InvestmentProject[]) => {
    setInvestments(updated);
    try {
      const value = JSON.stringify(updated);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, value);
        }
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, value);
      }
    } catch (e) {
      console.warn('Failed to save investments locally:', e);
    }
  };

  const addInvestment = async (name: string, targetBudget?: number, description?: string) => {
    const tempId = `temp_${Date.now()}`;
    const newProject: InvestmentProject = {
      id: tempId,
      name,
      targetBudget: targetBudget && targetBudget > 0 ? targetBudget : undefined,
      description,
      createdAt: getLocalDateString(),
      logs: [],
    };
    const updated = [newProject, ...investments];
    await saveInvestmentsLocal(updated);

    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/investments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            targetBudget,
            description,
            createdAt: newProject.createdAt,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            const serverId = json.data.id || json.data._id;
            setInvestments((prev) => {
              const reconciled = prev.map((item) =>
                item.id === tempId ? { ...item, id: serverId } : item
              );
              const value = JSON.stringify(reconciled);
              if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
              } else {
                AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
              }
              return reconciled;
            });
          }
        }
      }
    } catch (e) {
      console.warn('Backend addInvestment failed, saved locally:', e);
    }
  };

  const deleteInvestment = async (id: string) => {
    const updated = investments.filter((item) => item.id !== id);
    await saveInvestmentsLocal(updated);

    if (id.startsWith('temp_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/investments/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Backend deleteInvestment failed, deleted locally:', e);
    }
  };

  const updateInvestment = async (id: string, name: string, targetBudget?: number, description?: string) => {
    const updated = investments.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name,
          targetBudget,
          description,
        };
      }
      return item;
    });
    await saveInvestmentsLocal(updated);

    if (id.startsWith('temp_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/investments/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            targetBudget,
            description,
          }),
        });
      }
    } catch (e) {
      console.warn('Backend updateInvestment failed, updated locally:', e);
    }
  };

  const addLogToInvestment = async (investmentId: string, title: string, amount: number, date: string) => {
    const tempLogId = `temp_log_${Date.now()}`;
    const newLog: InvestmentLog = {
      id: tempLogId,
      title,
      amount,
      date: date || getLocalDateString(),
    };

    const updated = investments.map((project) => {
      if (project.id === investmentId) {
        return {
          ...project,
          logs: [newLog, ...project.logs],
        };
      }
      return project;
    });

    await saveInvestmentsLocal(updated);

    if (investmentId.startsWith('temp_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/investments/${investmentId}/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newLog),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            const serverLogs = json.data.logs;
            if (Array.isArray(serverLogs)) {
              setInvestments((prev) => {
                const reconciled = prev.map((item) =>
                  item.id === investmentId ? { ...item, logs: serverLogs } : item
                );
                const value = JSON.stringify(reconciled);
                if (Platform.OS === 'web') {
                  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
                } else {
                  AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
                }
                return reconciled;
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Backend addLogToInvestment failed, saved locally:', e);
    }
  };

  const deleteLogFromInvestment = async (investmentId: string, logId: string) => {
    const updated = investments.map((project) => {
      if (project.id === investmentId) {
        return {
          ...project,
          logs: project.logs.filter((log) => log.id !== logId),
        };
      }
      return project;
    });

    await saveInvestmentsLocal(updated);

    if (investmentId.startsWith('temp_') || logId.startsWith('temp_log_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/investments/${investmentId}/logs/${logId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Backend deleteLogFromInvestment failed, deleted locally:', e);
    }
  };

  const updateLogInInvestment = async (investmentId: string, logId: string, title: string, amount: number, date: string) => {
    const updated = investments.map((project) => {
      if (project.id === investmentId) {
        const updatedLogs = project.logs.map((log) => {
          if (log.id === logId) {
            return {
              ...log,
              title,
              amount,
              date,
            };
          }
          return log;
        });
        return {
          ...project,
          logs: updatedLogs,
        };
      }
      return project;
    });
    await saveInvestmentsLocal(updated);

    if (investmentId.startsWith('temp_') || logId.startsWith('temp_log_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/investments/${investmentId}/logs/${logId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            amount,
            date,
          }),
        });
      }
    } catch (e) {
      console.warn('Backend updateLogInInvestment failed, updated locally:', e);
    }
  };

  return (
    <InvestmentContext.Provider
      value={{
        investments,
        isLoading,
        addInvestment,
        deleteInvestment,
        updateInvestment,
        addLogToInvestment,
        deleteLogFromInvestment,
        updateLogInInvestment,
      }}
    >
      {children}
    </InvestmentContext.Provider>
  );
};

export const useInvestments = () => {
  const context = useContext(InvestmentContext);
  if (!context) {
    throw new Error('useInvestments must be used within a InvestmentProvider');
  }
  return context;
};


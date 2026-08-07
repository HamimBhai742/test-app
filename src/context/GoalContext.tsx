import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { usePoints } from './PointsContext';
import { useLanguage } from './LanguageContext';
import { translations } from '@/constants/translations';
import { API_BASE_URL } from '@/constants/config';

export interface SavingsLog {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface GoalItem {
  id: string;
  name: string;
  targetAmount: number;
  description?: string;
  isCompleted: boolean;
  pointsAwarded: number;
  createdAt: string;
  history: SavingsLog[];
}

interface GoalContextType {
  goals: GoalItem[];
  isLoading: boolean;
  addGoal: (name: string, targetAmount: number, description?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateGoal: (id: string, name: string, targetAmount: number, description?: string) => Promise<void>;
  addSavings: (goalId: string, amount: number, note?: string, date?: string) => Promise<void>;
  deleteSavings: (goalId: string, savingsLogId: string) => Promise<void>;
  updateSavings: (goalId: string, savingsLogId: string, amount: number, note?: string, date?: string) => Promise<void>;
}

const STORAGE_KEY = '@hisabkitab_goals';

const GoalContext = createContext<GoalContextType | undefined>(undefined);

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

export const GoalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { addPoints } = usePoints();
  const { language } = useLanguage();
  const t = translations[language];

  // Load goals
  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/goals`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            setGoals(json.data);
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
      console.warn('Backend fetch goals failed, using local:', e);
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
        setGoals(JSON.parse(stored));
      } else {
        setGoals([]);
      }
    } catch (e) {
      console.warn('Failed to load goals:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  // Local helper to update state & storage
  const saveGoalsLocal = async (updated: GoalItem[]) => {
    setGoals(updated);
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
      console.warn('Failed to save goals locally:', e);
    }
  };

  const addGoal = async (name: string, targetAmount: number, description?: string) => {
    const pointsAwarded = Math.max(10, Math.floor(targetAmount / 100));
    const tempId = `temp_${Date.now()}`;

    const newGoal: GoalItem = {
      id: tempId,
      name,
      targetAmount,
      description,
      isCompleted: false,
      pointsAwarded,
      createdAt: new Date().toISOString().split('T')[0],
      history: [],
    };
    const updated = [newGoal, ...goals];
    await saveGoalsLocal(updated);

    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/goals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            targetAmount,
            description,
            pointsAwarded,
            createdAt: newGoal.createdAt,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            const serverId = json.data.id || json.data._id;
            setGoals((prev) => {
              const reconciled = prev.map((g) =>
                g.id === tempId ? { ...g, id: serverId } : g
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
      console.warn('Backend addGoal failed, saved locally:', e);
    }
  };

  const deleteGoal = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    await saveGoalsLocal(updated);

    if (id.startsWith('temp_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/goals/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Backend deleteGoal failed, deleted locally:', e);
    }
  };

  const updateGoal = async (id: string, name: string, targetAmount: number, description?: string) => {
    let goalCompletedAward = false;
    let awardedPointsAmount = 0;

    const updated = goals.map((goal) => {
      if (goal.id === id) {
        const saved = goal.history.reduce((sum, log) => sum + log.amount, 0);
        const reachedTarget = saved >= targetAmount;
        const newlyCompleted = reachedTarget && !goal.isCompleted;
        const pointsAwarded = Math.max(10, Math.floor(targetAmount / 100));

        if (newlyCompleted) {
          goalCompletedAward = true;
          awardedPointsAmount = pointsAwarded;
        }

        return {
          ...goal,
          name,
          targetAmount,
          description,
          pointsAwarded,
          isCompleted: reachedTarget,
        };
      }
      return goal;
    });

    await saveGoalsLocal(updated);

    if (goalCompletedAward && awardedPointsAmount > 0) {
      await addPoints(awardedPointsAmount);
      const msg = t.goalCompletedAlert.replace('{points}', awardedPointsAmount.toString());
      Alert.alert(
        language === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!',
        msg,
        [{ text: 'OK' }]
      );
    }

    if (id.startsWith('temp_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        const targetGoal = updated.find((g) => g.id === id);
        if (targetGoal) {
          await fetch(`${getApiBaseUrl()}/goals/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name,
              targetAmount,
              description,
              isCompleted: targetGoal.isCompleted,
            }),
          });
        }
      }
    } catch (e) {
      console.warn('Backend updateGoal failed, updated locally:', e);
    }
  };

  const addSavings = async (goalId: string, amount: number, note?: string, date?: string) => {
    const tempLogId = `temp_log_${Date.now()}`;
    const newLog: SavingsLog = {
      id: tempLogId,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      note,
    };

    let goalCompletedAward = false;
    let awardedPointsAmount = 0;

    const updated = goals.map((goal) => {
      if (goal.id === goalId) {
        const currentSaved = goal.history.reduce((sum, h) => sum + h.amount, 0);
        const newTotal = currentSaved + amount;
        const reachedTarget = newTotal >= goal.targetAmount;
        const newlyCompleted = reachedTarget && !goal.isCompleted;

        if (newlyCompleted) {
          goalCompletedAward = true;
          awardedPointsAmount = goal.pointsAwarded;
        }

        return {
          ...goal,
          isCompleted: reachedTarget ? true : goal.isCompleted,
          history: [newLog, ...goal.history],
        };
      }
      return goal;
    });

    await saveGoalsLocal(updated);

    if (goalCompletedAward && awardedPointsAmount > 0) {
      await addPoints(awardedPointsAmount);
      const msg = t.goalCompletedAlert.replace('{points}', awardedPointsAmount.toString());
      Alert.alert(
        language === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!',
        msg,
        [{ text: 'OK' }]
      );
    }

    if (goalId.startsWith('temp_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        const response = await fetch(`${getApiBaseUrl()}/goals/${goalId}/savings`, {
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
            const serverLogs = json.data.history;
            if (Array.isArray(serverLogs)) {
              setGoals((prev) => {
                const reconciled = prev.map((g) =>
                  g.id === goalId ? { ...g, history: serverLogs } : g
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
      console.warn('Backend addSavings failed, saved locally:', e);
    }
  };

  const deleteSavings = async (goalId: string, savingsLogId: string) => {
    const updated = goals.map((goal) => {
      if (goal.id === goalId) {
        const filteredHistory = goal.history.filter((log) => log.id !== savingsLogId);
        const newTotal = filteredHistory.reduce((sum, h) => sum + h.amount, 0);
        const reachedTarget = newTotal >= goal.targetAmount;

        return {
          ...goal,
          isCompleted: reachedTarget,
          history: filteredHistory,
        };
      }
      return goal;
    });

    await saveGoalsLocal(updated);

    if (goalId.startsWith('temp_') || savingsLogId.startsWith('temp_log_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/goals/${goalId}/savings/${savingsLogId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.warn('Backend deleteSavings failed, deleted locally:', e);
    }
  };

  const updateSavings = async (goalId: string, savingsLogId: string, amount: number, note?: string, date?: string) => {
    let goalCompletedAward = false;
    let awardedPointsAmount = 0;

    const updated = goals.map((goal) => {
      if (goal.id === goalId) {
        const updatedHistory = goal.history.map((log) => {
          if (log.id === savingsLogId) {
            return {
              ...log,
              amount,
              date: date || new Date().toISOString().split('T')[0],
              note,
            };
          }
          return log;
        });

        const newTotal = updatedHistory.reduce((sum, h) => sum + h.amount, 0);
        const reachedTarget = newTotal >= goal.targetAmount;
        const newlyCompleted = reachedTarget && !goal.isCompleted;

        if (newlyCompleted) {
          goalCompletedAward = true;
          awardedPointsAmount = goal.pointsAwarded;
        }

        return {
          ...goal,
          isCompleted: reachedTarget ? true : goal.isCompleted,
          history: updatedHistory,
        };
      }
      return goal;
    });

    await saveGoalsLocal(updated);

    if (goalCompletedAward && awardedPointsAmount > 0) {
      await addPoints(awardedPointsAmount);
      const msg = t.goalCompletedAlert.replace('{points}', awardedPointsAmount.toString());
      Alert.alert(
        language === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!',
        msg,
        [{ text: 'OK' }]
      );
    }

    if (goalId.startsWith('temp_') || savingsLogId.startsWith('temp_log_')) return;

    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/goals/${goalId}/savings/${savingsLogId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount,
            note,
            date: date || new Date().toISOString().split('T')[0],
          }),
        });
      }
    } catch (e) {
      console.warn('Backend updateSavings failed, updated locally:', e);
    }
  };

  return (
    <GoalContext.Provider
      value={{
        goals,
        isLoading,
        addGoal,
        deleteGoal,
        updateGoal,
        addSavings,
        deleteSavings,
        updateSavings,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
};


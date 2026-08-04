import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePoints } from './PointsContext';
import { useLanguage } from './LanguageContext';
import { translations } from '@/constants/translations';

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

  // Save goals
  const saveGoals = async (updated: GoalItem[]) => {
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
      console.warn('Failed to save goals:', e);
    }
  };

  const addGoal = async (name: string, targetAmount: number, description?: string) => {
    // Automatically calculate reward points as 1% of target savings amount (minimum 10 points)
    const pointsAwarded = Math.max(10, Math.floor(targetAmount / 100));

    const newGoal: GoalItem = {
      id: Date.now().toString(),
      name,
      targetAmount,
      description,
      isCompleted: false,
      pointsAwarded,
      createdAt: new Date().toISOString().split('T')[0],
      history: [],
    };
    const updated = [newGoal, ...goals];
    await saveGoals(updated);
  };

  const deleteGoal = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    await saveGoals(updated);
  };

  const updateGoal = async (id: string, name: string, targetAmount: number, description?: string) => {
    let goalCompletedAward = false;
    let awardedPointsAmount = 0;

    const updated = goals.map((goal) => {
      if (goal.id === id) {
        const saved = goal.history.reduce((sum, log) => sum + log.amount, 0);
        const reachedTarget = saved >= targetAmount;
        const newlyCompleted = reachedTarget && !goal.isCompleted;

        // Recalculate automatic points
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

    await saveGoals(updated);

    if (goalCompletedAward && awardedPointsAmount > 0) {
      await addPoints(awardedPointsAmount);
      const msg = t.goalCompletedAlert.replace('{points}', awardedPointsAmount.toString());
      Alert.alert(
        language === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!',
        msg,
        [{ text: 'OK' }]
      );
    }
  };

  const addSavings = async (goalId: string, amount: number, note?: string, date?: string) => {
    const newLog: SavingsLog = {
      id: Date.now().toString(),
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

    await saveGoals(updated);

    if (goalCompletedAward && awardedPointsAmount > 0) {
      // Award reward points
      await addPoints(awardedPointsAmount);
      
      // Congratulate user
      const msg = t.goalCompletedAlert.replace('{points}', awardedPointsAmount.toString());
      Alert.alert(
        language === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!',
        msg,
        [{ text: 'OK' }]
      );
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

    await saveGoals(updated);
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

    await saveGoals(updated);

    if (goalCompletedAward && awardedPointsAmount > 0) {
      await addPoints(awardedPointsAmount);
      const msg = t.goalCompletedAlert.replace('{points}', awardedPointsAmount.toString());
      Alert.alert(
        language === 'bn' ? '🎉 অভিনন্দন!' : '🎉 Congratulations!',
        msg,
        [{ text: 'OK' }]
      );
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

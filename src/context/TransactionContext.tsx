import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { triggerBudgetWarning } from '@/services/notificationService';
import { API_BASE_URL } from '@/constants/config';
import { DEFAULT_BUDGETS as SHARED_DEFAULT_BUDGETS } from '@/constants/budgetDefaults';
import { getLocalDateString } from '@/utils/date';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

// Get Base API URL based on platform & Expo host IP
const getApiBaseUrl = () => {
  return API_BASE_URL;
};

// Authentication token is retrieved from AuthContext instead of raw storage

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { token, logout } = useAuth();

  // Fetch transactions from Backend API
  const fetchTransactions = async () => {
    if (!token) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${getApiBaseUrl()}/transactions`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.data)) {
        const mappedTx: Transaction[] = data.data.map((item: any) => ({
          id: item.id || item._id,
          title: item.title,
          amount: Number(item.amount),
          type: item.type,
          category: item.category || 'Others',
          date: item.date ||
            (item.createdAt ? item.createdAt.toString().split('T')[0] : getLocalDateString()),
        }));
        setTransactions(mappedTx);
      } else if (response.status === 401 || response.status === 403) {
        await logout();
      }
    } catch (error) {
      console.warn('Backend fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  // Helper to check and trigger budget notifications
  const checkBudgetNotification = async (
    currentTx: Omit<Transaction, 'id'>,
    allTransactions: Transaction[]
  ) => {
    if (currentTx.type !== 'expense') return;

    try {
      // 1. Load user's custom budgets from AsyncStorage
      const storedBudgets = await AsyncStorage.getItem('hisabkitab_budgets');
      // Default budgets matching explore.tsx
      const defaultBudgets: Record<string, number> = {
        Food: 3000,
        Shopping: 4000,
        Utilities: 2500,
        Rent: 12000,
        Entertainment: 500,
        Transport: 2500,
        Health: 2000,
        Education: 3000,
        Bills: 1800,
        Others: 1000,
      };
      const budgets: Record<string, number> = storedBudgets ? JSON.parse(storedBudgets) : SHARED_DEFAULT_BUDGETS;

      // 2. Filter transactions for the current month's expenses
      const getMonthKey = (dateStr?: string) => {
        if (!dateStr) return '';
        return dateStr.substring(0, 7); // returns "YYYY-MM"
      };
      const currentMonth = getMonthKey(currentTx.date) || getMonthKey(new Date().toISOString());

      const monthExpenses = allTransactions.filter(
        (t) => t.type === 'expense' && getMonthKey(t.date) === currentMonth
      );

      // Sum up expenses for the current month including the new transaction
      const catSpent = monthExpenses
        .filter((t) => t.category === currentTx.category)
        .reduce((sum, t) => sum + t.amount, 0) + Number(currentTx.amount);

      const totalSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0) + Number(currentTx.amount);

      // Get budget targets
      const catBudget = budgets[currentTx.category] ?? 0;
      const totalBudget: number = Object.values(budgets).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;

      // 3. Load triggered alerts cache to prevent spamming
      const storedAlerts = await AsyncStorage.getItem('hisabkitab_triggered_alerts');
      let alertsCache = storedAlerts ? JSON.parse(storedAlerts) : { month: currentMonth, alerts: {} };

      // Reset cache if month changes
      if (alertsCache.month !== currentMonth) {
        alertsCache = { month: currentMonth, alerts: {} };
      }

      const checkAndTrigger = async (
        spent: number,
        budget: number,
        nameKey: string,
        displayName?: string
      ) => {
        if (budget <= 0) return;
        const percent = (spent / budget) * 100;
        
        let thresholdCrossed: number | null = null;
        if (percent >= 100) {
          thresholdCrossed = 100;
        } else if (percent >= 90) {
          thresholdCrossed = 90;
        } else if (percent >= 80) {
          thresholdCrossed = 80;
        }

        if (thresholdCrossed !== null) {
          const cacheKey = `${nameKey}_${thresholdCrossed}`;
          if (!alertsCache.alerts[cacheKey]) {
            // Trigger the alert
            await triggerBudgetWarning(spent, budget, percent, displayName);
            // Save state
            alertsCache.alerts[cacheKey] = true;
          }
        }
      };

      // Check Category-wise Budget Warning
      if (catBudget > 0) {
        await checkAndTrigger(catSpent, catBudget, `category_${currentTx.category}`, currentTx.category);
      }

      // Check Overall Budget Warning
      if (totalBudget > 0) {
        await checkAndTrigger(totalSpent, totalBudget, 'global');
      }

      // Save triggered alerts
      await AsyncStorage.setItem('hisabkitab_triggered_alerts', JSON.stringify(alertsCache));
    } catch (error) {
      console.warn('Error checking budget notifications:', error);
    }
  };

  // Helper to cleanup triggered alerts when expenses decrease (e.g. deletion)
  const cleanupTriggeredAlerts = async (allTransactions: Transaction[]) => {
    try {
      const storedBudgets = await AsyncStorage.getItem('hisabkitab_budgets');
      const defaultBudgets: Record<string, number> = {
        Food: 3000,
        Shopping: 4000,
        Utilities: 2500,
        Rent: 12000,
        Entertainment: 500,
        Transport: 2500,
        Health: 2000,
        Education: 3000,
        Bills: 1800,
        Others: 1000,
      };
      const budgets: Record<string, number> = storedBudgets ? JSON.parse(storedBudgets) : SHARED_DEFAULT_BUDGETS;

      const getMonthKey = (dateStr?: string) => {
        if (!dateStr) return '';
        return dateStr.substring(0, 7);
      };
      const currentMonth = getMonthKey(new Date().toISOString());

      const monthExpenses = allTransactions.filter(
        (t) => t.type === 'expense' && getMonthKey(t.date) === currentMonth
      );

      const totalSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
      const totalBudget: number = Object.values(budgets).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;

      const storedAlerts = await AsyncStorage.getItem('hisabkitab_triggered_alerts');
      if (!storedAlerts) return;
      let alertsCache = JSON.parse(storedAlerts);

      if (alertsCache.month !== currentMonth) return;

      const cleanAlerts: Record<string, boolean> = { ...alertsCache.alerts };

      const verifyAndClean = (spent: number, budget: number, nameKey: string) => {
        if (budget <= 0) return;
        const percent = (spent / budget) * 100;
        
        if (percent < 100) delete cleanAlerts[`${nameKey}_100`];
        if (percent < 90) delete cleanAlerts[`${nameKey}_90`];
        if (percent < 80) delete cleanAlerts[`${nameKey}_80`];
      };

      // Clean global alerts
      verifyAndClean(totalSpent, totalBudget, 'global');

      // Clean category alerts
      Object.keys(budgets).forEach((cat) => {
        const catSpent = monthExpenses
          .filter((t) => t.category === cat)
          .reduce((sum, t) => sum + t.amount, 0);
        const catBudget = budgets[cat] ?? 0;
        verifyAndClean(catSpent, catBudget, `category_${cat}`);
      });

      alertsCache.alerts = cleanAlerts;
      await AsyncStorage.setItem('hisabkitab_triggered_alerts', JSON.stringify(alertsCache));
    } catch (error) {
      console.warn('Error cleaning up triggered alerts:', error);
    }
  };

  // Add Transaction to Backend API & MongoDB
  const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    const optimisticTx: Transaction = { ...newTx, id: tempId };

    setTransactions((prev) => [optimisticTx, ...prev]);

    // Budget warning check for new expenses
    checkBudgetNotification(newTx, transactions).catch(() => {});

    try {
      if (!token) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${getApiBaseUrl()}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newTx),
      });

      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const savedTx: Transaction = {
          id: data.data.id || data.data._id,
          title: data.data.title,
          amount: Number(data.data.amount),
          type: data.data.type,
          category: data.data.category || 'Others',
          // Fallback: use createdAt date if 'date' field is missing
          date: data.data.date ||
            (data.data.createdAt ? data.data.createdAt.toString().split('T')[0] : getLocalDateString()),
        };
        setTransactions((prev) => prev.map((t) => (t.id === tempId ? savedTx : t)));
      }
    } catch (error) {
      console.warn('Error adding transaction to backend:', error);
    }
  };

  // Update Transaction in Backend API & MongoDB
  const updateTransaction = async (id: string, updatedTx: Omit<Transaction, 'id'>) => {
    // Optimistic UI update
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...updatedTx, id } : t))
    );

    try {
      if (!token) return;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${getApiBaseUrl()}/transactions/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updatedTx),
      });

      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const savedTx: Transaction = {
          id: data.data.id || data.data._id,
          title: data.data.title,
          amount: Number(data.data.amount),
          type: data.data.type,
          category: data.data.category || 'Others',
          date: data.data.date ||
            (data.data.createdAt ? data.data.createdAt.toString().split('T')[0] : getLocalDateString()),
        };
        setTransactions((prev) => prev.map((t) => (t.id === id ? savedTx : t)));
      }
    } catch (error) {
      console.warn('Error updating transaction:', error);
    }
  };

  // Delete Transaction from Backend API & MongoDB
  const deleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTransactions);

    // Recalculate and clean up triggered alerts cache based on updated transactions
    cleanupTriggeredAlerts(updatedTransactions).catch(() => {});

    try {
      if (!token) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      await fetch(`${getApiBaseUrl()}/transactions/${id}`, {
        method: 'DELETE',
        headers,
      });
    } catch (error) {
      console.warn('Error deleting transaction from backend:', error);
    }
  };

  // Delete All Transactions from Backend API & MongoDB
  const deleteAllTransactions = async () => {
    setTransactions([]);

    try {
      if (!token) return;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      await fetch(`${getApiBaseUrl()}/transactions/all`, {
        method: 'DELETE',
        headers,
      });
    } catch (error) {
      console.warn('Error clearing transactions from backend:', error);
    }
  };

  // Calculate totals dynamically using useMemo
  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += Number(tx.amount);
      } else {
        expenses += Number(tx.amount);
      }
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalBalance: income - expenses,
    };
  }, [transactions]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        isLoading,
        totalBalance: stats.totalBalance,
        totalIncome: stats.totalIncome,
        totalExpenses: stats.totalExpenses,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteAllTransactions,
        refreshTransactions: fetchTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};

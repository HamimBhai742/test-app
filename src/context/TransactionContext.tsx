import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { triggerBudgetWarning } from '@/services/notificationService';

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
  deleteTransaction: (id: string) => Promise<void>;
  deleteAllTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

// Get Base API URL based on platform & Expo host IP
const getApiBaseUrl = () => {
  return 'http://52.221.243.198:5042/api/v1';
};

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch transactions from Backend API
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('hisab_kitab_auth_token') || '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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
          category: item.category,
          date: item.date,
        }));
        setTransactions(mappedTx);
      }
    } catch (error) {
      console.warn('Backend fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Add Transaction to Backend API & MongoDB
  const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const tempId = Math.random().toString(36).substring(2, 9);
    const optimisticTx: Transaction = { ...newTx, id: tempId };

    setTransactions((prev) => [optimisticTx, ...prev]);

    // Budget warning check for new expenses
    if (newTx.type === 'expense') {
      const currentExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const newTotalExpense = currentExpenses + Number(newTx.amount);
      const defaultMonthlyBudget = 50000;
      const percent = (newTotalExpense / defaultMonthlyBudget) * 100;
      if (percent >= 80) {
        triggerBudgetWarning(newTotalExpense, defaultMonthlyBudget, percent);
      }
    }

    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('hisab_kitab_auth_token') || '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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
          category: data.data.category,
          date: data.data.date,
        };
        setTransactions((prev) => prev.map((t) => (t.id === tempId ? savedTx : t)));
      }
    } catch (error) {
      console.warn('Error adding transaction to backend:', error);
    }
  };

  // Delete Transaction from Backend API & MongoDB
  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('hisab_kitab_auth_token') || '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('hisab_kitab_auth_token') || '';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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

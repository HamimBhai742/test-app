import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: 'Food' | 'Shopping' | 'Utilities' | 'Rent' | 'Entertainment' | 'Salary' | 'Others';
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

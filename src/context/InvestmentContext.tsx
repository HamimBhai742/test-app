import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const InvestmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [investments, setInvestments] = useState<InvestmentProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load investments
  const loadInvestments = async () => {
    setIsLoading(true);
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

  // Save investments
  const saveInvestments = async (updated: InvestmentProject[]) => {
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
      console.warn('Failed to save investments:', e);
    }
  };

  const addInvestment = async (name: string, targetBudget?: number, description?: string) => {
    const newProject: InvestmentProject = {
      id: Date.now().toString(),
      name,
      targetBudget: targetBudget && targetBudget > 0 ? targetBudget : undefined,
      description,
      createdAt: new Date().toISOString().split('T')[0],
      logs: [],
    };
    const updated = [newProject, ...investments];
    await saveInvestments(updated);
  };

  const deleteInvestment = async (id: string) => {
    const updated = investments.filter((item) => item.id !== id);
    await saveInvestments(updated);
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
    await saveInvestments(updated);
  };

  const addLogToInvestment = async (investmentId: string, title: string, amount: number, date: string) => {
    const newLog: InvestmentLog = {
      id: Date.now().toString(),
      title,
      amount,
      date: date || new Date().toISOString().split('T')[0],
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

    await saveInvestments(updated);
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

    await saveInvestments(updated);
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
    await saveInvestments(updated);
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
    throw new Error('useInvestments must be used within an InvestmentProvider');
  }
  return context;
};

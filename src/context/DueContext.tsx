import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { scheduleDueReminder, cancelDueReminder } from '@/services/notificationService';

export interface DueItem {
  id: string;
  personName: string;
  phone?: string;
  amount: number;
  type: 'receivable' | 'payable'; // 'receivable' = পাওনা (পাবো), 'payable' = দেনা (দেবো)
  note?: string;
  dueDate?: string;
  isSettled: boolean;
  createdAt: string;
}

interface DueContextType {
  dues: DueItem[];
  isLoading: boolean;
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
  addDue: (item: Omit<DueItem, 'id' | 'isSettled' | 'createdAt'>) => Promise<void>;
  settleDue: (id: string) => Promise<void>;
  deleteDue: (id: string) => Promise<void>;
  refreshDues: () => Promise<void>;
}

const STORAGE_KEY = '@hisabkitab_dues';

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
    console.warn('Could not determine host IP:', e);
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api/v1';
  }
  return 'http://localhost:5001/api/v1';
};

const DEFAULT_DUES: DueItem[] = [
  {
    id: '1',
    personName: 'রফিক হোসেন',
    phone: '01712345678',
    amount: 3000,
    type: 'receivable',
    note: 'বাজারের বাকির টাকা',
    dueDate: '2026-08-10',
    isSettled: false,
    createdAt: '2026-07-28',
  },
  {
    id: '2',
    personName: 'মেস ম্যানেজার (তানভীর)',
    phone: '01887654321',
    amount: 1500,
    type: 'payable',
    note: 'জুলাই মাসের গ্যাস বিল',
    dueDate: '2026-08-05',
    isSettled: false,
    createdAt: '2026-07-30',
  },
];

const DueContext = createContext<DueContextType | undefined>(undefined);

export function DueProvider({ children }: { children: React.ReactNode }) {
  const [dues, setDues] = useState<DueItem[]>(DEFAULT_DUES);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const saveLocal = (items: DueItem[]) => {
    setDues(items);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {}
    }
  };

  const fetchDues = async () => {
    setIsLoading(true);
    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('token') || '';
      }
      const response = await fetch(`${getApiBaseUrl()}/dues`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          saveLocal(json.data);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend fetch dues failed, using local dues:', e);
    }

    // Fallback to local storage
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setDues(JSON.parse(stored));
      } catch (e) {}
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const addDue = async (item: Omit<DueItem, 'id' | 'isSettled' | 'createdAt'>) => {
    const newItem: DueItem = {
      ...item,
      id: Date.now().toString(),
      isSettled: false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newItem, ...dues];
    saveLocal(updated);

    if (newItem.dueDate) {
      scheduleDueReminder(newItem.id, newItem.personName, newItem.amount, newItem.dueDate, newItem.type);
    }

    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('token') || '';
      }
      const response = await fetch(`${getApiBaseUrl()}/dues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          fetchDues();
        }
      }
    } catch (e) {
      console.warn('Backend create due failed, saved locally:', e);
    }
  };

  const settleDue = async (id: string) => {
    const updated = dues.map((d) => (d.id === id ? { ...d, isSettled: !d.isSettled } : d));
    saveLocal(updated);
    cancelDueReminder(id);

    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('token') || '';
      }
      await fetch(`${getApiBaseUrl()}/dues/${id}/settle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (e) {
      console.warn('Backend settle due failed, saved locally:', e);
    }
  };

  const deleteDue = async (id: string) => {
    const updated = dues.filter((d) => d.id !== id);
    saveLocal(updated);
    cancelDueReminder(id);

    try {
      let token = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        token = localStorage.getItem('token') || '';
      }
      await fetch(`${getApiBaseUrl()}/dues/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (e) {
      console.warn('Backend delete due failed, saved locally:', e);
    }
  };

  const totalReceivable = dues
    .filter((d) => d.type === 'receivable' && !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0);

  const totalPayable = dues
    .filter((d) => d.type === 'payable' && !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0);

  const netBalance = totalReceivable - totalPayable;

  return (
    <DueContext.Provider
      value={{
        dues,
        isLoading,
        totalReceivable,
        totalPayable,
        netBalance,
        addDue,
        settleDue,
        deleteDue,
        refreshDues: fetchDues,
      }}
    >
      {children}
    </DueContext.Provider>
  );
}

export function useDues() {
  const context = useContext(DueContext);
  if (!context) {
    throw new Error('useDues must be used within a DueProvider');
  }
  return context;
}

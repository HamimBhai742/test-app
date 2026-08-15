import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { scheduleDueReminder, cancelDueReminder } from '@/services/notificationService';
import { API_BASE_URL } from '@/constants/config';
import { getLocalDateString } from '@/utils/date';

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
  updateDue: (id: string, item: Partial<Omit<DueItem, 'id' | 'createdAt'>>) => Promise<void>;
  refreshDues: () => Promise<void>;
}

const STORAGE_KEY = '@hisabkitab_dues';

const DEFAULT_DUES: DueItem[] = [];

const DueContext = createContext<DueContextType | undefined>(undefined);

export function DueProvider({ children }: { children: React.ReactNode }) {
  const [dues, setDues] = useState<DueItem[]>(DEFAULT_DUES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { token, logout } = useAuth();

  const saveLocal = (items: DueItem[]) => {
    setDues(items);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {}
    } else {
      // Mobile — persist to AsyncStorage
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
    }
  };

  const fetchDues = async () => {
    if (!token) {
      setDues([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dues`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          saveLocal(json.data);
          setIsLoading(false);
          return;
        }
      } else if (response.status === 401 || response.status === 403) {
        await logout();
        setDues([]);
        setIsLoading(false);
        return;
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
    } else {
      // Mobile (iOS/Android) — use AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setDues(JSON.parse(stored));
      } catch (e) {}
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDues();
  }, [token]);

  const addDue = async (item: Omit<DueItem, 'id' | 'isSettled' | 'createdAt'>) => {
    const tempId = `temp_${Date.now()}`;
    const newItem: DueItem = {
      ...item,
      id: tempId,
      isSettled: false,
      createdAt: getLocalDateString(),
    };

    const updated = [newItem, ...dues];
    saveLocal(updated);

    if (newItem.dueDate) {
      scheduleDueReminder(newItem.id, newItem.personName, newItem.amount, newItem.dueDate, newItem.type);
    }

    try {
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/dues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const serverId: string = json.data.id || json.data._id || tempId;
          // Replace temp ID with real server ID in local state
          setDues((prev) => {
            const reconciled = prev.map((d) =>
              d.id === tempId ? { ...d, id: serverId } : d
            );
            // Also update the notification reminder to use the real server ID
            if (newItem.dueDate && serverId !== tempId) {
              cancelDueReminder(tempId);
              scheduleDueReminder(serverId, newItem.personName, newItem.amount, newItem.dueDate, newItem.type);
            }
            return reconciled;
          });
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
      if (!token) return;
      await fetch(`${API_BASE_URL}/dues/${id}/settle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      if (!token) return;
      await fetch(`${API_BASE_URL}/dues/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn('Backend delete due failed, saved locally:', e);
    }
  };

  const updateDue = async (id: string, updatedFields: Partial<Omit<DueItem, 'id' | 'createdAt'>>) => {
    const updated = dues.map((d) => (d.id === id ? { ...d, ...updatedFields } : d));
    saveLocal(updated);

    // Cancel old reminder and schedule new reminder if dueDate or details changed
    const targetDue = updated.find((d) => d.id === id);
    if (targetDue) {
      cancelDueReminder(id);
      if (targetDue.dueDate && !targetDue.isSettled) {
        scheduleDueReminder(id, targetDue.personName, targetDue.amount, targetDue.dueDate, targetDue.type);
      }
    }

    if (id.startsWith('temp_')) return;

    try {
      if (!token) return;
      await fetch(`${API_BASE_URL}/dues/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });
    } catch (e) {
      console.warn('Backend update due failed, updated locally:', e);
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
        updateDue,
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

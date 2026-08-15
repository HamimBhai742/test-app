import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { formatNumber, getCurrencySymbol } from '@/utils/number';

export interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  nextRunDate: string;
  isActive: boolean;
}

interface RecurringModalProps {
  visible: boolean;
  onClose: () => void;
  onAddTransaction: (tx: { title: string; amount: number; type: 'income' | 'expense'; category: string; date: string }) => void;
}

export function RecurringModal({ visible, onClose, onAddTransaction }: RecurringModalProps) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const { token } = useAuth();

  const [recurringList, setRecurringList] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>('Rent');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const fetchRecurring = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/recurring`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRecurringList(json.data);
      }
    } catch (e) {
      console.warn('Error fetching recurring:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchRecurring();
    }
  }, [visible, token]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(language === 'bn' ? 'ভুল টাইটেল' : 'Invalid Title', language === 'bn' ? 'টাইটেল বা বিবরণ লিখুন' : 'Enter schedule title');
      return;
    }
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert(language === 'bn' ? 'ভুল পরিমাণ' : 'Invalid Amount', language === 'bn' ? 'সঠিক টাকা পরিমাণ লিখুন' : 'Enter valid amount');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`${API_BASE_URL}/recurring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: numAmt,
          type,
          category,
          frequency,
          startDate: todayStr,
          nextRunDate: todayStr,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRecurringList((prev) => [json.data, ...prev]);
        setShowAddForm(false);
        setTitle('');
        setAmount('');
      }
    } catch (e) {
      console.warn('Error creating recurring:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/recurring/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecurringList((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.warn('Error deleting recurring:', e);
    }
  };

  const handleExecuteNow = (item: RecurringItem) => {
    const todayStr = new Date().toISOString().split('T')[0];
    onAddTransaction({
      title: `${item.title} (${language === 'bn' ? 'অটো-সরাসরি' : 'Recurring'})`,
      amount: item.amount,
      type: item.type,
      category: item.category,
      date: todayStr,
    });
    Alert.alert(
      language === 'bn' ? 'সফল!' : 'Success!',
      language === 'bn' ? 'লেনদেনটি সফলভাবে যুক্ত করা হয়েছে' : 'Recurring transaction logged into ledger'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              🔁 {language === 'bn' ? 'রিঅ্যাকারিং লেনদেন (Recurring)' : 'Recurring Transactions'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ fontSize: 18, color: theme.text }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 14 }}>
            {language === 'bn'
              ? 'বাড়ি ভাড়া, বেতন, সাবস্ক্রিপশন ইত্যাদি নির্দিষ্ট বিরতিতে অটোমেশন করুন'
              : 'Automate monthly rent, salary, subscriptions and recurring bills'}
          </Text>

          {showAddForm ? (
            /* Add Form */
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder={language === 'bn' ? 'টাইটেল (যেমন: বাড়ি ভাড়া, বেতন)' : 'Title (e.g. House Rent)'}
                  placeholderTextColor="#64748B"
                  value={title}
                  onChangeText={setTitle}
                />

                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder={language === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />

                {/* Type Selection */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.typeChip,
                      type === 'expense' ? { backgroundColor: '#EF4444' } : { backgroundColor: theme.backgroundSelected },
                    ]}
                    onPress={() => setType('expense')}
                  >
                    <Text style={{ color: type === 'expense' ? '#FFF' : theme.text, fontWeight: '600', fontSize: 13 }}>
                      {language === 'bn' ? 'ব্যয় (Expense)' : 'Expense'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeChip,
                      type === 'income' ? { backgroundColor: '#10B981' } : { backgroundColor: theme.backgroundSelected },
                    ]}
                    onPress={() => setType('income')}
                  >
                    <Text style={{ color: type === 'income' ? '#FFF' : theme.text, fontWeight: '600', fontSize: 13 }}>
                      {language === 'bn' ? 'আয় (Income)' : 'Income'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Frequency selection */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.freqChip,
                        frequency === f ? { backgroundColor: '#208AEF' } : { backgroundColor: theme.backgroundSelected },
                      ]}
                      onPress={() => setFrequency(f)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: frequency === f ? '#FFF' : theme.text }}>
                        {f === 'daily' ? 'দৈনিক' : f === 'weekly' ? 'সাপ্তাহিক' : f === 'monthly' ? 'মাসিক' : 'বার্ষিক'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.backgroundSelected, flex: 1 }]}
                    onPress={() => setShowAddForm(false)}
                  >
                    <Text style={{ color: theme.text }}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: '#208AEF', flex: 1 }]}
                    onPress={handleCreate}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>✓ {language === 'bn' ? 'সেভ করুন' : 'Save Schedule'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            /* Recurring Schedule List */
            <>
              {loading ? (
                <ActivityIndicator color="#208AEF" style={{ marginVertical: 30 }} />
              ) : recurringList.length === 0 ? (
                <View style={{ alignItems: 'center', marginVertical: 30 }}>
                  <Text style={{ fontSize: 36 }}>🔁</Text>
                  <Text style={{ color: theme.textSecondary, marginTop: 8, fontSize: 13 }}>
                    {language === 'bn' ? 'কোনো রিঅ্যাকারিং শিডিউল নেই' : 'No recurring schedules yet'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 10 }}>
                    {recurringList.map((item) => (
                      <View
                        key={item.id}
                        style={[styles.itemCard, { backgroundColor: theme.backgroundSelected }]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                            <View style={{ backgroundColor: item.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: item.type === 'income' ? '#10B981' : '#EF4444' }}>
                                {item.frequency.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 13, color: item.type === 'income' ? '#10B981' : '#EF4444', fontWeight: '700', marginTop: 2 }}>
                            {item.type === 'income' ? '+' : '-'}{getCurrencySymbol()}{formatNumber(item.amount)}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{ backgroundColor: '#208AEF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                            onPress={() => handleExecuteNow(item)}
                          >
                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>⚡ অ্যাড</Text>
                          </TouchableOpacity>

                          <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Feather name="trash-2" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#208AEF', marginTop: 14 }]}
                onPress={() => setShowAddForm(true)}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>
                  + {language === 'bn' ? 'নতুন শিডিউল যোগ করুন' : 'Add Recurring Schedule'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  input: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});

import { formatNumber, getCurrencySymbol, toBanglaDigits, toEnglishDigits } from '@/utils/number';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Platform,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  Alert,
  FlatList,
  SectionList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// প্রজেক্টের থিম ও কাস্টম থিমড কম্পোনেন্ট ইমপোর্ট করা হচ্ছে।
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
// ট্রানজেকশন সম্পর্কিত স্টেট ও টাইপ ইমপোর্ট করা হচ্ছে।
import { useTransactions, Transaction } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';


import { translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/ThemeContext';
import { usePoints } from '@/context/PointsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '@/utils/date';
import { useNotificationBanner } from '@/context/NotificationBannerContext';
import { RecurringModal } from '@/components/recurring-modal';

const CUSTOM_CATS_KEY = 'hisabkitab_custom_categories_home';
const LAST_SELECTED_CAT_KEY = 'hisabkitab_last_selected_category';

export default function HomeScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  // useTransactions কাস্টম হুক ব্যবহার করে ব্যালেন্স, মোট আয়, মোট ব্যয় এবং ট্রানজেকশন ডেটা আনা হচ্ছে।
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { claimDailyTxReward } = usePoints();

  // নতুন লেনদেন যোগ করার পপ-আপ (Modal) দেখানোর জন্য স্টেট।
  const [modalVisible, setModalVisible] = useState(false);

  // নতুন ট্রানজেকশন ফর্মের ইনপুট ফিল্ডগুলোর স্টেট।
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [lastSelectedCategory, setLastSelectedCategory] = useState<string>('Food');
  const [category, setCategory] = useState<string>('Food');
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Custom categories state created by user
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  // Edit transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Notification center state
  const { notifications, clearAll, markAllAsRead, markAsRead } = useNotificationBanner();
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'today' | 'month' | 'total'>('total');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showRecurringModal, setShowRecurringModal] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterSort, setFilterSort] = useState<'date_desc' | 'date_asc' | 'amount_high' | 'amount_low'>('date_desc');

  const getCurrentMonthName = () => {
    const monthsBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    return language === 'bn' ? monthsBn[currentMonthIdx] : monthsEn[currentMonthIdx];
  };

  // Sync custom categories from both HomeScreen and Budget Planner storages whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      const syncCategories = async () => {
        try {
          const storedHome = await AsyncStorage.getItem(CUSTOM_CATS_KEY);
          const storedBudget = await AsyncStorage.getItem('hisabkitab_categories');
          const storedLastCat = await AsyncStorage.getItem(LAST_SELECTED_CAT_KEY);

          if (storedLastCat) {
            setLastSelectedCategory(storedLastCat);
          }

          let combinedSet = new Set<string>();

          if (storedHome) {
            try {
              const arr = JSON.parse(storedHome);
              if (Array.isArray(arr)) arr.forEach((k: string) => k && combinedSet.add(k));
            } catch {}
          }

          if (storedBudget) {
            try {
              const arr = JSON.parse(storedBudget);
              if (Array.isArray(arr)) {
                arr.forEach((c: any) => {
                  const key = c.key || c.label;
                  const defaultKeys = ['Food', 'Shopping', 'Utilities', 'Rent', 'Entertainment', 'Salary', 'Transport', 'Health', 'Education', 'Bills', 'Others'];
                  if (key && !defaultKeys.includes(key)) {
                    combinedSet.add(key);
                  }
                });
              }
            } catch {}
          }

          const merged = Array.from(combinedSet);
          setCustomCategories(merged);
          AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(merged)).catch(() => {});
        } catch (e) {
          console.warn('Error syncing categories:', e);
        }
      };
      syncCategories();
    }, [])
  );

  // Persist custom categories whenever they change
  useEffect(() => {
    AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(customCategories)).catch(() => {});
  }, [customCategories]);



  // ক্যাটাগরির ডিকশনারি
  const { language } = useLanguage();
  const t = translations[language];

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('error');
  const [toastY] = useState(() => new Animated.Value(-120));

  const triggerToast = (msg: string, type: 'success' | 'warning' | 'error' = 'error') => {
    setToastMessage(msg);
    setToastType(type);

    // Reset and animate slide down
    toastY.setValue(-120);
    Animated.spring(toastY, {
      toValue: 50,
      tension: 40,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Slide up and clear after 3 seconds
    setTimeout(() => {
      Animated.timing(toastY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 3000);
  };

  const categoryLabels: Record<string, string> = {
    Food: t.catFood,
    Shopping: t.catShopping,
    Utilities: t.catUtilities,
    Rent: t.catRent,
    Entertainment: t.catEntertainment,
    Salary: t.catSalary,
    Transport: t.catTransport,
    Health: t.catHealth,
    Education: t.catEducation,
    Bills: t.catBills,
    Others: t.catOthers,
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setLastSelectedCategory(cat);
    AsyncStorage.setItem(LAST_SELECTED_CAT_KEY, cat).catch(() => {});
    setShowCustomInput(false);
  };

  const handleAddCustomCategory = () => {
    if (!newCatName.trim()) {
      triggerToast(t.errCustomCatEmpty, 'warning');
      return;
    }
    const catName = newCatName.trim();
    if (!customCategories.includes(catName)) {
      const updated = [...customCategories, catName];
      setCustomCategories(updated);
      AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(updated)).catch(() => {});

      // Auto-sync directly to Budget Planner storage (hisabkitab_categories & hisabkitab_budgets)
      AsyncStorage.getItem('hisabkitab_categories').then((stored) => {
        let list: any[] = [];
        if (stored) {
          try { list = JSON.parse(stored); } catch {}
        }
        if (Array.isArray(list) && !list.some((c: any) => (c.key || c.label) === catName)) {
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          list.push({
            key: catName,
            label: catName,
            emoji: '🏷️',
            color: randomColor,
            defaultBudget: 1000,
          });
          AsyncStorage.setItem('hisabkitab_categories', JSON.stringify(list)).catch(() => {});
        }
      });

      AsyncStorage.getItem('hisabkitab_budgets').then((storedBudgets) => {
        let budgetMap: Record<string, number> = {};
        if (storedBudgets) {
          try { budgetMap = JSON.parse(storedBudgets); } catch {}
        }
        if (budgetMap[catName] === undefined) {
          budgetMap[catName] = 1000;
          AsyncStorage.setItem('hisabkitab_budgets', JSON.stringify(budgetMap)).catch(() => {});
        }
      });
    }
    handleSelectCategory(catName);
    setNewCatName('');
  };

  // Open modal for editing existing transaction
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTitle(tx.title);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategory(tx.category);
    
    let initialDateTime = new Date();
    if (tx.createdAt) {
      initialDateTime = new Date(tx.createdAt);
    } else if (tx.date) {
      initialDateTime = new Date(tx.date);
    }
    setSelectedDateTime(initialDateTime);
    
    setModalVisible(true);
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setType('expense');
    setCategory(lastSelectedCategory || 'Food');
    setSelectedDateTime(new Date());
    setEditingTx(null);
  };

  // ফর্ম সাবমিট করার হ্যান্ডলার ফাংশন।
  const handleAddTransaction = () => {
    let finalTitle = title.trim();
    
    // Check if the title is empty OR matches the old category's name (which means it was a default title)
    const isOldCategoryTitle = editingTx && (
      title.trim() === (categoryLabels[editingTx.category] || editingTx.category) ||
      title.trim() === editingTx.category
    );
    
    if (!finalTitle || isOldCategoryTitle) {
      finalTitle = categoryLabels[category] || category;
    }

    // ইনপুট দেওয়া টাকা সংখ্যা কিনা এবং শুন্যের চেয়ে বড় কিনা তা চেক করা হচ্ছে।
    const parsedAmount = parseFloat(toEnglishDigits(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast(t.errAmt, 'error');
      return;
    }

    // নতুন ট্রানজেকশন যুক্ত করা হচ্ছে।
    const finalDate = selectedDateTime.toISOString().split('T')[0];
    const finalCreatedAt = selectedDateTime.toISOString();

    const txPayload = {
      title: finalTitle,
      amount: parsedAmount,
      type,
      category,
      date: finalDate,
      createdAt: finalCreatedAt,
    };

    // Save and remember last selected category
    setLastSelectedCategory(category);
    AsyncStorage.setItem(LAST_SELECTED_CAT_KEY, category).catch(() => {});

    if (editingTx) {
      // Update existing transaction
      updateTransaction(editingTx.id, txPayload);
      triggerToast(language === 'bn' ? 'লেনদেনটি সফলভাবে আপডেট করা হয়েছে!' : 'Transaction updated successfully!', 'success');
    } else {
      addTransaction(txPayload);
      // দৈনিক প্রথম লেনদেন সংরক্ষণ বোনাস ক্লেম করা হচ্ছে।
      claimDailyTxReward().catch(() => {});
      triggerToast(language === 'bn' ? 'লেনদেনটি সফলভাবে যুক্ত করা হয়েছে!' : 'Transaction added successfully!', 'success');
    }

    // ফর্ম রিসেট করা হচ্ছে।
    resetForm();
    setModalVisible(false);
  };

  const handleDeleteTransaction = (id: string, itemTitle: string) => {
    const titleText = t.deleteTxTitle;
    const confirmMsg = t.deleteTxConfirm.replace('{title}', itemTitle);
    if (Platform.OS === 'web') {
      if (confirm(confirmMsg)) {
        deleteTransaction(id);
      }
    } else {
      Alert.alert(
        titleText,
        confirmMsg,
        [
          { text: t.deleteTxCancel, style: 'cancel' },
          {
            text: t.deleteTxConfirmBtn,
            style: 'destructive',
            onPress: () => deleteTransaction(id),
          },
        ]
      );
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'Food': return '🍔';
      case 'Shopping': return '🛒';
      case 'Utilities': return '⚡';
      case 'Rent': return '🏠';
      case 'Entertainment': return '🎬';
      case 'Salary': return '💼';
      case 'Transport': return '🚗';
      case 'Health': return '🏥';
      case 'Education': return '🎓';
      case 'Bills': return '🧾';
      default: return '🏷️';
    }
  };

  // Filter transactions by selected period using robust Date comparison
  const filteredByPeriodTransactions = transactions.filter((tx) => {
    let txDate: Date;
    if (tx.createdAt) {
      txDate = new Date(tx.createdAt);
    } else {
      const parts = tx.date.split('T')[0].split('-');
      if (parts.length === 3) {
        txDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        txDate = new Date(tx.date);
      }
    }
    
    if (isNaN(txDate.getTime())) return true;
    
    const today = new Date();
    
    if (periodFilter === 'today') {
      return txDate.getFullYear() === today.getFullYear() &&
             txDate.getMonth() === today.getMonth() &&
             txDate.getDate() === today.getDate();
    }
    if (periodFilter === 'month') {
      return txDate.getFullYear() === today.getFullYear() &&
             txDate.getMonth() === today.getMonth();
    }
    return true; // 'total'
  });

  const allCategories = ['Food', 'Shopping', 'Utilities', 'Rent', 'Entertainment', 'Salary', 'Transport', 'Health', 'Education', 'Bills', 'Others', ...customCategories];
  
  // Sort categories dynamically: highest transaction count appears first
  const uniqueCategories = useMemo(() => {
    const rawList = Array.from(new Set([...allCategories, ...transactions.map(t => t.category).filter(Boolean)]));
    
    // Count transactions per category in current filtered period
    const periodCountMap: Record<string, number> = {};
    for (const tx of filteredByPeriodTransactions) {
      if (tx.category) {
        periodCountMap[tx.category] = (periodCountMap[tx.category] || 0) + 1;
      }
    }

    // Total transactions count map
    const totalCountMap: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.category) {
        totalCountMap[tx.category] = (totalCountMap[tx.category] || 0) + 1;
      }
    }

    return [...rawList].sort((a, b) => {
      const countA = periodCountMap[a] || 0;
      const countB = periodCountMap[b] || 0;
      if (countB !== countA) {
        return countB - countA; // Higher transaction count in period comes first
      }
      const totalA = totalCountMap[a] || 0;
      const totalB = totalCountMap[b] || 0;
      if (totalB !== totalA) {
        return totalB - totalA; // Higher overall transaction count comes next
      }
      return rawList.indexOf(a) - rawList.indexOf(b);
    });
  }, [allCategories, filteredByPeriodTransactions, transactions]);

  // Category list in Add/Edit modal: Selected category is always first, followed by transaction count
  const modalCategoryList = useMemo(() => {
    const standardKeys = Object.keys(categoryLabels);
    const combined = Array.from(new Set([...standardKeys, ...customCategories]));
    
    // Count transactions per category
    const countMap: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.category) {
        countMap[tx.category] = (countMap[tx.category] || 0) + 1;
      }
    }

    return combined.sort((a, b) => {
      if (a === category) return -1;
      if (b === category) return 1;
      const countA = countMap[a] || 0;
      const countB = countMap[b] || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return 0;
    });
  }, [category, categoryLabels, customCategories, transactions]);

  // Filter transactions by selected category, search query, and filter modal options
  const filteredTransactions = filteredByPeriodTransactions.filter((tx) => {
    if (selectedCategory && tx.category !== selectedCategory) return false;
    
    // Type filter
    if (filterType !== 'all' && tx.type !== filterType) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const titleMatch = tx.title.toLowerCase().includes(q);
      const catMatch = (categoryLabels[tx.category] || tx.category).toLowerCase().includes(q);
      if (!titleMatch && !catMatch) return false;
    }

    // Min amount
    if (filterMinAmount) {
      const minVal = parseFloat(toEnglishDigits(filterMinAmount));
      if (!isNaN(minVal) && tx.amount < minVal) return false;
    }

    // Max amount
    if (filterMaxAmount) {
      const maxVal = parseFloat(toEnglishDigits(filterMaxAmount));
      if (!isNaN(maxVal) && tx.amount > maxVal) return false;
    }

    return true;
  });

  // Calculate dynamic stats based on selected period
  const periodIncome = filteredByPeriodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpenses = filteredByPeriodTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodBalance = periodIncome - periodExpenses;

  // Group and sort transactions according to selected filterSort
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (filterSort === 'amount_high') return b.amount - a.amount;
    if (filterSort === 'amount_low') return a.amount - b.amount;
    if (filterSort === 'date_asc') {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateA - dateB;
    }
    // Default: date_desc
    const dateA = new Date(a.createdAt || a.date).getTime();
    const dateB = new Date(b.createdAt || b.date).getTime();
    return dateB - dateA;
  });

  const formatDateHeader = (dateStr: string) => {
    const today = getLocalDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (dateStr === today) {
      return language === 'bn' ? 'আজ' : 'Today';
    }
    if (dateStr === yesterday) {
      return language === 'bn' ? 'গতকাল' : 'Yesterday';
    }
    
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTxTime = (createdAtStr?: string) => {
    if (!createdAtStr) return '';
    const dateObj = new Date(createdAtStr);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const sections: { title: string; data: Transaction[] }[] = [];
  sortedTransactions.forEach((tx) => {
    const dateStr = tx.date.split('T')[0];
    let section = sections.find((s) => s.title === dateStr);
    if (!section) {
      section = { title: dateStr, data: [] };
      sections.push(section);
    }
    section.data.push(tx);
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* স্থির টপ কন্টেইনার (এটি স্ক্রোল হবে না) */}
        <View style={styles.fixedHeaderContainer}>
          {/* হেডার সেকশন */}
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText type="small" themeColor="textSecondary">{t.dailyTracker}</ThemedText>
              <ThemedText type="subtitle" style={styles.headerTitle}>{t.appTitle}</ThemedText>
            </ThemedView>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* ডার্ক/লাইট থিম টগল বাটন */}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.backgroundSelected }]}
                onPress={() => {
                  setThemeMode((prev) => {
                    if (prev === 'light') return 'dark';
                    if (prev === 'dark') return 'system';
                    return 'light';
                  });
                }}
              >
                <ThemedText style={{ fontSize: 14 }}>
                  {themeMode === 'dark' ? '🌙' : themeMode === 'light' ? '☀️' : '🌗'}
                </ThemedText>
              </TouchableOpacity>

              {/* নোটিফিকেশন বাটন */}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.backgroundSelected }]}
                onPress={() => setNotifModalVisible(true)}
              >
                <ThemedText style={{ fontSize: 14 }}>🔔</ThemedText>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold' }}>
                      {language === 'bn' ? toBanglaDigits(notifications.filter(n => !n.isRead).length.toString()) : notifications.filter(n => !n.isRead).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* প্রধান ব্যালেন্স কার্ড - যেখানে মোট হিসাব প্রিমিয়াম ডিজাইনে দেখানো হচ্ছে */}
          <ThemedView type="backgroundElement" style={styles.balanceCard}>
            {/* পিরিয়ড ফিল্টার ট্যাব রো */}
            <View style={styles.periodTabRow}>
              <TouchableOpacity
                style={[styles.periodTab, periodFilter === 'today' && styles.periodTabActive]}
                onPress={() => setPeriodFilter('today')}
              >
                <Text style={[styles.periodTabText, { color: periodFilter === 'today' ? '#FFFFFF' : '#9CA3AF' }]}>
                  {language === 'bn' ? 'আজ' : 'Today'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodTab, periodFilter === 'month' && styles.periodTabActive]}
                onPress={() => setPeriodFilter('month')}
              >
                <Text style={[styles.periodTabText, { color: periodFilter === 'month' ? '#FFFFFF' : '#9CA3AF' }]}>
                  {getCurrentMonthName()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodTab, periodFilter === 'total' && styles.periodTabActive]}
                onPress={() => setPeriodFilter('total')}
              >
                <Text style={[styles.periodTabText, { color: periodFilter === 'total' ? '#FFFFFF' : '#9CA3AF' }]}>
                  {language === 'bn' ? 'মোট' : 'Total'}
                </Text>
              </TouchableOpacity>
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.balanceLabel}>
              {periodFilter === 'today' ? (language === 'bn' ? 'আজকের ব্যালেন্স' : "Today's Balance") : periodFilter === 'month' ? (language === 'bn' ? 'এই মাসের ব্যালেন্স' : "This Month's Balance") : t.totalBal}
            </ThemedText>
            <ThemedText style={[styles.balanceAmount, { color: periodBalance >= 0 ? '#10B981' : '#EF4444' }]}>
              <Text style={{ fontSize: 18, fontWeight: '500' }}>{getCurrencySymbol()}</Text>{formatNumber(periodBalance)}
            </ThemedText>

            <View style={styles.cardDivider} />

            {/* আয় ও ব্যয়ের তুলনামূলক সেকশন */}
            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <View style={styles.statDotContainer}>
                  <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                    {periodFilter === 'today' ? (language === 'bn' ? 'আজকের আয়' : "Today's Income") : periodFilter === 'month' ? (language === 'bn' ? 'এই মাসের আয়' : "This Month's Income") : t.totalInc}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statAmountGreen}>
                  <Text style={{ fontSize: 12, fontWeight: '500' }}>{getCurrencySymbol()}</Text>{formatNumber(periodIncome)}
                </ThemedText>
              </View>

              <View style={styles.statColumn}>
                <View style={styles.statDotContainer}>
                  <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                    {periodFilter === 'today' ? (language === 'bn' ? 'আজকের ব্যয়' : "Today's Expense") : periodFilter === 'month' ? (language === 'bn' ? 'এই মাসের ব্যয়' : "This Month's Expense") : t.totalExp}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statAmountRed}>
                  <Text style={{ fontSize: 12, fontWeight: '500' }}>{getCurrencySymbol()}</Text>{formatNumber(periodExpenses)}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* Senior UI/UX Redesigned Quick Action Buttons */}
          <View style={styles.quickActionRow}>
            {/* Add Income Button */}
            <TouchableOpacity
              style={[
                styles.quickButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected || 'rgba(255, 255, 255, 0.08)',
                },
              ]}
              onPress={() => {
                setType('income');
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.quickButtonIconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
                <Feather name="arrow-down-left" size={15} color="#10B981" />
              </View>
              <ThemedText style={styles.quickButtonText}>
                {language === 'bn' ? 'আয় যোগ' : 'Add Income'}
              </ThemedText>
            </TouchableOpacity>

            {/* Add Expense Button */}
            <TouchableOpacity
              style={[
                styles.quickButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected || 'rgba(255, 255, 255, 0.08)',
                },
              ]}
              onPress={() => {
                setType('expense');
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.quickButtonIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.14)' }]}>
                <Feather name="arrow-up-right" size={15} color="#EF4444" />
              </View>
              <ThemedText style={styles.quickButtonText}>
                {language === 'bn' ? 'খরচ যোগ' : 'Add Expense'}
              </ThemedText>
            </TouchableOpacity>

            {/* Auto / Recurring Button */}
            <TouchableOpacity
              style={[
                styles.quickButton,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected || 'rgba(255, 255, 255, 0.08)',
                },
              ]}
              onPress={() => setShowRecurringModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickButtonIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.14)' }]}>
                <Feather name="repeat" size={15} color="#3B82F6" />
              </View>
              <ThemedText style={styles.quickButtonText}>
                {language === 'bn' ? 'অটো লেনদেন' : 'Auto Entry'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* ক্যাটাগরি ফিল্টার স্ক্রোল রো */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterContainer}
            style={{ marginBottom: Spacing.four }}
          >
            <TouchableOpacity
              style={[
                styles.categoryFilterChip,
                selectedCategory === null
                  ? { backgroundColor: theme.text }
                  : { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.backgroundSelected }
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[
                styles.categoryFilterText,
                { color: selectedCategory === null ? theme.background : theme.text }
              ]}>
                🌐 {language === 'bn' ? 'সব' : 'All'} ({language === 'bn' ? toBanglaDigits(filteredByPeriodTransactions.length.toString()) : filteredByPeriodTransactions.length})
              </Text>
            </TouchableOpacity>

            {uniqueCategories.map((cat) => {
              const count = filteredByPeriodTransactions.filter((t) => t.category === cat).length;
              const catEmoji = getCategoryEmoji(cat);
              const isSelected = selectedCategory === cat;
              
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryFilterChip,
                    isSelected
                      ? { backgroundColor: theme.text }
                      : { backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.backgroundSelected }
                  ]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat)}
                >
                  <Text style={[
                    styles.categoryFilterText,
                    { color: isSelected ? theme.background : theme.text }
                  ]}>
                    {catEmoji} {categoryLabels[cat] || cat} ({language === 'bn' ? toBanglaDigits(count.toString()) : count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ক্যাটাগরি অনুযায়ী আয়-ব্যয় সামারি (ফিল্টার অ্যাক্টিভ থাকলে দেখাবে) */}
          {selectedCategory !== null && (
            <View style={styles.categorySummaryRow}>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '600' }}>
                {categoryLabels[selectedCategory] || selectedCategory} {language === 'bn' ? 'এর মোট:' : 'Summary:'}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                  {language === 'bn' ? '+ ৳ ' : '+ TK '}{formatNumber(filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0))}
                </Text>
                <View style={{ width: 1, height: 12, backgroundColor: 'rgba(150, 150, 150, 0.2)' }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
                  {language === 'bn' ? '- ৳ ' : '- TK '}{formatNumber(filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}
                </Text>
              </View>
            </View>
          )}
        </View>

        <SectionList
          key={`${periodFilter}-${selectedCategory}`}
          style={{ flex: 1 }}
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListHeaderComponent={
            <View style={styles.recentHeader}>
              <ThemedText type="smallBold" style={{ flexShrink: 0 }}>{language === 'bn' ? 'লেনদেন সমূহ' : 'All Transactions'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ flexShrink: 0, textAlign: 'right' }}>
                {language === 'bn' ? toBanglaDigits(filteredTransactions.length.toString()) : filteredTransactions.length} {language === 'bn' ? 'টি লেনদেন' : 'transactions'}
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">{t.noTxYet}</ThemedText>
            </ThemedView>
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionHeaderLine} />
              <ThemedText style={styles.sectionHeaderText}>{formatDateHeader(title)}</ThemedText>
              <View style={styles.sectionHeaderLine} />
            </View>
          )}
          renderItem={({ item: tx }) => (
            <ThemedView type="backgroundElement" style={styles.transactionItem}>
              <View style={styles.txIconContainer}>
                <ThemedText style={styles.txIcon}>
                  {tx.category === 'Food' && '🍔'}
                  {tx.category === 'Shopping' && '🛒'}
                  {tx.category === 'Utilities' && '⚡'}
                  {tx.category === 'Rent' && '🏠'}
                  {tx.category === 'Entertainment' && '🎬'}
                  {tx.category === 'Salary' && '💼'}
                  {tx.category === 'Transport' && '🚗'}
                  {tx.category === 'Health' && '🏥'}
                  {tx.category === 'Education' && '🎓'}
                  {tx.category === 'Bills' && '🧾'}
                  {!['Food','Shopping','Utilities','Rent','Entertainment','Salary','Transport','Health','Education','Bills'].includes(tx.category) && '🏷️'}
                </ThemedText>
              </View>
              
              <View style={styles.txInfo}>
                <ThemedText style={styles.txTitle}>{tx.title}</ThemedText>
                {tx.createdAt ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatTxTime(tx.createdAt)}
                  </ThemedText>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.txAmountContainer}>
                  <ThemedText style={[
                    styles.txAmount,
                    { color: tx.type === 'income' ? '#10B981' : '#EF4444' }
                  ]}>
                    {tx.type === 'income' ? '+ ' : '- '}<Text style={{ fontSize: 12, fontWeight: '500' }}>{getCurrencySymbol()}</Text>{formatNumber(tx.amount)}
                  </ThemedText>
                </View>

                {/* Edit button */}
                <TouchableOpacity
                  onPress={() => handleEditTransaction(tx)}
                  style={{ padding: 6, opacity: 0.8 }}
                  activeOpacity={0.6}
                >
                  <ThemedText style={{ fontSize: 14 }}>✏️</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(tx.id, tx.title)}
                  style={{ padding: 6, opacity: 0.8 }}
                  activeOpacity={0.6}
                >
                  <ThemedText style={{ fontSize: 16 }}>🗑️</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          )}
        />
      </SafeAreaView>

      {/* নোটিফিকেশন সেন্টার মডাল */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notifModalVisible}
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={[styles.modalView, { maxHeight: '80%' }]}>
            {/* মডাল হেডার */}
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                {language === 'bn' ? '🔔 নোটিফিকেশন বক্স' : '🔔 Notification Box'}
              </ThemedText>
              
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={{ padding: 6 }}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t.close}</ThemedText>
              </TouchableOpacity>
            </View>

            {/* অ্যাকশন বাটনস */}
            {notifications.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)', paddingBottom: 10 }}>
                <TouchableOpacity onPress={() => markAllAsRead()} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(150,150,150,0.1)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                    {language === 'bn' ? 'সব পঠিত চিহ্নিত করুন' : 'Mark all read'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => clearAll()} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.1)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>
                    {language === 'bn' ? 'সব মুছে ফেলুন' : 'Clear all'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* নোটিফিকেশন তালিকা */}
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(150,150,150,0.1)', marginVertical: 8 }} />}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 32, marginBottom: 10 }}>📭</Text>
                  <ThemedText type="small" themeColor="textSecondary">
                    {language === 'bn' ? 'কোনো নোটিফিকেশন নেই' : 'No notifications yet'}
                  </ThemedText>
                </View>
              }
              renderItem={({ item: notif }) => {
                const getNotifIcon = (type?: string) => {
                  switch (type) {
                    case 'budget': return '⚡';
                    case 'due': return '⏰';
                    case 'daily': return '📝';
                    default: return '🔔';
                  }
                };

                const getNotifColor = (type?: string) => {
                  switch (type) {
                    case 'budget': return '#EF4444';
                    case 'due': return '#F59E0B';
                    case 'daily': return '#3B82F6';
                    default: return '#10B981';
                  }
                };

                const dateObj = new Date(notif.timestamp);
                const formattedTime = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                return (
                  <TouchableOpacity
                    onPress={() => markAsRead(notif.id)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      paddingVertical: 4,
                      opacity: notif.isRead ? 0.6 : 1,
                    }}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${getNotifColor(notif.type)}15`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 16 }}>{getNotifIcon(notif.type)}</Text>
                    </View>

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: notif.isRead ? '600' : 'bold',
                          color: theme.text,
                          flex: 1,
                        }}>
                          {notif.title}
                        </Text>
                        {!notif.isRead && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 16 }}>
                        {notif.body}
                      </Text>
                      {formattedTime ? (
                        <Text style={{ fontSize: 10, color: 'rgba(150,150,150,0.6)', marginTop: 2 }}>
                          {formattedTime}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </ThemedView>
        </View>
      </Modal>

      {/* নতুন লেনদেন যোগ করার পপ-আপ মডাল */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalViewContainer}
            >
              <ThemedView type="backgroundElement" style={styles.modalView}>
                {/* মডাল হেডার */}
                <View style={styles.modalHeader}>
                  <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                    {editingTx ? t.editTxTitle : t.addNewTx}
                  </ThemedText>
                  <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }} style={styles.closeButton}>
                    <ThemedText type="smallBold" themeColor="textSecondary">{t.close}</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* টাইপ সিলেক্টর (আয় নাকি ব্যয়) */}
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeSelectorTab,
                      type === 'expense' && { backgroundColor: '#EF4444' }
                    ]}
                    onPress={() => setType('expense')}
                  >
                    <ThemedText style={[
                      styles.typeSelectorText,
                      type === 'expense' && { color: '#FFFFFF' }
                    ]}>{t.expenseTab}</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeSelectorTab,
                      type === 'income' && { backgroundColor: '#10B981' }
                    ]}
                    onPress={() => setType('income')}
                  >
                    <ThemedText style={[
                      styles.typeSelectorText,
                      type === 'income' && { color: '#FFFFFF' }
                    ]}>{t.incomeTab}</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* শিরোনাম ইনপুট */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>{t.descLabel}{language === 'bn' ? ' (ঐচ্ছিক)' : ' (Optional)'}</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    placeholder={t.descPlaceholder}
                    placeholderTextColor={theme.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />
                </View>

                {/* টাকার পরিমাণ ইনপুট & ৩ সেকেন্ড কুইক বাটন */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>{t.amountLabel}</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  {/* কুইক অ্যামাউন্ট শর্টকাট (৩ সেকেন্ড ইনপুট) */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    {[100, 200, 500, 1000, 2000].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 10,
                          backgroundColor: theme.backgroundSelected,
                        }}
                        onPress={() => setAmount(preset.toString())}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text }}>
                          ৳{preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* তারিখ ও সময় নির্বাচন */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>
                    📅 {language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}
                  </ThemedText>
                  
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[{ borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundSelected, flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                        📅 {selectedDateTime.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[{ borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundSelected, flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
                        ⏰ {selectedDateTime.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* Quick date shortcuts */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    {[
                      { label: t.dateToday, days: 0 },
                      { label: t.dateYesterday, days: 1 },
                      { label: t.dateTwoDaysAgo, days: 2 },
                      { label: t.dateSevenDaysAgo, days: 7 },
                    ].map(({ label, days }) => {
                      const d = new Date();
                      d.setDate(d.getDate() - days);
                      const isSameDay = selectedDateTime.getFullYear() === d.getFullYear() &&
                                        selectedDateTime.getMonth() === d.getMonth() &&
                                        selectedDateTime.getDate() === d.getDate();
                      return (
                        <TouchableOpacity
                          key={label}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor: isSameDay ? theme.text : theme.backgroundSelected,
                          }}
                          onPress={() => {
                            const updated = new Date(d);
                            updated.setHours(selectedDateTime.getHours(), selectedDateTime.getMinutes());
                            setSelectedDateTime(updated);
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isSameDay ? theme.background : theme.text }}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDateTime}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        const updated = new Date(selectedDateTime);
                        updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                        setSelectedDateTime(updated);
                      }
                    }}
                  />
                )}

                {showTimePicker && (
                  <DateTimePicker
                    value={selectedDateTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowTimePicker(false);
                      if (time) {
                        const updated = new Date(selectedDateTime);
                        updated.setHours(time.getHours(), time.getMinutes());
                        setSelectedDateTime(updated);
                      }
                    }}
                  />
                )}

                {/* ক্যাটাগরি সিলেকশন */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>{t.catLabel}</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {/* ডাইনামিক ক্যাটাগরি তালিকা (নির্বাচিত ও বেশি ব্যবহৃত ক্যাটাগরি সবার আগে থাকবে) */}
                    {modalCategoryList.map((cat) => {
                      const isSelected = category === cat;
                      const isCustom = customCategories.includes(cat);
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: theme.backgroundSelected },
                            isSelected && { backgroundColor: isCustom ? '#3B82F6' : theme.text }
                          ]}
                          onPress={() => handleSelectCategory(cat)}
                        >
                          <ThemedText style={[
                            styles.categoryChipText,
                            isSelected && { color: isCustom ? '#FFFFFF' : theme.background, fontWeight: '700' }
                          ]}>
                            {isCustom ? `🏷️ ${cat}` : categoryLabels[cat] || cat}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}

                    {/* কাস্টম ক্যাটাগরি যোগ করার বাটন */}
                    <TouchableOpacity
                      style={[
                        styles.categoryChip,
                        { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3B82F6', borderWidth: 1 }
                      ]}
                      onPress={() => setShowCustomInput(!showCustomInput)}
                    >
                      <ThemedText style={[styles.categoryChipText, { color: '#3B82F6', fontWeight: '700' }]}>
                        {t.addCustomCat}
                      </ThemedText>
                    </TouchableOpacity>
                  </ScrollView>

                  {/* নতুন কাস্টম ক্যাটাগরি টাইপ করার ইনপুট বক্স */}
                  {showCustomInput && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TextInput
                        style={[
                          styles.textInput,
                          { flex: 1, color: theme.text, borderColor: '#3B82F6', borderWidth: 1.5 }
                        ]}
                        placeholder={t.customCatPlaceholder}
                        placeholderTextColor={theme.textSecondary}
                        value={newCatName}
                        onChangeText={setNewCatName}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#3B82F6',
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        onPress={handleAddCustomCategory}
                      >
                        <ThemedText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                          {t.customCatAddBtn}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* সাবমিট বাটন */}
                <TouchableOpacity
                  disabled={!amount.trim()}
                  style={[
                    styles.submitButton,
                    { backgroundColor: type === 'income' ? '#10B981' : '#EF4444' },
                    !amount.trim() && { backgroundColor: theme.backgroundSelected, opacity: 0.5 }
                  ]}
                  onPress={handleAddTransaction}
                >
                  <ThemedText style={[
                    styles.submitButtonText,
                    !amount.trim() && { color: theme.textSecondary }
                  ]}>{t.saveBtn}</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 🗂️ Advanced Filter Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalViewContainer}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalView, { backgroundColor: theme.backgroundElement }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">🗂️ {language === 'bn' ? 'অ্যাডভান্সড ফিল্টার' : 'Advanced Filter'}</ThemedText>
                <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButton}>
                  <ThemedText style={{ fontSize: 18 }}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Type Filter */}
                <View style={{ marginBottom: 16 }}>
                  <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
                    {language === 'bn' ? 'লেনদেনের ধরন:' : 'Transaction Type:'}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { id: 'all', label: language === 'bn' ? 'সব' : 'All' },
                      { id: 'income', label: language === 'bn' ? 'আয়' : 'Income' },
                      { id: 'expense', label: language === 'bn' ? 'ব্যয়' : 'Expense' },
                    ].map((tItem) => (
                      <TouchableOpacity
                        key={tItem.id}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: filterType === tItem.id ? '#208AEF' : theme.backgroundSelected,
                        }}
                        onPress={() => setFilterType(tItem.id as any)}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: filterType === tItem.id ? '#FFFFFF' : theme.text }}>
                          {tItem.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Amount Range Filter */}
                <View style={{ marginBottom: 16 }}>
                  <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
                    {language === 'bn' ? 'টাকার পরিমাণ লিমিট:' : 'Amount Range:'}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1, backgroundColor: theme.backgroundSelected, color: theme.text, height: 42, fontSize: 13 }]}
                      placeholder={language === 'bn' ? 'সর্বনিম্ন ৳' : 'Min ৳'}
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      value={filterMinAmount}
                      onChangeText={setFilterMinAmount}
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1, backgroundColor: theme.backgroundSelected, color: theme.text, height: 42, fontSize: 13 }]}
                      placeholder={language === 'bn' ? 'সর্বোচ্চ ৳' : 'Max ৳'}
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      value={filterMaxAmount}
                      onChangeText={setFilterMaxAmount}
                    />
                  </View>
                </View>

                {/* Sorting Filter */}
                <View style={{ marginBottom: 16 }}>
                  <ThemedText type="smallBold" style={{ marginBottom: 8 }}>
                    {language === 'bn' ? 'সাজানোর নিয়ম:' : 'Sort By:'}
                  </ThemedText>
                  <View style={{ gap: 8 }}>
                    {[
                      { id: 'date_desc', label: language === 'bn' ? '📅 নতুন থেকে পুরাতন (Newest First)' : '📅 Newest First' },
                      { id: 'date_asc', label: language === 'bn' ? '📅 পুরাতন থেকে নতুন (Oldest First)' : '📅 Oldest First' },
                      { id: 'amount_high', label: language === 'bn' ? '💰 বেশি টাকা থেকে কম (Highest Amount)' : '💰 Highest Amount' },
                      { id: 'amount_low', label: language === 'bn' ? '💰 কম টাকা থেকে বেশি (Lowest Amount)' : '💰 Lowest Amount' },
                    ].map((sItem) => (
                      <TouchableOpacity
                        key={sItem.id}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          backgroundColor: filterSort === sItem.id ? 'rgba(32, 138, 239, 0.15)' : theme.backgroundSelected,
                          borderWidth: 1,
                          borderColor: filterSort === sItem.id ? '#208AEF' : 'transparent',
                        }}
                        onPress={() => setFilterSort(sItem.id as any)}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: filterSort === sItem.id ? '#208AEF' : theme.text }}>
                          {sItem.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: theme.backgroundSelected, marginTop: 0 }]}
                  onPress={() => {
                    setFilterType('all');
                    setFilterMinAmount('');
                    setFilterMaxAmount('');
                    setFilterSort('date_desc');
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    {language === 'bn' ? 'রিসেট করুন' : 'Reset All'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: '#208AEF', marginTop: 0 }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.submitButtonText}>
                    ✓ {language === 'bn' ? 'প্রয়োগ করুন' : 'Apply Filter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔁 Recurring Modal Component */}
      <RecurringModal
        visible={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onAddTransaction={(tx) => {
          addTransaction(tx);
          triggerToast(language === 'bn' ? 'অটো লেনদেন যুক্ত করা হয়েছে!' : 'Recurring transaction logged!', 'success');
        }}
      />

      {/* কাস্টম টোস্ট নোটিফিকেশন */}
      {toastMessage && (
        <Animated.View style={[
          styles.toastContainer,
          { transform: [{ translateY: toastY }] },
          toastType === 'error' && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
          toastType === 'warning' && { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
          toastType === 'success' && { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }
        ]}>
          <View style={{ marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
            {toastType === 'error' && <Feather name="alert-circle" size={20} color="#991B1B" />}
            {toastType === 'warning' && <Feather name="alert-triangle" size={20} color="#92400E" />}
            {toastType === 'success' && <Feather name="check-circle" size={20} color="#065F46" />}
          </View>
          <Text style={[
            styles.toastText,
            { color: toastType === 'error' ? '#991B1B' : toastType === 'warning' ? '#92400E' : '#065F46' }
          ]}>
            {toastMessage}
          </Text>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: 8,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  fixedHeaderContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  balanceCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: Spacing.four,
  },
  balanceLabel: {
    marginBottom: Spacing.one,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statColumn: {
    flex: 1,
  },
  statDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statAmountGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  statAmountRed: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.five,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickButtonIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  quickButtonText: {
    fontWeight: '600',
    fontSize: 12.5,
  },
  recentSection: {
    gap: Spacing.three,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  emptyContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.25)',
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 16,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalViewContainer: {
    width: '100%',
  },
  modalView: {
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  closeButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    padding: Spacing.one,
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  typeSelectorTab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  typeSelectorText: {
    fontWeight: '600',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    marginBottom: Spacing.two,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: Spacing.one,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    marginRight: Spacing.two,
  },
  categoryChipText: {
    fontSize: 14,
  },
  submitButton: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryFilterContainer: {
    paddingHorizontal: 2,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  categoryFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  periodTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: '#3B82F6',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  categorySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.08)',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
  },
  sectionHeaderText: {
    paddingHorizontal: Spacing.three,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(150, 150, 150, 0.6)',
  },
});

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// প্রজেক্টের থিম ও কাস্টম থিমড কম্পোনেন্ট ইমপোর্ট করা হচ্ছে।
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
// ট্রানজেকশন সম্পর্কিত স্টেট ও টাইপ ইমপোর্ট করা হচ্ছে।
import { useTransactions, Transaction } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';
import { translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/ThemeContext';
import { usePoints } from '@/context/PointsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '@/utils/date';
import { scheduleFiveSecondTestNotification } from '@/services/notificationService';
import { useNotificationBanner } from '@/context/NotificationBannerContext';

const CUSTOM_CATS_KEY = 'hisabkitab_custom_categories_home';




export default function HomeScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  // useTransactions কাস্টম হুক ব্যবহার করে ব্যালেন্স, মোট আয়, মোট ব্যয় এবং ট্রানজেকশন ডেটা আনা হচ্ছে।
  const { transactions, totalBalance, totalIncome, totalExpenses, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { claimDailyTxReward } = usePoints();

  // নতুন লেনদেন যোগ করার পপ-আপ (Modal) দেখানোর জন্য স্টেট।
  const [modalVisible, setModalVisible] = useState(false);

  // নতুন ট্রানজেকশন ফর্মের ইনপুট ফিল্ডগুলোর স্টেট।
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>('Food');
  // তারিখ ইনপুট — ডিফল্ট আজকের তারিখ
  const [txDate, setTxDate] = useState<string>(getLocalDateString());

  // Custom categories state created by user
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  // Edit transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Notification center state
  const { notifications, clearAll, markAllAsRead, markAsRead } = useNotificationBanner();
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Load custom categories from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_CATS_KEY).then((stored) => {
      if (stored) {
        try { setCustomCategories(JSON.parse(stored)); } catch {}
      }
    });
  }, []);

  // Persist custom categories whenever they change
  useEffect(() => {
    AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(customCategories)).catch(() => {});
  }, [customCategories]);



  // ক্যাটাগরির ডিকশনারি
  const { language } = useLanguage();
  const t = translations[language];

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

  const handleAddCustomCategory = () => {
    if (!newCatName.trim()) {
      alert(t.errCustomCatEmpty);
      return;
    }
    const catName = newCatName.trim();
    if (!customCategories.includes(catName)) {
      setCustomCategories((prev) => [...prev, catName]);
    }
    setCategory(catName);
    setNewCatName('');
    setShowCustomInput(false);
  };

  // Open modal for editing existing transaction
  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTitle(tx.title);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategory(tx.category);
    setTxDate(tx.date);
    setModalVisible(true);
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setType('expense');
    setCategory('Food');
    setTxDate(getLocalDateString());
    setEditingTx(null);
  };

  // ফর্ম সাবমিট করার হ্যান্ডলার ফাংশন।
  const handleAddTransaction = () => {
    // শিরোনাম ফাকা আছে কিনা যাচাই করা হচ্ছে।
    if (!title.trim()) {
      alert(t.errDesc);
      return;
    }

    // ইনপুট দেওয়া টাকা সংখ্যা কিনা এবং শুন্যের চেয়ে বড় কিনা তা চেক করা হচ্ছে।
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert(t.errAmt);
      return;
    }

    // নতুন ট্রানজেকশন যুক্ত করা হচ্ছে।
    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const finalDate = txDate && dateRegex.test(txDate) ? txDate : getLocalDateString();

    const txPayload = {
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date: finalDate,
    };

    if (editingTx) {
      // Update existing transaction
      updateTransaction(editingTx.id, txPayload);
    } else {
      addTransaction(txPayload);
      // দৈনিক প্রথম লেনদেন সংরক্ষণ বোনাস ক্লেম করা হচ্ছে।
      claimDailyTxReward().catch(() => {});
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

  // "আরও দেখুন" টগল স্টেট — ডিফল্টে সাম্প্রতিক ১০টি দেখায়
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const recentTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 10);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={recentTransactions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          ListHeaderComponent={
            <>
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
                <ThemedText type="small" themeColor="textSecondary" style={styles.balanceLabel}>
                  {t.totalBal}
                </ThemedText>
                <ThemedText style={[styles.balanceAmount, { color: totalBalance >= 0 ? '#10B981' : '#EF4444' }]}>
                  <Text style={{ fontSize: 18, fontWeight: '500' }}>TK </Text>{formatNumber(totalBalance)}
                </ThemedText>

                <View style={styles.cardDivider} />

                {/* আয় ও ব্যয়ের তুলনামূলক সেকশন */}
                <View style={styles.statsRow}>
                  <View style={styles.statColumn}>
                    <View style={styles.statDotContainer}>
                      <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                      <ThemedText type="small" themeColor="textSecondary">{t.totalInc}</ThemedText>
                    </View>
                    <ThemedText style={styles.statAmountGreen}>
                      <Text style={{ fontSize: 12, fontWeight: '500' }}>TK </Text>{formatNumber(totalIncome)}
                    </ThemedText>
                  </View>

                  <View style={styles.statColumn}>
                    <View style={styles.statDotContainer}>
                      <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
                      <ThemedText type="small" themeColor="textSecondary">{t.totalExp}</ThemedText>
                    </View>
                    <ThemedText style={styles.statAmountRed}>
                      <Text style={{ fontSize: 12, fontWeight: '500' }}>TK </Text>{formatNumber(totalExpenses)}
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              {/* কুইক অ্যাকশন বাটন */}
              <View style={styles.quickActionRow}>
                <TouchableOpacity 
                  style={[styles.quickButton, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => { setType('income'); setModalVisible(true); }}
                >
                  <ThemedText style={styles.quickButtonText}>{t.addIncome}</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.quickButton, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => { setType('expense'); setModalVisible(true); }}
                >
                  <ThemedText style={styles.quickButtonText}>{t.addExpense}</ThemedText>
                </TouchableOpacity>
              </View>

              {/* সাম্প্রতিক লেনদেনের তালিকা (Recent Transactions) হেডার */}
              <View style={styles.recentHeader}>
                <ThemedText type="smallBold">{t.recentTx}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t.last5}</ThemedText>
              </View>
            </>
          }
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">{t.noTxYet}</ThemedText>
            </ThemedView>
          }
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
                <ThemedText type="small" themeColor="textSecondary">
                  {categoryLabels[tx.category] || tx.category} • {tx.date}
                </ThemedText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.txAmountContainer}>
                  <ThemedText style={[
                    styles.txAmount,
                    { color: tx.type === 'income' ? '#10B981' : '#EF4444' }
                  ]}>
                    {tx.type === 'income' ? '+ ' : '- '}<Text style={{ fontSize: 12, fontWeight: '500' }}>TK </Text>{formatNumber(tx.amount)}
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
          ListFooterComponent={
            transactions.length > 10 ? (
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  paddingVertical: 12,
                  marginTop: 4,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(150,150,150,0.18)',
                  marginBottom: 16,
                }}
                onPress={() => setShowAllTransactions((prev) => !prev)}
                activeOpacity={0.7}
              >
                <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '700' }}>
                  {showAllTransactions
                    ? t.showLessTx
                    : t.showAllTx.replace('{count}', transactions.length.toString())}
                </ThemedText>
              </TouchableOpacity>
            ) : null
          }
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
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>{t.descLabel}</ThemedText>
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

                {/* তারিখ ইনপুট */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>
                    {t.txDateLabel}
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
                    placeholder={getLocalDateString()}
                    placeholderTextColor={theme.textSecondary}
                    value={txDate}
                    onChangeText={setTxDate}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  {/* Quick date shortcuts */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    {[
                      { label: t.dateToday, days: 0 },
                      { label: t.dateYesterday, days: 1 },
                      { label: t.dateTwoDaysAgo, days: 2 },
                      { label: t.dateSevenDaysAgo, days: 7 },
                    ].map(({ label, days }) => {
                      const d = new Date();
                      d.setDate(d.getDate() - days);
                      const val = getLocalDateString(d);
                      return (
                        <TouchableOpacity
                          key={label}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 10,
                            backgroundColor: txDate === val ? theme.text : theme.backgroundSelected,
                          }}
                          onPress={() => setTxDate(val)}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: txDate === val ? theme.background : theme.text }}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ক্যাটাগরি সিলেকশন */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>{t.catLabel}</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {/* স্ট্যান্ডার্ড ক্যাটাগরিগুলো */}
                    {Object.keys(categoryLabels).map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: theme.backgroundSelected },
                            isSelected && { backgroundColor: theme.text }
                          ]}
                          onPress={() => { setCategory(cat); setShowCustomInput(false); }}
                        >
                          <ThemedText style={[
                            styles.categoryChipText,
                            isSelected && { color: theme.background, fontWeight: '700' }
                          ]}>
                            {categoryLabels[cat]}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}

                    {/* ব্যবহারকারীর তৈরি ইউজার কাস্টম ক্যাটাগরিগুলো */}
                    {customCategories.map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: theme.backgroundSelected },
                            isSelected && { backgroundColor: '#3B82F6' }
                          ]}
                          onPress={() => { setCategory(cat); setShowCustomInput(false); }}
                        >
                          <ThemedText style={[
                            styles.categoryChipText,
                            isSelected && { color: '#FFFFFF', fontWeight: '700' }
                          ]}>
                            🏷️ {cat}
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
                  style={[styles.submitButton, { backgroundColor: type === 'income' ? '#10B981' : '#EF4444' }]}
                  onPress={handleAddTransaction}
                >
                  <ThemedText style={styles.submitButtonText}>{t.saveBtn}</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
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
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  quickButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButtonText: {
    fontWeight: '600',
    fontSize: 14,
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
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  txIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 20,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    fontSize: 16,
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
});

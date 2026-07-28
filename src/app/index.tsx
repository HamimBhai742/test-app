import React, { useState } from 'react';
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

const formatNumber = (num: number) => {
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export default function HomeScreen() {
  const theme = useTheme();
  // useTransactions কাস্টম হুক ব্যবহার করে ব্যালেন্স, মোট আয়, মোট ব্যয় এবং ট্রানজেকশন ডেটা আনা হচ্ছে।
  const { transactions, totalBalance, totalIncome, totalExpenses, addTransaction } = useTransactions();

  // নতুন লেনদেন যোগ করার পপ-আপ (Modal) দেখানোর জন্য স্টেট।
  const [modalVisible, setModalVisible] = useState(false);

  // নতুন ট্রানজেকশন ফর্মের ইনপুট ফিল্ডগুলোর স্টেট।
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<Transaction['category']>('Food');

  // ক্যাটাগরির বাংলা নাম ডিকশনারি (ব্যবহারকারীকে সুন্দরভাবে দেখানোর জন্য)।
  const { language } = useLanguage();
  const t = translations[language];

  // ক্যাটাগরির বাংলা নাম ডিকশনারি (ব্যবহারকারীকে সুন্দরভাবে দেখানোর জন্য)।
  const categoryLabels: Record<Transaction['category'], string> = {
    Food: t.catFood,
    Shopping: t.catShopping,
    Utilities: t.catUtilities,
    Rent: t.catRent,
    Entertainment: t.catEntertainment,
    Salary: t.catSalary,
    Others: t.catOthers,
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
    addTransaction({
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date: new Date().toISOString().split('T')[0], // আজকের তারিখ (YYYY-MM-DD) সেট করা হচ্ছে।
    });

    // ফর্ম রিসেট করা হচ্ছে।
    setTitle('');
    setAmount('');
    setType('expense');
    setCategory('Food');
    setModalVisible(false); // পপ-আপ বা মডাল বন্ধ করা হচ্ছে।
  };

  // সাম্প্রতিক ৫টি লেনদেন ফিল্টার করে বের করা হচ্ছে।
  const recentTransactions = transactions.slice(0, 5);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* স্ক্রল ভিউ এর মাধ্যমে মোবাইলে কন্টেন্ট স্ক্রল করার সুবিধা দেওয়া হচ্ছে। */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* হেডার সেকশন */}
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText type="small" themeColor="textSecondary">{t.dailyTracker}</ThemedText>
              <ThemedText type="subtitle" style={styles.headerTitle}>{t.appTitle}</ThemedText>
            </ThemedView>
            {/* নতুন লেনদেন যোগ করার কুইক বাটন */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.text }]}
              onPress={() => setModalVisible(true)}
            >
              <ThemedText style={{ color: theme.background, fontWeight: '700', fontSize: 20 }}>+</ThemedText>
            </TouchableOpacity>
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

          {/* সাম্প্রতিক লেনদেনের তালিকা (Recent Transactions) */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <ThemedText type="smallBold">{t.recentTx}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{t.last5}</ThemedText>
            </View>

            {recentTransactions.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText type="small" themeColor="textSecondary">{t.noTxYet}</ThemedText>
              </ThemedView>
            ) : (
              recentTransactions.map((tx) => (
                <ThemedView key={tx.id} type="backgroundElement" style={styles.transactionItem}>
                  <View style={styles.txIconContainer}>
                    <ThemedText style={styles.txIcon}>
                      {tx.category === 'Food' && '🍔'}
                      {tx.category === 'Shopping' && '🛒'}
                      {tx.category === 'Utilities' && '⚡'}
                      {tx.category === 'Rent' && '🏠'}
                      {tx.category === 'Entertainment' && '🎬'}
                      {tx.category === 'Salary' && '💼'}
                      {tx.category === 'Others' && '🏷️'}
                    </ThemedText>
                  </View>
                  
                  <View style={styles.txInfo}>
                    <ThemedText style={styles.txTitle}>{tx.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {categoryLabels[tx.category]} • {tx.date}
                    </ThemedText>
                  </View>

                  <View style={styles.txAmountContainer}>
                    <ThemedText style={[
                      styles.txAmount,
                      { color: tx.type === 'income' ? '#10B981' : '#EF4444' }
                    ]}>
                      {tx.type === 'income' ? '+ ' : '- '}<Text style={{ fontSize: 12, fontWeight: '500' }}>TK </Text>{formatNumber(tx.amount)}
                    </ThemedText>
                  </View>
                </ThemedView>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* নতুন লেনদেন যোগ করার পপ-আপ মডাল */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
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
                  <ThemedText type="smallBold" style={{ fontSize: 18 }}>{t.addNewTx}</ThemedText>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
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
                  />
                </View>

                {/* টাকার পরিমাণ ইনপুট */}
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
                </View>

                {/* ক্যাটাগরি সিলেকশন */}
                <View style={styles.inputContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.inputLabel}>{t.catLabel}</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {(Object.keys(categoryLabels) as Array<Transaction['category']>).map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: theme.backgroundSelected },
                            isSelected && { backgroundColor: theme.text }
                          ]}
                          onPress={() => setCategory(cat)}
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
                  </ScrollView>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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

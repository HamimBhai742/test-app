import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// থিম, স্টাইল ও গ্লোবাল স্টেট ইমপোর্ট করা হচ্ছে।
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTransactions, Transaction } from '@/context/TransactionContext';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  // বিভিন্ন ডিভাইসের বটম ট্যাব বারের নিচে নিরাপদে স্পেসিং বসানোর জন্য ইনসেটস ক্যালকুলেশন।
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  // কনটেক্সট থেকে ট্রানজেকশন ডাটা এবং ডিলিট করার ফাংশন ডিকনস্ট্রাক্ট করা হচ্ছে।
  const { transactions, deleteTransaction } = useTransactions();

  // ইউজার ইন্টারফেস ফিল্টারিং এবং সার্চের জন্য লোকাল স্টেট সমূহ।
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // ক্যাটাগরির বাংলা লেবেল ম্যাপিং।
  const categoryLabels: Record<string, string> = {
    All: 'সব ক্যাটাগরি',
    Food: 'খাবার',
    Shopping: 'কেনাকাটা',
    Utilities: 'ইউটিলিটি বিল',
    Rent: 'বাসা ভাড়া',
    Entertainment: 'বিনোদন',
    Salary: 'বেতন',
    Others: 'অন্যান্য',
  };

  // প্ল্যাটফর্ম অনুযায়ী স্ক্রিনের উপরের এবং নিচের প্যাডিং অ্যাডজাস্ট করা হচ্ছে।
  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top + Spacing.two,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
    ios: {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }
  });

  // সার্চ কুয়েরি, ট্রানজেকশন টাইপ ও ক্যাটাগরি ফিল্টারের ভিত্তিতে লেনদেনের তালিকা ফিল্টার করা হচ্ছে।
  const filteredTransactions = transactions.filter((tx) => {
    // ১. সার্চ কুয়েরি দিয়ে ফিল্টার (কেস-ইনসেনসিটিভ সার্চ)।
    const matchesSearch = tx.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // ২. ট্রানজেকশন টাইপ (আয়/ব্যয়) দিয়ে ফিল্টার।
    const matchesType = selectedType === 'all' ? true : tx.type === selectedType;

    // ৩. ক্যাটাগরি দিয়ে ফিল্টার।
    const matchesCategory = selectedCategory === 'All' ? true : tx.category === selectedCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        {/* টাইটেল এবং তথ্য */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">লেনদেনের খতিয়ান</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            আপনার সকল আয় ও ব্যয়ের তালিকা এখানে দেখতে ও ফিল্টার করতে পারবেন।
          </ThemedText>
        </ThemedView>

        {/* সার্চ বার */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
            placeholder="🔍 লেনদেনের নাম দিয়ে খুঁজুন..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <ThemedText type="smallBold" themeColor="textSecondary">X</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* টাইপ ফিল্টার (All / Income / Expense) */}
        <View style={styles.typeFilterRow}>
          {(['all', 'income', 'expense'] as const).map((type) => {
            const isSelected = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeFilterButton,
                  { backgroundColor: theme.backgroundElement },
                  isSelected && { backgroundColor: type === 'income' ? '#10B981' : type === 'expense' ? '#EF4444' : theme.text }
                ]}
                onPress={() => setSelectedType(type)}
              >
                <ThemedText style={[
                  styles.filterText,
                  isSelected && { color: type === 'all' ? theme.background : '#FFFFFF', fontWeight: '700' }
                ]}>
                  {type === 'all' && 'সব লেনদেন'}
                  {type === 'income' && '💰 আয়'}
                  {type === 'expense' && '💸 ব্যয়'}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ক্যাটাগরি ফিল্টার চিপস (অনুভূমিক স্ক্রল) */}
        <View style={styles.categoryFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {Object.keys(categoryLabels).map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: theme.backgroundElement },
                    isSelected && { backgroundColor: theme.text }
                  ]}
                  onPress={() => setSelectedCategory(cat)}
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

        {/* লেনদেন তালিকা */}
        <View style={styles.listSection}>
          <ThemedText type="smallBold" style={styles.listCount}>
            ফলাফল: {filteredTransactions.length} টি লেনদেন পাওয়া গেছে
          </ThemedText>

          {filteredTransactions.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">
                ফিল্টার বা সার্চের সাথে মিলে এমন কোনো লেনদেন পাওয়া যায়নি।
              </ThemedText>
            </ThemedView>
          ) : (
            filteredTransactions.map((tx) => (
              <ThemedView key={tx.id} type="backgroundElement" style={styles.transactionItem}>
                {/* ক্যাটাগরি আইকন */}
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

                {/* লেনদেনের বিবরণ */}
                <View style={styles.txInfo}>
                  <ThemedText style={styles.txTitle}>{tx.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {categoryLabels[tx.category]} • {tx.date}
                  </ThemedText>
                </View>

                {/* লেনদেনের অ্যামাউন্ট ও ডিলিট বাটন */}
                <View style={styles.txRightContainer}>
                  <ThemedText style={[
                    styles.txAmount,
                    { color: tx.type === 'income' ? '#10B981' : '#EF4444' }
                  ]}>
                    {tx.type === 'income' ? '+' : '-'} ৳{tx.amount.toLocaleString()}
                  </ThemedText>
                  
                  {/* ডিলিট বাটন: প্রেস করলে গ্লোবাল স্টেট থেকে ট্রানজেকশনটি ডিলিট হয়ে যাবে */}
                  <TouchableOpacity
                    onPress={() => deleteTransaction(tx.id)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ThemedText style={styles.deleteText}>🗑️</ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            ))
          )}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
  },
  titleContainer: {
    gap: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  clearSearchButton: {
    position: 'absolute',
    right: Spacing.four,
    padding: Spacing.one,
  },
  typeFilterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  typeFilterButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryFilterContainer: {
    marginBottom: Spacing.four,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    marginRight: Spacing.two,
  },
  categoryChipText: {
    fontSize: 13,
  },
  listSection: {
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  listCount: {
    marginBottom: Spacing.one,
  },
  emptyContainer: {
    borderRadius: Spacing.three,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.15)',
  },
  transactionItem: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  txIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  txRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    padding: Spacing.one,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: Spacing.two,
  },
  deleteText: {
    fontSize: 14,
  },
});

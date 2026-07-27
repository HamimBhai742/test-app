import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// থিম, লেআউট কনস্ট্যান্ট এবং গ্লোবাল স্টেট হুক ইমপোর্ট করা হচ্ছে।
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTransactions, Transaction } from '@/context/TransactionContext';

export default function StatsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  // বিভিন্ন ডিভাইসের বটম নেভিগেশন বারের সাথে সামঞ্জস্য রেখে স্ক্রিনের নিচের প্যাডিং হিসাব করা।
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  // কনটেক্সট থেকে সমস্ত ট্রানজেকশন লোড করা হচ্ছে।
  const { transactions } = useTransactions();

  // ক্যাটাগরির বাংলা নাম নির্ধারণ।
  const categoryLabels: Record<string, string> = {
    Food: 'খাবার দাবার (Food)',
    Shopping: 'কেনাকাটা (Shopping)',
    Utilities: 'ইউটিলিটি বিল (Utilities)',
    Rent: 'বাসা ভাড়া (Rent)',
    Entertainment: 'বিনোদন (Entertainment)',
    Others: 'অন্যান্য (Others)',
  };

  // প্রতিটি ক্যাটাগরির জন্য কাস্টম কালার (যা প্রগ্রেস বারে দেখাবে)।
  const categoryColors: Record<string, string> = {
    Food: '#F59E0B',        // Orange/হলুদাব
    Shopping: '#8B5CF6',    // Purple/বেগুনী
    Utilities: '#06B6D4',   // Cyan/নীলাভ-সবুজ
    Rent: '#3B82F6',        // Blue/নীল
    Entertainment: '#EC4899', // Pink/গোলাপি
    Others: '#6B7280',      // Grey/ধূসর
  };

  // ক্যাটাগরি ইমোজি ম্যাপিং।
  const categoryEmojis: Record<string, string> = {
    Food: '🍔',
    Shopping: '🛒',
    Utilities: '⚡',
    Rent: '🏠',
    Entertainment: '🎬',
    Others: '🏷️',
  };

  // ব্যয় সংক্রান্ত বিশ্লেষণ (Expense Analytics) হিসাব করা হচ্ছে useMemo হুকের সাহায্যে।
  const expenseStats = useMemo(() => {
    // ১. শুধুমাত্র ব্যয় (expense) ক্যাটাগরির ট্রানজেকশনগুলো ফিল্টার করা হচ্ছে (বেতন বা আয় বাদে)।
    const expenses = transactions.filter((tx) => tx.type === 'expense');
    
    // ২. মোট ব্যয়ের যোগফল নির্ণয়।
    const totalExp = expenses.reduce((acc, tx) => acc + tx.amount, 0);

    // ৩. প্রতিটি ক্যাটাগরি ভিত্তিক মোট ব্যয় হিসাব করা।
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((tx) => {
      // যদি ক্যাটাগরিটি ইতিমধ্যে অবজেক্টে না থাকে তবে ০ দিয়ে ইনিশিয়ালাইজ করা হচ্ছে।
      if (!categoryTotals[tx.category]) {
        categoryTotals[tx.category] = 0;
      }
      categoryTotals[tx.category] += tx.amount;
    });

    // ৪. ক্যাটাগরি ভিত্তিক তথ্য সাজানো এবং খরচের পরিমাণ অনুযায়ী বড় থেকে ছোট ক্রমানুসারে (Descending order) বিন্যস্ত করা।
    const breakdown = Object.keys(categoryTotals).map((cat) => {
      const amount = categoryTotals[cat];
      // শতকরা হিসাব বের করা (মোট ব্যয়ের তুলনায় এই ক্যাটাগরির খরচ কত শতাংশ)।
      const percentage = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
      return {
        category: cat,
        label: categoryLabels[cat] || cat,
        amount,
        percentage,
        color: categoryColors[cat] || '#6B7280',
        emoji: categoryEmojis[cat] || '🏷️',
      };
    }).sort((a, b) => b.amount - a.amount); // সর্টিং

    return {
      totalExpense: totalExp,
      breakdown,
    };
  }, [transactions]);

  // প্ল্যাটফর্ম অনুযায়ী স্ক্রিনের স্টাইল বিন্যাস।
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

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        {/* স্ক্রিন হেডার */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">ব্যয় বিশ্লেষণ</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            আপনার খরচের ক্যাটাগরি ভিত্তিক গ্রাফ ও শতকরা হিসাব নিচে দেওয়া হলো।
          </ThemedText>
        </ThemedView>

        {/* মোট ব্যয়ের কার্ড */}
        <ThemedView type="backgroundElement" style={styles.totalExpenseCard}>
          <ThemedText type="small" themeColor="textSecondary">মোট ব্যয়কৃত অর্থ (Total Expense)</ThemedText>
          <ThemedText style={styles.totalExpenseAmount}>
            ৳ {expenseStats.totalExpense.toLocaleString()}
          </ThemedText>
        </ThemedView>

        {/* ক্যাটাগরি ভিত্তিক গ্রাফ ও প্রগ্রেস বার সেকশন */}
        <View style={styles.breakdownSection}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>ক্যাটাগরি ভিত্তিক খরচ</ThemedText>
          
          {expenseStats.breakdown.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary">
                কোনো ব্যয়ের হিসাব পাওয়া যায়নি। বিশ্লেষণ দেখতে কিছু খরচের লেনদেন যোগ করুন।
              </ThemedText>
            </ThemedView>
          ) : (
            expenseStats.breakdown.map((item) => (
              <ThemedView key={item.category} type="backgroundElement" style={styles.statCard}>
                
                {/* ক্যাটাগরি লেবেল ও অ্যামাউন্ট */}
                <View style={styles.labelRow}>
                  <View style={styles.categoryInfo}>
                    <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                    <ThemedText style={styles.categoryLabel}>{item.label}</ThemedText>
                  </View>
                  <View style={styles.amountInfo}>
                    <ThemedText style={styles.categoryAmount}>৳ {item.amount.toLocaleString()}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.percentageText}>
                      ({item.percentage}%)
                    </ThemedText>
                  </View>
                </View>

                {/* কাস্টম ডিজাইন করা প্রগ্রেস বার */}
                {/* বাইরের কন্টেইনারটি প্রগ্রেস বারের ব্যাকগ্রাউন্ড ট্র্যাক নির্দেশ করে */}
                <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                  {/* ভেতরের এই ভিউটি ক্যাটাগরির খরচের শতকরা অনুপাতে চওড়া (width) এবং রঙিন হবে */}
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
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
  totalExpenseCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  totalExpenseAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: Spacing.one,
  },
  breakdownSection: {
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  sectionTitle: {
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
  statCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emoji: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountInfo: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  percentageText: {
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});

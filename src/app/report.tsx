import { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';
import React, { useMemo, useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTransactions } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { PDFExportModal } from '@/components/pdf-export-modal';
import { useAuth } from '@/context/AuthContext';


import { Feather } from '@expo/vector-icons';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Removed hardcoded month names, they will come from translations now



interface MonthData {
  key: string;
  year: number;
  month: number;
  label: string;
  shortLabel: string;
  income: number;
  expense: number;
  net: number;
  txCount: number;
  savingsRate: number;
}

// ─── Mini Horizontal Bar ─────────────────────────────────────────────────────

function MiniBar({
  incomeVal,
  expenseVal,
  maxVal,
  incomeColor,
  expenseColor,
  bgColor,
}: {
  incomeVal: number;
  expenseVal: number;
  maxVal: number;
  incomeColor: string;
  expenseColor: string;
  bgColor: string;
}) {
  const incPct = maxVal > 0 ? (incomeVal / maxVal) * 100 : 0;
  const expPct = maxVal > 0 ? (expenseVal / maxVal) * 100 : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={[miniBarStyles.track, { backgroundColor: bgColor }]}>
        <View style={[miniBarStyles.fill, { width: `${incPct}%` as any, backgroundColor: incomeColor }]} />
      </View>
      <View style={[miniBarStyles.track, { backgroundColor: bgColor }]}>
        <View style={[miniBarStyles.fill, { width: `${expPct}%` as any, backgroundColor: expenseColor }]} />
      </View>
    </View>
  );
}

const miniBarStyles = StyleSheet.create({
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

// ─── Month Card ───────────────────────────────────────────────────────────────

function MonthCard({
  data,
  isSelected,
  onPress,
  maxVal,
  colors,
  theme,
}: {
  data: MonthData;
  isSelected: boolean;
  onPress: () => void;
  maxVal: number;
  colors: Record<string, string>;
  theme: ReturnType<typeof useTheme>;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const netPositive = data.net >= 0;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View
        style={[
          monthCardStyles.card,
          {
            backgroundColor: isSelected ? theme.backgroundElement : theme.background,
            borderColor: isSelected
              ? netPositive ? `${colors.success}40` : `${colors.danger}40`
              : `rgba(150,150,150,0.10)`,
            shadowColor: isSelected ? (netPositive ? colors.success : colors.danger) : '#000',
            shadowOpacity: isSelected ? 0.12 : 0.04,
          },
        ]}
      >
        <View style={monthCardStyles.left}>
          <Text style={[monthCardStyles.monthLabel, { color: isSelected ? theme.text : theme.textSecondary }]}>
            {data.label}
          </Text>
          <MiniBar
            incomeVal={data.income}
            expenseVal={data.expense}
            maxVal={maxVal}
            incomeColor={colors.success}
            expenseColor={colors.danger}
            bgColor={theme.backgroundElement}
          />
          <Text style={[monthCardStyles.txCount, { color: theme.textSecondary }]}>
            {data.txCount} {t.txWord}
          </Text>
        </View>
        <View style={monthCardStyles.right}>
          <Text style={[monthCardStyles.netAmount, { color: netPositive ? colors.success : colors.danger }]}>
            {netPositive ? '+' : '-'} {getCurrencySymbol()}{formatNumber(Math.abs(data.net))}
          </Text>
          {data.income > 0 && (
            <View
              style={[
                monthCardStyles.savingsBadge,
                {
                  backgroundColor: data.savingsRate >= 20
                    ? 'rgba(16,185,129,0.12)'
                    : data.savingsRate >= 0
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(239,68,68,0.12)',
                },
              ]}
            >
              <Text
                style={[
                  monthCardStyles.savingsText,
                  {
                    color: data.savingsRate >= 20
                      ? colors.success
                      : data.savingsRate >= 0
                      ? colors.warning
                      : colors.danger,
                  },
                ]}
              >
                {data.savingsRate >= 0 ? '↑' : '↓'} {Math.abs(data.savingsRate)}% {t.savingsWord}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const monthCardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
    gap: Spacing.three,
  },
  left: { flex: 1, gap: 6 },
  monthLabel: { fontSize: 15, fontWeight: '700' },
  txCount: { fontSize: 11, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 5 },
  netAmount: { fontSize: 15, fontWeight: '800' },
  savingsBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  savingsText: { fontSize: 10, fontWeight: '700' },
});

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function MonthlyBarChart({
  data,
  selectedKey,
  onSelect,
  colors,
  theme,
}: {
  data: MonthData[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  colors: Record<string, string>;
  theme: ReturnType<typeof useTheme>;
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  return (
    <View style={barChartStyles.container}>
      {data.map((d) => {
        const isSelected = d.key === selectedKey;
        const incH = maxVal > 0 ? (d.income / maxVal) * 100 : 0;
        const expH = maxVal > 0 ? (d.expense / maxVal) * 100 : 0;
        return (
          <TouchableOpacity
            key={d.key}
            style={barChartStyles.col}
            activeOpacity={0.8}
            onPress={() => onSelect(d.key)}
          >
            <View style={barChartStyles.barPair}>
              <View style={barChartStyles.barTrack}>
                <View
                  style={[
                    barChartStyles.bar,
                    {
                      height: `${Math.max(incH, d.income > 0 ? 5 : 0)}%` as any,
                      backgroundColor: isSelected ? colors.success : `${colors.success}60`,
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                    },
                  ]}
                />
              </View>
              <View style={barChartStyles.barTrack}>
                <View
                  style={[
                    barChartStyles.bar,
                    {
                      height: `${Math.max(expH, d.expense > 0 ? 5 : 0)}%` as any,
                      backgroundColor: isSelected ? colors.danger : `${colors.danger}60`,
                      borderTopLeftRadius: 6,
                      borderTopRightRadius: 6,
                    },
                  ]}
                />
              </View>
            </View>
            {isSelected && (
              <View style={[barChartStyles.selDot, { backgroundColor: theme.text }]} />
            )}
            <Text style={[barChartStyles.label, { color: isSelected ? theme.text : theme.textSecondary, fontWeight: isSelected ? '700' : '600' }]}>
              {d.shortLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const barChartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 4, paddingTop: 10 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 2, width: '100%', justifyContent: 'center' },
  barTrack: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  selDot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontSize: 9, textAlign: 'center' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const { transactions } = useTransactions();
  const { user } = useAuth();

  const [pdfModalVisible, setPdfModalVisible] = useState(false);

  const colors = {
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    primary: '#3B82F6',
    purple: '#8B5CF6',
  };

  const monthlyData = useMemo<MonthData[]>(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    transactions.forEach((tx) => {
      if (!tx.date) return; // Guard: skip transactions with missing date
      const parts = tx.date.split('-');
      if (parts.length < 2) return;
      const [y, m] = parts;
      const key = `${y}-${m}`;
      if (!map[key]) map[key] = { income: 0, expense: 0, count: 0 };
      if (tx.type === 'income') map[key].income += tx.amount;
      else map[key].expense += tx.amount;
      map[key].count += 1;
    });
    return Object.keys(map)
      .sort((a, b) => (a > b ? -1 : 1))
      .map((key) => {
        const [y, m] = key.split('-').map(Number);
        const d = map[key];
        const net = d.income - d.expense;
        const savingsRate = d.income > 0 ? Math.round((net / d.income) * 100) : 0;
        return {
          key,
          year: y,
          month: m - 1,
          label: `${t.monthNames[m - 1]} ${language === 'bn' ? toBanglaDigits(y.toString()) : y}`,
          shortLabel: t.monthShort[m - 1],
          income: d.income,
          expense: d.expense,
          net,
          txCount: d.count,
          savingsRate,
        };
      });
  }, [transactions, t, language]);

  // Auto-select most recent month when data first loads (fixes stale-null bug)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  useEffect(() => {
    if (monthlyData.length > 0) {
      setSelectedKey((prev) => {
        // Keep existing valid selection if it still exists in the data
        if (prev && monthlyData.some((d) => d.key === prev)) return prev;
        return monthlyData[0].key; // Default to most recent month
      });
    }
  }, [monthlyData]);


  const selected = monthlyData.find((d) => d.key === selectedKey) ?? null;
  const maxCardVal = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense)), 1);

  const overallStats = useMemo(() => {
    const totalInc = monthlyData.reduce((a, d) => a + d.income, 0);
    const totalExp = monthlyData.reduce((a, d) => a + d.expense, 0);
    const bestMonth = [...monthlyData].sort((a, b) => b.net - a.net)[0] ?? null;
    const worstMonth = [...monthlyData].sort((a, b) => a.net - b.net)[0] ?? null;
    const avgMonthlyExpense =
      monthlyData.length > 0
        ? Math.round(monthlyData.reduce((a, d) => a + d.expense, 0) / monthlyData.length)
        : 0;
    return { totalInc, totalExp, bestMonth, worstMonth, avgMonthlyExpense };
  }, [monthlyData]);

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top + Spacing.two,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: { paddingTop: Spacing.six, paddingBottom: Spacing.four },
    ios: { paddingTop: insets.top, paddingBottom: insets.bottom },
  });

  if (monthlyData.length === 0) {
    const topPad = contentPlatformStyle && 'paddingTop' in contentPlatformStyle ? contentPlatformStyle.paddingTop : insets.top;
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header with dynamic safe area top padding */}
        <View style={[styles.container, { flexGrow: 0, paddingTop: topPad, paddingBottom: 0 }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>{t.monthlyReportEyebrow}</Text>
              <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{t.monthlyReportTitle}</ThemedText>
            </View>
          </View>
        </View>

        {/* Center Empty Card View */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.four, paddingBottom: 100 }}>
          <ThemedView type="backgroundElement" style={[styles.emptyCard, { width: '100%', maxWidth: 400 }]}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <ThemedText style={styles.emptyTitle}>{t.noReportTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
              {t.noReportDesc}
            </ThemedText>
          </ThemedView>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>{t.monthlyReportEyebrow}</Text>
            <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{t.monthlyReportTitle}</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.addIconBtn}
            onPress={() => setPdfModalVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="file-text" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Overall Hero Card ── */}
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <View style={styles.heroAccentBar}>
            <View style={[styles.heroAccentSeg, { flex: 2, backgroundColor: colors.success }]} />
            <View style={[styles.heroAccentSeg, { flex: 1, backgroundColor: colors.primary }]} />
            <View style={[styles.heroAccentSeg, { flex: 1, backgroundColor: colors.warning }]} />
          </View>
          <View style={styles.heroInner}>
            <Text style={[styles.heroEyebrow, { color: theme.textSecondary }]}>
              {t.overallSummary} · {monthlyData.length} {t.months}
            </Text>
            <View style={styles.heroSplitRow}>
              <View style={styles.heroSplitItem}>
                <Text style={[styles.heroSplitLabel, { color: theme.textSecondary }]}>{t.totalIncome}</Text>
                <Text style={[styles.heroSplitAmt, { color: colors.success }]}>
                  <Text style={styles.heroTK}>{getCurrencySymbol()}</Text>
                  {formatNumber(overallStats.totalInc)}
                </Text>
              </View>
              <View style={[styles.heroSplitSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroSplitItem}>
                <Text style={[styles.heroSplitLabel, { color: theme.textSecondary }]}>{t.totalExpense}</Text>
                <Text style={[styles.heroSplitAmt, { color: colors.danger }]}>
                  <Text style={styles.heroTK}>{getCurrencySymbol()}</Text>
                  {formatNumber(overallStats.totalExp)}
                </Text>
              </View>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, { color: colors.primary }]}>
                  {getCurrencySymbol()}{formatNumber(overallStats.avgMonthlyExpense)}
                </Text>
                <Text style={[styles.heroStatLbl, { color: theme.textSecondary }]}>{t.avgMonthlyExpense}</Text>
              </View>
              <View style={[styles.heroStatSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, { color: overallStats.totalInc - overallStats.totalExp >= 0 ? colors.success : colors.danger }]}>
                  {getCurrencySymbol()}{formatNumber(Math.abs(overallStats.totalInc - overallStats.totalExp))}
                </Text>
                <Text style={[styles.heroStatLbl, { color: theme.textSecondary }]}>
                  {overallStats.totalInc >= overallStats.totalExp ? t.totalSavings : t.totalDeficit}
                </Text>
              </View>
              <View style={[styles.heroStatSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, { color: colors.warning }]}>
                  {monthlyData.reduce((a, d) => a + d.txCount, 0)}
                </Text>
                <Text style={[styles.heroStatLbl, { color: theme.textSecondary }]}>{t.totalTx}</Text>
              </View>
            </View>
          </View>
        </ThemedView>

        {/* ── Bar Chart Card ── */}
        <ThemedView type="backgroundElement" style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardEyebrow, { color: theme.textSecondary }]}>{t.visualOverview}</Text>
              <ThemedText style={styles.cardTitle}>{t.monthByMonthChart}</ThemedText>
            </View>
            <Text style={styles.cardEmoji}>📊</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>{t.income}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>{t.expense}</Text>
            </View>
          </View>
          <MonthlyBarChart
            data={[...monthlyData].reverse()}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            colors={colors}
            theme={theme}
          />
          {selected && (
            <View style={[styles.tooltip, { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.tooltipTitle, { color: theme.text }]}>📅 {selected.label}</Text>
              <View style={styles.tooltipRow}>
                <Text style={[styles.tooltipItem, { color: colors.success }]}>{t.income}: {getCurrencySymbol()}{formatNumber(selected.income)}</Text>
                <Text style={[styles.tooltipItem, { color: colors.danger }]}>{t.expense}: {getCurrencySymbol()}{formatNumber(selected.expense)}</Text>
              </View>
            </View>
          )}
        </ThemedView>

        {/* ── Best & Worst Month ── */}
        <View style={styles.insightRow}>
          {overallStats.bestMonth && (
            <View style={[styles.insightCard, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.18)' }]}>
              <Text style={styles.insightIcon}>🏆</Text>
              <Text style={[styles.insightTitle, { color: '#065f46' }]}>{t.bestMonth}</Text>
              <Text style={[styles.insightMonthName, { color: '#059669' }]}>{overallStats.bestMonth.label}</Text>
              <Text style={[styles.insightAmt, { color: '#10B981' }]}>+{getCurrencySymbol()}{formatNumber(overallStats.bestMonth.net)}</Text>
            </View>
          )}
          {overallStats.worstMonth && overallStats.bestMonth?.key !== overallStats.worstMonth.key && (
            <View style={[styles.insightCard, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.18)' }]}>
              <Text style={styles.insightIcon}>⚠️</Text>
              <Text style={[styles.insightTitle, { color: '#991b1b' }]}>{t.worstMonth}</Text>
              <Text style={[styles.insightMonthName, { color: '#DC2626' }]}>{overallStats.worstMonth.label}</Text>
              <Text style={[styles.insightAmt, { color: '#EF4444' }]}>
                {overallStats.worstMonth.net >= 0 ? '+' : '-'}{getCurrencySymbol()}{formatNumber(Math.abs(overallStats.worstMonth.net))}
              </Text>
            </View>
          )}
        </View>

        {/* ── Monthly List ── */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: theme.text }]}>{t.monthlyDetails}</Text>
            <Text style={[styles.listSubtitle, { color: theme.textSecondary }]}>{t.tapToSelect}</Text>
          </View>
          <View style={styles.listContainer}>
            {monthlyData.map((d) => (
              <MonthCard
                key={d.key}
                data={d}
                isSelected={d.key === selectedKey}
                onPress={() => setSelectedKey(d.key)}
                maxVal={maxCardVal}
                colors={colors}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* ── Selected Month Detail (Professional Financial Executive Card) ── */}
        {selected && (
          <ThemedView type="backgroundElement" style={styles.detailCard}>
            <View style={[styles.detailStripe, { backgroundColor: selected.net >= 0 ? colors.success : colors.danger }]} />
            
            <View style={styles.detailInner}>
              {/* Header Row */}
              <View style={styles.detailHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.detailBadge}>
                    <Feather name="activity" size={11} color={colors.primary} />
                    <Text style={[styles.detailBadgeText, { color: colors.primary }]}>{t.detailReport}</Text>
                  </View>
                  <Text style={[styles.detailMonth, { color: theme.text }]}>
                    {selected.label}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: selected.net >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: selected.net >= 0 ? colors.success : colors.danger }]} />
                  <Text style={[styles.statusPillText, { color: selected.net >= 0 ? colors.success : colors.danger }]}>
                    {selected.net >= 0 ? (language === 'bn' ? 'উদ্বৃত্ত' : 'Surplus') : (language === 'bn' ? 'ঘাটতি' : 'Deficit')}
                  </Text>
                </View>
              </View>

              {/* 3 Metric Cards Grid */}
              <View style={styles.metricGrid}>
                {/* Income */}
                <View style={[styles.metricCard, { backgroundColor: theme.background, borderColor: 'rgba(16, 185, 129, 0.16)' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Feather name="arrow-down-left" size={13} color={colors.success} />
                  </View>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{t.income}</Text>
                  <Text style={[styles.metricValue, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
                    {getCurrencySymbol()}{formatNumber(selected.income)}
                  </Text>
                </View>

                {/* Expense */}
                <View style={[styles.metricCard, { backgroundColor: theme.background, borderColor: 'rgba(239, 68, 68, 0.16)' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                    <Feather name="arrow-up-right" size={13} color={colors.danger} />
                  </View>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{t.expense}</Text>
                  <Text style={[styles.metricValue, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                    {getCurrencySymbol()}{formatNumber(selected.expense)}
                  </Text>
                </View>

                {/* Net Savings */}
                <View style={[styles.metricCard, { backgroundColor: theme.background, borderColor: selected.net >= 0 ? 'rgba(59, 130, 246, 0.16)' : 'rgba(239, 68, 68, 0.16)' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: selected.net >= 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                    <Feather name={selected.net >= 0 ? "shield" : "alert-circle"} size={13} color={selected.net >= 0 ? colors.primary : colors.danger} />
                  </View>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                    {selected.net >= 0 ? t.savingsWord : t.deficitWord}
                  </Text>
                  <Text style={[styles.metricValue, { color: selected.net >= 0 ? colors.primary : colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                    {selected.net >= 0 ? '+' : '-'}{getCurrencySymbol()}{formatNumber(Math.abs(selected.net))}
                  </Text>
                </View>
              </View>

              {/* Savings Efficiency Section */}
              {selected.income > 0 && (
                <View style={[styles.savingsBox, { backgroundColor: theme.background, borderColor: 'rgba(150,150,150,0.1)' }]}>
                  <View style={styles.savingsBoxHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="pie-chart" size={13} color={theme.textSecondary} />
                      <Text style={[styles.savingsBoxTitle, { color: theme.text }]}>{t.savingsRate}</Text>
                    </View>
                    <View style={[styles.savingsPctBadge, { backgroundColor: selected.savingsRate >= 20 ? 'rgba(16,185,129,0.12)' : selected.savingsRate >= 0 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                      <Text style={[styles.savingsPctBadgeText, { color: selected.savingsRate >= 20 ? colors.success : selected.savingsRate >= 0 ? colors.warning : colors.danger }]}>
                        {language === 'bn' ? toBanglaDigits(selected.savingsRate.toString()) : selected.savingsRate}%
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailSavingsTrack, { backgroundColor: theme.backgroundSelected }]}>
                    <View
                      style={[
                        styles.detailSavingsFill,
                        {
                          width: `${Math.max(Math.min(Math.abs(selected.savingsRate), 100), selected.income > 0 ? 2 : 0)}%` as any,
                          backgroundColor: selected.savingsRate >= 20 ? colors.success : selected.savingsRate >= 0 ? colors.warning : colors.danger,
                        },
                      ]}
                    />
                  </View>

                  <View style={[styles.hintPill, { backgroundColor: selected.savingsRate >= 20 ? 'rgba(16,185,129,0.08)' : selected.savingsRate >= 0 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)' }]}>
                    <Feather 
                      name={selected.savingsRate >= 20 ? "check-circle" : selected.savingsRate >= 0 ? "info" : "alert-triangle"} 
                      size={13} 
                      color={selected.savingsRate >= 20 ? colors.success : selected.savingsRate >= 0 ? colors.warning : colors.danger} 
                    />
                    <Text style={[styles.hintPillText, { color: selected.savingsRate >= 20 ? colors.success : selected.savingsRate >= 0 ? colors.warning : colors.danger }]}>
                      {selected.savingsRate >= 20
                        ? t.savingsHintExcellent
                        : selected.savingsRate >= 10
                        ? t.savingsHintGood
                        : selected.savingsRate >= 0
                        ? t.savingsHintLow
                        : t.savingsHintDeficit}
                    </Text>
                  </View>
                </View>
              )}

              {/* Transactions Recorded Count */}
              <View style={[styles.txCountCard, { backgroundColor: theme.background, borderColor: 'rgba(150,150,150,0.1)' }]}>
                <View style={[styles.txCountIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.10)' }]}>
                  <Feather name="file-text" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.txCountCardText, { color: theme.text }]}>
                  {t.recordedTxPrefix} <Text style={{ fontWeight: '800', color: colors.primary }}>{language === 'bn' ? toBanglaDigits(selected.txCount.toString()) : selected.txCount}</Text>{t.recordedTxSuffix}
                </Text>
              </View>

              {/* Professional Download CTA Button */}
              <TouchableOpacity
                style={styles.downloadStatementBtn}
                onPress={() => setPdfModalVisible(true)}
                activeOpacity={0.88}
              >
                <View style={styles.downloadBtnIconBg}>
                  <Feather name="file-text" size={16} color="#FFF" />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.downloadStatementBtnTitle}>{language === 'bn' ? 'মাসিক PDF স্টেটমেন্ট' : 'Monthly PDF Statement'}</Text>
                  <Text style={styles.downloadStatementBtnSubtitle}>{language === 'bn' ? 'প্রফেশনাল মেমো ও রিপোর্ট ডাউনলোড' : 'Download statement & report memo'}</Text>
                </View>
                <View style={styles.downloadBtnArrow}>
                  <Feather name="download" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

        {/* ── Footer Tip ── */}
        <ThemedView type="backgroundElement" style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: theme.text }]}>{t.expertTipTitle}</Text>
            <Text style={[styles.tipDesc, { color: theme.textSecondary }]}>
              {t.expertTipDesc}
            </Text>
          </View>
        </ThemedView>

      </ThemedView>

      {/* PDF Export Modal */}
      <PDFExportModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        transactions={
          selected
            ? transactions.filter((tx) => {
                if (!tx.date) return false;
                const parts = tx.date.split('-');
                if (parts.length < 3) return false;
                const txY = Number(parts[0]);
                const txM = Number(parts[1]);
                return txY === selected.year && (txM - 1) === selected.month;
              })
            : transactions
        }
        userName={user?.name}
        currentMonthSummary={
          selected
            ? {
                monthName: selected.label.split(' ')[0],
                year: selected.year,
                totalIncome: selected.income,
                totalExpense: selected.expense,
                netSavings: selected.net,
                savingsRate: selected.savingsRate,
                userName: user?.name,
                userEmail: user?.email,
              }
            : undefined
        }
      />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { flexDirection: 'row', justifyContent: 'center' },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    backgroundColor: 'transparent',
    paddingBottom: Spacing.four,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two },
  headerEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 30, fontWeight: '800', lineHeight: 46, paddingTop: 10, paddingBottom: 10 },
  pdfExportHeaderBtn: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pdfExportHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addIconBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  downloadStatementBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  downloadBtnIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  downloadStatementBtnTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  downloadStatementBtnSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  downloadBtnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.10)',
  },
  heroAccentBar: { flexDirection: 'row', height: 5, gap: 2 },
  heroAccentSeg: { height: '100%' },
  heroInner: { padding: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two },
  heroEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroSplitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heroSplitItem: { flex: 1, gap: 4 },
  heroSplitLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  heroSplitAmt: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  heroTK: { fontSize: 14, fontWeight: '600', opacity: 0.75 },
  heroSplitSep: { width: 1, height: 40 },
  heroDivider: { height: 1, borderRadius: 1, marginVertical: 2 },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatSep: { width: 1, height: 28 },
  heroStatVal: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  heroStatLbl: { fontSize: 10, fontWeight: '600' },
  sectionCard: {
    borderRadius: 24, padding: Spacing.four,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(150,150,150,0.08)', gap: Spacing.three,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardEmoji: { fontSize: 26 },
  legendRow: { flexDirection: 'row', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '600' },
  tooltip: { borderRadius: 12, padding: Spacing.two, gap: 4 },
  tooltipTitle: { fontSize: 13, fontWeight: '700' },
  tooltipRow: { flexDirection: 'row', gap: Spacing.three },
  tooltipItem: { fontSize: 12, fontWeight: '700' },
  insightRow: { flexDirection: 'row', gap: Spacing.three },
  insightCard: { flex: 1, borderRadius: 20, padding: Spacing.three, gap: 5, borderWidth: 1 },
  insightIcon: { fontSize: 22 },
  insightTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  insightMonthName: { fontSize: 14, fontWeight: '700' },
  insightAmt: { fontSize: 15, fontWeight: '800' },
  listSection: { gap: Spacing.two },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.one },
  listTitle: { fontSize: 18, fontWeight: '800' },
  listSubtitle: { fontSize: 12, fontWeight: '600' },
  listContainer: { gap: Spacing.two },
  detailCard: {
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(150,150,150,0.08)',
  },
  detailStripe: { height: 4 },
  detailInner: { padding: Spacing.four, gap: Spacing.three },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  detailMonth: { fontSize: 20, fontWeight: '800' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  savingsBox: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  savingsBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  savingsPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  savingsPctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailSavingsTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  detailSavingsFill: { height: '100%', borderRadius: 4 },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  hintPillText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  txCountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  txCountIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCountCardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipCard: {
    borderRadius: 20, padding: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(150,150,150,0.08)',
  },
  tipIcon: { fontSize: 22 },
  tipTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  tipDesc: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  emptyCard: { borderRadius: 24, padding: Spacing.six, alignItems: 'center', gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptyDesc: { textAlign: 'center', lineHeight: 20 },
});

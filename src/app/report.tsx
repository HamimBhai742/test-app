import React, { useMemo, useState } from 'react';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Removed hardcoded month names, they will come from translations now

const formatNumber = (num: number) => {
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

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
            {netPositive ? '+' : '-'} TK {formatNumber(Math.abs(data.net))}
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
      const [y, m] = tx.date.split('-');
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
          label: `${t.monthNames[m - 1]} ${y}`,
          shortLabel: t.monthShort[m - 1],
          income: d.income,
          expense: d.expense,
          net,
          txCount: d.count,
          savingsRate,
        };
      });
  }, [transactions, t]);

  const [selectedKey, setSelectedKey] = useState<string | null>(
    monthlyData.length > 0 ? monthlyData[0].key : null
  );

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
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>{t.monthlyReportEyebrow}</Text>
              <ThemedText style={styles.headerTitle}>{t.monthlyReportTitle}</ThemedText>
            </View>
            <TouchableOpacity
              style={styles.pdfExportHeaderBtn}
              onPress={() => setPdfModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.pdfExportHeaderBtnText}>{t.pdfExportBtn}</Text>
            </TouchableOpacity>
          </View>
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <ThemedText style={styles.emptyTitle}>{t.noReportTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
              {t.noReportDesc}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <PDFExportModal
          visible={pdfModalVisible}
          onClose={() => setPdfModalVisible(false)}
          transactions={transactions}
          userName={user?.name}
        />
      </ScrollView>
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
          <View>
            <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>{t.monthlyReportEyebrow}</Text>
            <ThemedText style={styles.headerTitle}>{t.monthlyReportTitle}</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.pdfExportHeaderBtn}
            onPress={() => setPdfModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.pdfExportHeaderBtnText}>{t.pdfExportBtn}</Text>
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
                  <Text style={styles.heroTK}>TK </Text>
                  {formatNumber(overallStats.totalInc)}
                </Text>
              </View>
              <View style={[styles.heroSplitSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroSplitItem}>
                <Text style={[styles.heroSplitLabel, { color: theme.textSecondary }]}>{t.totalExpense}</Text>
                <Text style={[styles.heroSplitAmt, { color: colors.danger }]}>
                  <Text style={styles.heroTK}>TK </Text>
                  {formatNumber(overallStats.totalExp)}
                </Text>
              </View>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, { color: colors.primary }]}>
                  TK {formatNumber(overallStats.avgMonthlyExpense)}
                </Text>
                <Text style={[styles.heroStatLbl, { color: theme.textSecondary }]}>{t.avgMonthlyExpense}</Text>
              </View>
              <View style={[styles.heroStatSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, { color: overallStats.totalInc - overallStats.totalExp >= 0 ? colors.success : colors.danger }]}>
                  TK {formatNumber(Math.abs(overallStats.totalInc - overallStats.totalExp))}
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
                <Text style={[styles.tooltipItem, { color: colors.success }]}>{t.income}: TK {formatNumber(selected.income)}</Text>
                <Text style={[styles.tooltipItem, { color: colors.danger }]}>{t.expense}: TK {formatNumber(selected.expense)}</Text>
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
              <Text style={[styles.insightAmt, { color: '#10B981' }]}>+TK {formatNumber(overallStats.bestMonth.net)}</Text>
            </View>
          )}
          {overallStats.worstMonth && overallStats.bestMonth?.key !== overallStats.worstMonth.key && (
            <View style={[styles.insightCard, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.18)' }]}>
              <Text style={styles.insightIcon}>⚠️</Text>
              <Text style={[styles.insightTitle, { color: '#991b1b' }]}>{t.worstMonth}</Text>
              <Text style={[styles.insightMonthName, { color: '#DC2626' }]}>{overallStats.worstMonth.label}</Text>
              <Text style={[styles.insightAmt, { color: '#EF4444' }]}>
                {overallStats.worstMonth.net >= 0 ? '+' : '-'}TK {formatNumber(Math.abs(overallStats.worstMonth.net))}
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

        {/* ── Selected Month Detail ── */}
        {selected && (
          <ThemedView type="backgroundElement" style={styles.detailCard}>
            <View style={[styles.detailStripe, { backgroundColor: selected.net >= 0 ? colors.success : colors.danger }]} />
            <View style={styles.detailInner}>
              <Text style={[styles.detailEyebrow, { color: theme.textSecondary }]}>{t.detailReport}</Text>
              <Text style={[styles.detailMonth, { color: theme.text }]}>{selected.label}</Text>
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatItem}>
                  <Text style={[styles.detailStatVal, { color: colors.success }]}>TK {formatNumber(selected.income)}</Text>
                  <Text style={[styles.detailStatLbl, { color: theme.textSecondary }]}>{t.income}</Text>
                </View>
                <View style={[styles.detailStatSep, { backgroundColor: theme.backgroundSelected }]} />
                <View style={styles.detailStatItem}>
                  <Text style={[styles.detailStatVal, { color: colors.danger }]}>TK {formatNumber(selected.expense)}</Text>
                  <Text style={[styles.detailStatLbl, { color: theme.textSecondary }]}>{t.expense}</Text>
                </View>
                <View style={[styles.detailStatSep, { backgroundColor: theme.backgroundSelected }]} />
                <View style={styles.detailStatItem}>
                  <Text style={[styles.detailStatVal, { color: selected.net >= 0 ? colors.success : colors.danger }]}>
                    {selected.net >= 0 ? '+' : '-'}TK {formatNumber(Math.abs(selected.net))}
                  </Text>
                  <Text style={[styles.detailStatLbl, { color: theme.textSecondary }]}>
                    {selected.net >= 0 ? t.savingsWord : t.deficitWord}
                  </Text>
                </View>
              </View>
              {selected.income > 0 && (
                <View style={styles.detailSavingsSection}>
                  <View style={styles.detailSavingsLabelRow}>
                    <Text style={[styles.detailSavingsLabel, { color: theme.text }]}>{t.savingsRate}</Text>
                    <Text style={[styles.detailSavingsPct, { color: selected.savingsRate >= 20 ? colors.success : selected.savingsRate >= 0 ? colors.warning : colors.danger }]}>
                      {selected.savingsRate}%
                    </Text>
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
                  <Text style={[styles.detailSavingsHint, { color: theme.textSecondary }]}>
                    {selected.savingsRate >= 20
                      ? t.savingsHintExcellent
                      : selected.savingsRate >= 10
                      ? t.savingsHintGood
                      : selected.savingsRate >= 0
                      ? t.savingsHintLow
                      : t.savingsHintDeficit}
                  </Text>
                </View>
              )}
              <View style={[styles.detailTxRow, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={styles.detailTxEmoji}>📝</Text>
                <Text style={[styles.detailTxText, { color: theme.text }]}>
                  {t.recordedTxPrefix} <Text style={{ fontWeight: '800' }}>{selected.txCount}</Text>{t.recordedTxSuffix}
                </Text>
              </View>

              {/* PDF Statement Download Action Button */}
              <TouchableOpacity
                style={styles.downloadStatementBtn}
                onPress={() => setPdfModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.downloadStatementBtnText}>📄 এই মাসের PDF স্টেটমেন্ট ডাউনলোড করুন</Text>
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
        transactions={transactions}
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
  headerTitle: { fontSize: 30, fontWeight: '800', lineHeight: 36 },
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
  downloadStatementBtn: {
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadStatementBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  detailStripe: { height: 5 },
  detailInner: { padding: Spacing.four, gap: Spacing.three },
  detailEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  detailMonth: { fontSize: 22, fontWeight: '800', marginTop: -4 },
  detailStatsRow: { flexDirection: 'row', alignItems: 'center' },
  detailStatItem: { flex: 1, alignItems: 'center' },
  detailStatSep: { width: 1, height: 32 },
  detailStatVal: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  detailStatLbl: { fontSize: 11, fontWeight: '600' },
  detailSavingsSection: { gap: 8 },
  detailSavingsLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailSavingsLabel: { fontSize: 14, fontWeight: '700' },
  detailSavingsPct: { fontSize: 16, fontWeight: '800' },
  detailSavingsTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  detailSavingsFill: { height: '100%', borderRadius: 5 },
  detailSavingsHint: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  detailTxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 12, padding: Spacing.two },
  detailTxEmoji: { fontSize: 18 },
  detailTxText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
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

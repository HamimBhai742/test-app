import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Platform,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTransactions } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatNumber = (num: number) => {
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Convert polar to cartesian (for pie slice positioning)
const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// ─── Pure-RN Donut Chart (arc border trick) ──────────────────────────────────
// Uses concentric Views with per-side borderColor to create proper arc slices.
// Each slice: a full circle View with only the relevant border sides colored.

interface PieSlice {
  percentage: number;
  color: string;
  emoji: string;
  label: string;
  amount: number;
}

const RING_SIZE = 160;
const RING_WIDTH = 22;


function DonutChart({
  slices,
  themeBackground,
}: {
  slices: PieSlice[];
  themeBackground: string;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const topSlice = slices[0];
  const holeSize = RING_SIZE - RING_WIDTH * 2 - 8;

  return (
    <View style={styles.donutWrapper}>
      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Track ring (background) */}
        <View
          style={[
            styles.donutRingBase,
            { borderColor: 'rgba(150,150,150,0.10)' },
          ]}
        />

        {/* Colored arc segments */}
        {(() => {
          let acc = 0;
          return slices.map((s, i) => {
            const sweep = (s.percentage / 100) * 360;
            const arcStyle = {
              position: 'absolute' as const,
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: RING_WIDTH,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              ...((): object => {
                const start = acc;
                const end = acc + sweep;
                return {
                  borderTopColor: start < 90 || end >= 360 + start ? s.color : 'transparent',
                  borderRightColor: end > 90 ? s.color : 'transparent',
                  borderBottomColor: end > 180 ? s.color : 'transparent',
                  borderLeftColor: end > 270 ? s.color : 'transparent',
                  transform: [{ rotate: `${start - 45}deg` }],
                };
              })(),
            };
            acc += sweep;
            return <View key={i} style={arcStyle} />;
          });
        })()}

        {/* Hole overlay */}
        <View
          style={[styles.donutHole, { width: holeSize, height: holeSize, borderRadius: holeSize / 2, backgroundColor: themeBackground }]}
        />

        {/* Center content */}
        <View style={styles.donutCenter}>
          {topSlice && (
            <>
              <Text style={styles.donutCenterEmoji}>{topSlice.emoji}</Text>
              <Text style={[styles.donutCenterPct, { color: topSlice.color }]}>
                {topSlice.percentage}%
              </Text>
              <Text style={styles.donutCenterLabel}>{t.maxWord}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

interface BarData {
  label: string;
  amount: number;
  color: string;
}

function BarChart({ data, maxVal }: { data: BarData[]; maxVal: number }) {
  const gridLines = [0, 0.25, 0.5, 0.75, 1.0];
  return (
    <View style={styles.barChartContainer}>
      {/* Y-axis labels + grid */}
      <View style={styles.barChartInner}>
        {/* Grid lines */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {gridLines.map((frac, i) => (
            <View
              key={i}
              style={[
                styles.barGridLine,
                { bottom: `${frac * 100}%` as any },
              ]}
            />
          ))}
        </View>

        {/* Bars */}
        {data.map((item, idx) => {
          const heightPct = maxVal > 0 ? (item.amount / maxVal) * 100 : 0;
          const isActive = item.amount > 0;
          return (
            <View key={idx} style={styles.barColumn}>
              {/* Value label */}
              {isActive && (
                <Text style={[styles.barValueLabel, { color: item.color }]}>
                  {item.amount >= 1000
                    ? `${(item.amount / 1000).toFixed(1).replace(/\.0$/, '')}k`
                    : item.amount}
                </Text>
              )}

              {/* Bar track */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(heightPct, isActive ? 4 : 1)}%` as any,
                      backgroundColor: isActive ? item.color : 'rgba(150,150,150,0.12)',
                      borderRadius: 8,
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                    },
                  ]}
                >
                  {isActive && <View style={styles.barHighlight} />}
                </View>
              </View>

              {/* Day label */}
              <Text style={styles.barDayLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const { transactions } = useTransactions();
  const { language } = useLanguage();
  const t = translations[language];
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  // Pulsing animation for the green LIVE dot
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    pink: '#EC4899',
    slate: '#64748B',
    orange: '#F97316',
  };

  const categoryLabels: Record<string, string> = {
    Food: t.catFood,
    Shopping: t.catShopping,
    Utilities: t.catUtilities,
    Rent: t.catRent,
    Entertainment: t.catEntertainment,
    Others: t.catOthers,
  };

  const categoryColors: Record<string, string> = {
    Food: colors.warning,
    Shopping: colors.purple,
    Utilities: colors.cyan,
    Rent: colors.primary,
    Entertainment: colors.pink,
    Others: colors.slate,
  };

  const categoryEmojis: Record<string, string> = {
    Food: '🍔',
    Shopping: '🛒',
    Utilities: '⚡',
    Rent: '🏠',
    Entertainment: '🎬',
    Others: '🏷️',
  };

  const expenseStats = useMemo(() => {
    const expenses = transactions.filter((tx) => tx.type === 'expense');
    const totalExp = expenses.reduce((acc, tx) => acc + tx.amount, 0);

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((tx) => {
      if (!categoryTotals[tx.category]) categoryTotals[tx.category] = 0;
      categoryTotals[tx.category] += tx.amount;
    });

    const breakdown = Object.keys(categoryTotals)
      .map((cat) => {
        const amount = categoryTotals[cat];
        const percentage = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
        return {
          category: cat,
          label: categoryLabels[cat] || cat,
          amount,
          percentage,
          color: categoryColors[cat] || colors.slate,
          emoji: categoryEmojis[cat] || '🏷️',
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const maxAmount = breakdown.length > 0 ? Math.max(...breakdown.map((i) => i.amount)) : 1;
    const highestExpense = breakdown.length > 0 ? breakdown[0] : null;
    const avgExpense = expenses.length > 0 ? Math.round(totalExp / expenses.length) : 0;

    // Weekly bar chart data
    const weeklyTrend: BarData[] = [
      { label: t.weekDays[0], amount: 1500, color: colors.primary },
      { label: t.weekDays[1], amount: 0, color: colors.primary },
      { label: t.weekDays[2], amount: 0, color: colors.primary },
      { label: t.weekDays[3], amount: 120, color: colors.warning },
      { label: t.weekDays[4], amount: 0, color: colors.primary },
      { label: t.weekDays[5], amount: 15, color: colors.pink },
      { label: t.weekDays[6], amount: 0, color: colors.primary },
    ];
    const maxWeekly = Math.max(...weeklyTrend.map((d) => d.amount), 1);

    // Summary stats row
    const incomes = transactions.filter((tx) => tx.type === 'income');
    const totalIncome = incomes.reduce((acc, tx) => acc + tx.amount, 0);
    const netBalance = totalIncome - totalExp;

    return {
      totalExpense: totalExp,
      totalIncome,
      netBalance,
      expensesCount: expenses.length,
      breakdown,
      maxAmount,
      highestExpense,
      avgExpense,
      weeklyTrend,
      maxWeekly,
    };
  }, [transactions]);

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

  const hasPieData = expenseStats.breakdown.length > 0;
  const pieSlices: PieSlice[] = expenseStats.breakdown.map((b) => ({
    percentage: b.percentage,
    color: b.color,
    emoji: b.emoji,
    label: b.label,
    amount: b.amount,
  }));

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>
              {t.expenseAnalyticsEyebrow}
            </Text>
            <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{t.expenseAnalyticsTitle}</ThemedText>
          </View>
          <View style={[styles.liveDotBg, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveLabel}>{t.live}</Text>
          </View>
        </View>

        {/* ── Period Filter ── */}
        <View style={[styles.periodFilter, { backgroundColor: theme.backgroundElement }]}>
          {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodTab,
                selectedPeriod === period && [
                  styles.periodTabActive,
                  { backgroundColor: theme.background },
                ],
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  { color: selectedPeriod === period ? theme.text : theme.textSecondary },
                ]}
              >
                {period === 'weekly' ? t.weekly : period === 'monthly' ? t.monthly : t.yearly}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Hero Summary Card ── */}
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          {/* Accent bar */}
          <View style={styles.heroAccentBar}>
            <View style={[styles.heroAccentSeg, { flex: 3, backgroundColor: colors.danger }]} />
            <View style={[styles.heroAccentSeg, { flex: 1, backgroundColor: colors.warning }]} />
            <View style={[styles.heroAccentSeg, { flex: 1, backgroundColor: colors.purple }]} />
          </View>

          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <Text style={[styles.heroEyebrow, { color: theme.textSecondary }]}>
                {t.totalOutflow}
              </Text>
              <View style={styles.trendBadge}>
                <Text style={styles.trendArrow}>▲</Text>
                <Text style={styles.trendText}>+১২%</Text>
              </View>
            </View>

            <View style={styles.heroAmountRow}>
              <Text style={styles.heroTK}>TK</Text>
              <Text style={styles.heroAmount}>
                {formatNumber(expenseStats.totalExpense)}
              </Text>
            </View>

            {/* 3-stat mini row */}
            <View style={[styles.heroStatsDivider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: colors.primary }]}>
                  {expenseStats.expensesCount}
                </Text>
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                  {t.txWord}
                </Text>
              </View>
              <View style={[styles.heroStatSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatValue, { color: colors.success }]}>
                  TK {formatNumber(expenseStats.avgExpense)}
                </Text>
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                  {t.avgExpense}
                </Text>
              </View>
              <View style={[styles.heroStatSep, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.heroStatItem}>
                <Text
                  style={[
                    styles.heroStatValue,
                    { color: expenseStats.netBalance >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  TK {formatNumber(Math.abs(expenseStats.netBalance))}
                </Text>
                <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                  {expenseStats.netBalance >= 0 ? t.savingsWord : t.deficitWord}
                </Text>
              </View>
            </View>
          </View>
        </ThemedView>

        {/* ── Empty State ── */}
        {!hasPieData ? (
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <ThemedText style={styles.emptyTitle}>{t.noDataTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
              {t.noDataDesc}
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {/* ── Pie / Donut Chart Card ── */}
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardEyebrow, { color: theme.textSecondary }]}>
                    {t.breakdownEyebrow}
                  </Text>
                  <ThemedText style={styles.cardTitle}>{t.expenseByCategory}</ThemedText>
                </View>
                <Text style={styles.cardTitleEmoji}>🥧</Text>
              </View>

              <View style={styles.pieRow}>
                {/* Donut chart */}
                <DonutChart slices={pieSlices} themeBackground={theme.backgroundElement} />

                {/* Legend */}
                <View style={styles.pieLegend}>
                  {expenseStats.breakdown.map((item) => (
                    <View key={item.category} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <View style={styles.legendText}>
                        <Text style={[styles.legendName, { color: theme.text }]}>
                          {item.emoji} {item.label}
                        </Text>
                        <Text style={[styles.legendPct, { color: item.color }]}>
                          {item.percentage}% · TK {formatNumber(item.amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Stacked bar ribbon */}
              <View style={[styles.ribbonTrack, { backgroundColor: theme.backgroundSelected }]}>
                {expenseStats.breakdown.map((item, i) => (
                  <View
                    key={item.category}
                    style={[
                      styles.ribbonSeg,
                      {
                        flex: item.percentage,
                        backgroundColor: item.color,
                        borderTopLeftRadius: i === 0 ? 6 : 0,
                        borderBottomLeftRadius: i === 0 ? 6 : 0,
                        borderTopRightRadius: i === expenseStats.breakdown.length - 1 ? 6 : 0,
                        borderBottomRightRadius: i === expenseStats.breakdown.length - 1 ? 6 : 0,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.ribbonLabels}>
                {expenseStats.breakdown.map((item) => (
                  <Text key={item.category} style={[styles.ribbonLabel, { color: item.color, flex: item.percentage }]}>
                    {item.percentage > 10 ? `${item.percentage}%` : ''}
                  </Text>
                ))}
              </View>
            </ThemedView>

            {/* ── Bar Chart Card ── */}
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardEyebrow, { color: theme.textSecondary }]}>
                    {t.weeklyTrendEyebrow}
                  </Text>
                  <ThemedText style={styles.cardTitle}>{t.weeklyExpenseTitle}</ThemedText>
                </View>
                <Text style={styles.cardTitleEmoji}>📊</Text>
              </View>

              <BarChart data={expenseStats.weeklyTrend} maxVal={expenseStats.maxWeekly} />

              {/* Summary chips */}
              <View style={[styles.barSummaryRow, { borderTopColor: theme.backgroundSelected }]}>
                <View style={styles.barSummaryChip}>
                  <View style={[styles.barSummaryDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.barSummaryLabel, { color: theme.textSecondary }]}>
                    {t.maxPrefix} <Text style={{ color: theme.text, fontWeight: '700' }}>
                      TK {formatNumber(expenseStats.maxWeekly)}
                    </Text>
                  </Text>
                </View>
                <View style={styles.barSummaryChip}>
                  <View style={[styles.barSummaryDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.barSummaryLabel, { color: theme.textSecondary }]}>
                    {t.totalPrefix} <Text style={{ color: theme.text, fontWeight: '700' }}>
                      TK {formatNumber(expenseStats.weeklyTrend.reduce((a, b) => a + b.amount, 0))}
                    </Text>
                  </Text>
                </View>
              </View>
            </ThemedView>

            {/* ── Category List Card ── */}
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={[styles.cardHeader, { marginBottom: Spacing.two }]}>
                <View>
                  <Text style={[styles.cardEyebrow, { color: theme.textSecondary }]}>
                    {t.detailsEyebrow}
                  </Text>
                  <ThemedText style={styles.cardTitle}>{t.detailedBreakdown}</ThemedText>
                </View>
                <Text style={styles.cardTitleEmoji}>📋</Text>
              </View>

              {expenseStats.breakdown.map((item, index) => (
                <View key={item.category}>
                  <View style={styles.catRow}>
                    {/* Icon */}
                    <View style={[styles.catIcon, { backgroundColor: `${item.color}18` }]}>
                      <Text style={styles.catEmoji}>{item.emoji}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.catInfo}>
                      <View style={styles.catTopRow}>
                        <Text style={[styles.catName, { color: theme.text }]}>{item.label}</Text>
                        <Text style={[styles.catAmount, { color: theme.text }]}>
                          <Text style={[styles.catTK, { color: theme.textSecondary }]}>TK </Text>
                          {formatNumber(item.amount)}
                        </Text>
                      </View>
                      {/* Progress bar */}
                      <View style={[styles.catBarBg, { backgroundColor: theme.backgroundSelected }]}>
                        <View
                          style={[
                            styles.catBarFill,
                            {
                              width: `${item.percentage}%` as any,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.catPct, { color: item.color }]}>
                        {item.percentage}% {t.ofTotal}
                      </Text>
                    </View>
                  </View>
                  {index < expenseStats.breakdown.length - 1 && (
                    <View style={[styles.catDivider, { backgroundColor: theme.backgroundSelected }]} />
                  )}
                </View>
              ))}
            </ThemedView>

            {/* ── Insight Cards ── */}
            <View style={styles.insightRow}>
              {expenseStats.highestExpense && (
                <View style={styles.insightCard}>
                  <View style={[styles.insightIconBg, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                    <Text style={styles.insightIcon}>⚠️</Text>
                  </View>
                  <Text style={[styles.insightTitle, { color: '#991b1b' }]}>
                    {t.warningTitle}
                  </Text>
                  <Text style={[styles.insightDesc, { color: '#7f1d1d' }]}>
                    {expenseStats.highestExpense.emoji} {expenseStats.highestExpense.label} {t.warningDesc1} {expenseStats.highestExpense.percentage}% {t.warningDesc2}
                  </Text>
                </View>
              )}

              <View style={styles.insightCard}>
                <View style={[styles.insightIconBg, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Text style={styles.insightIcon}>💡</Text>
                </View>
                <Text style={[styles.insightTitle, { color: '#166534' }]}>
                  {t.tipTitle}
                </Text>
                <Text style={[styles.insightDesc, { color: '#14532d' }]}>
                  {t.tipDesc1}{formatNumber(expenseStats.avgExpense)}{t.tipDesc2}
                </Text>
              </View>
            </View>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    backgroundColor: 'transparent',
    paddingBottom: Spacing.four,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 46,
    paddingTop: 10,
    paddingBottom: 10,
  },
  liveDotBg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
  },

  // Period Filter
  periodFilter: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.10)',
  },
  heroAccentBar: {
    flexDirection: 'row',
    height: 5,
    gap: 2,
  },
  heroAccentSeg: { height: '100%' },
  heroInner: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  trendArrow: { fontSize: 9, color: '#EF4444', fontWeight: '900' },
  trendText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 4,
  },
  heroTK: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 7,
    opacity: 0.75,
  },
  heroAmount: {
    fontSize: 46,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroStatsDivider: {
    height: 1,
    marginVertical: Spacing.two + 2,
    borderRadius: 1,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatSep: {
    width: 1,
    height: 32,
    borderRadius: 1,
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty state
  emptyCard: {
    borderRadius: 24,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.three },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: Spacing.one },
  emptyDesc: { textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.three },

  // Section card wrapper
  sectionCard: {
    borderRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  cardTitleEmoji: {
    fontSize: 28,
    marginTop: 2,
  },

  // Donut chart
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  donutRingBase: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_WIDTH,
  },
  donutHole: {
    position: 'absolute',
    zIndex: 5,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  donutCenterEmoji: {
    fontSize: 22,
  },
  donutCenterPct: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: -2,
  },
  donutCenterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // Pie row (chart + legend)
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  pieLegend: {
    flex: 1,
    gap: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: { flex: 1 },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },

  // Ribbon bar
  ribbonTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  ribbonSeg: { height: '100%' },
  ribbonLabels: {
    flexDirection: 'row',
  },
  ribbonLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Bar Chart
  barChartContainer: {
    height: 160,
    marginBottom: Spacing.three,
  },
  barChartInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 24,
    position: 'relative',
  },
  barGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.08)',
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 3,
    textAlign: 'center',
  },
  barTrack: {
    width: '75%',
    height: '80%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 8,
  },
  barFill: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  barHighlight: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 2.5,
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1.5,
  },
  barDayLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  barSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  barSummaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  barSummaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barSummaryLabel: {
    fontSize: 12,
  },

  // Category list
  catRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 4,
    paddingVertical: Spacing.two + 4,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 22 },
  catInfo: { flex: 1 },
  catTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  catTK: {
    fontSize: 11,
    fontWeight: '600',
  },
  catBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  catBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catPct: {
    fontSize: 10,
    fontWeight: '700',
  },
  catDivider: {
    height: 1,
    marginLeft: 44 + Spacing.two + 4,
  },

  // Insight cards
  insightRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  insightCard: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(150,150,150,0.08)',
  },
  insightIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insightIcon: { fontSize: 18 },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});

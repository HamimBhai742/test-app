import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { usePoints, getBadgeForPoints } from '@/context/PointsContext';
import { useAuth } from '@/context/AuthContext';

export default function LeaderboardScreen({ onBack }: { onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const t = translations[language];
  const { user } = useAuth();
  const { points, userBadge, dailyLoginEarnedToday, dailyTxEarnedToday, getLeaderboard } = usePoints();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const leaderboardList = getLeaderboard();
  const currentUserRankIndex = leaderboardList.findIndex((item) => item.isCurrentUser);
  const currentUserRank = currentUserRankIndex >= 0 ? currentUserRankIndex + 1 : 4;

  // Badge thresholds
  const nextMilestone = points < 100 ? 100 : points < 300 ? 300 : points < 600 ? 600 : 1000;
  const progressPercent = Math.min(100, Math.round((points / nextMilestone) * 100));

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backBtnIcon, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>🏆 {t.leaderboardHeader}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── User Current Rank & Points Hero Card ── */}
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <View style={styles.userHeroRow}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{
                    uri:
                      user?.avatar ||
                      user?.photo ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
                  }}
                  style={styles.heroAvatar}
                />
                <View style={styles.rankBadgeCorner}>
                  <Text style={styles.rankBadgeCornerText}>#{currentUserRank}</Text>
                </View>
              </View>

              <View style={styles.userHeroInfo}>
                <Text style={[styles.userNameText, { color: theme.text }]}>
                  {user?.name || t.currentAccount}
                </Text>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{userBadge}</Text>
                </View>
              </View>

              <View style={styles.pointsPillBox}>
                <Text style={styles.pointsPillVal}>⭐ {points}</Text>
                <Text style={styles.pointsPillLbl}>{t.pointsPillLabel}</Text>
              </View>
            </View>

            {/* Progress Bar to next tier */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <Text style={[styles.progressLbl, { color: theme.textSecondary }]}>
                  {t.nextBadgeProgress.replace('{points}', points.toString()).replace('{nextMilestone}', nextMilestone.toString())}
                </Text>
                <Text style={[styles.progressPercent, { color: '#EAB308' }]}>{progressPercent}%</Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </ThemedView>

          {/* ── Daily Reward Tasks ── */}
          <ThemedView type="backgroundElement" style={styles.tasksCard}>
            <Text style={[styles.cardSectionTitle, { color: theme.text }]}>{t.dailyRewardTasksTitle}</Text>

            <View style={styles.taskItemRow}>
              <View style={styles.taskIconBox}>
                <Text style={{ fontSize: 20 }}>📱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: theme.text }]}>{t.dailyAppOpenBonus}</Text>
                <Text style={[styles.taskSub, { color: theme.textSecondary }]}>{t.dailyAppOpenDesc}</Text>
              </View>
              <View style={[styles.taskStatusBadge, { backgroundColor: dailyLoginEarnedToday ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)' }]}>
                <Text style={[styles.taskStatusText, { color: dailyLoginEarnedToday ? '#10B981' : '#EAB308' }]}>
                  {dailyLoginEarnedToday ? `✓ ${t.earnedBadge}` : `⏳ ${t.pendingBadge}`}
                </Text>
              </View>
            </View>

            <View style={[styles.taskDivider, { backgroundColor: theme.backgroundSelected }]} />

            <View style={styles.taskItemRow}>
              <View style={styles.taskIconBox}>
                <Text style={{ fontSize: 20 }}>📝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: theme.text }]}>{t.dailyTxBonus}</Text>
                <Text style={[styles.taskSub, { color: theme.textSecondary }]}>{t.dailyTxDesc}</Text>
              </View>
              <View style={[styles.taskStatusBadge, { backgroundColor: dailyTxEarnedToday ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)' }]}>
                <Text style={[styles.taskStatusText, { color: dailyTxEarnedToday ? '#10B981' : '#EAB308' }]}>
                  {dailyTxEarnedToday ? `✓ ${t.earnedBadge}` : `⏳ ${t.pendingBadge}`}
                </Text>
              </View>
            </View>
          </ThemedView>

          {/* ── Community Ranks List ── */}
          <View style={styles.rankSectionHeader}>
            <Text style={[styles.cardSectionTitle, { color: theme.text }]}>{t.topUserLeaderboard}</Text>
            <Text style={[styles.rankSectionSub, { color: theme.textSecondary }]}>{t.leaderboardRankDesc}</Text>
          </View>

          <View style={styles.leaderboardList}>
            {leaderboardList.map((item, index) => {
              const rank = index + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              return (
                <ThemedView
                  key={item.id}
                  type="backgroundElement"
                  style={[
                    styles.rankRowCard,
                    item.isCurrentUser && { borderColor: '#208AEF', borderWidth: 2, backgroundColor: 'rgba(32, 138, 239, 0.12)' },
                  ]}
                >
                  <View style={styles.rankLeft}>
                    <View
                      style={[
                        styles.rankBadgeCircle,
                        isTop1 && { backgroundColor: '#FEF08A' },
                        isTop2 && { backgroundColor: '#E2E8F0' },
                        isTop3 && { backgroundColor: '#FFEDD5' },
                      ]}
                    >
                      <Text style={styles.rankBadgeText}>
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rank}`}
                      </Text>
                    </View>

                    <View>
                      <Text style={[styles.rankItemName, { color: theme.text, fontWeight: item.isCurrentUser ? '800' : '600' }]}>
                        {item.name} {item.isCurrentUser ? ` (${language === 'bn' ? 'আপনি' : 'You'})` : ''}
                      </Text>
                      <Text style={[styles.rankItemBadgeLabel, { color: theme.textSecondary }]}>
                        {item.badge}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rankRight}>
                    <Text style={styles.rankPointsVal}>⭐ {item.points}</Text>
                  </View>
                </ThemedView>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnIcon: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  heroCard: {
    borderRadius: 24,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1.5,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  userHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#EAB308',
  },
  rankBadgeCorner: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#EAB308',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankBadgeCornerText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  userHeroInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  badgePillText: {
    color: '#EAB308',
    fontSize: 11,
    fontWeight: '800',
  },
  pointsPillBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  pointsPillVal: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: '900',
  },
  pointsPillLbl: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLbl: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EAB308',
    borderRadius: 4,
  },
  tasksCard: {
    borderRadius: 20,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  taskSub: {
    fontSize: 11,
    marginTop: 2,
  },
  taskStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  taskDivider: {
    height: 1,
    marginVertical: 12,
  },
  rankSectionHeader: {
    marginBottom: 10,
  },
  rankSectionSub: {
    fontSize: 11,
    marginTop: -8,
    marginBottom: 8,
  },
  leaderboardList: {
    gap: 8,
  },
  rankRowCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  rankItemName: {
    fontSize: 14,
  },
  rankItemBadgeLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  rankRight: {},
  rankPointsVal: {
    color: '#EAB308',
    fontSize: 15,
    fontWeight: '800',
  },
});

import { formatNumber, getCurrencySymbol, toBanglaDigits } from '@/utils/number';
import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTransactions } from '@/context/TransactionContext';
import { useLanguage } from '@/context/LanguageContext';


import { translations } from '@/constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

// ─── Helpers ─────────────────────────────────────────────────────────────────



// ─── Constants ───────────────────────────────────────────────────────────────

type CategoryKey = string;

export interface CategoryItem {
  key: string;
  label: string;
  emoji: string;
  color: string;
  defaultBudget: number;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { key: 'Food',          label: 'Food',          emoji: '🍔', color: '#F59E0B', defaultBudget: 3000 },
  { key: 'Shopping',      label: 'Shopping',      emoji: '🛒', color: '#8B5CF6', defaultBudget: 2000 },
  { key: 'Utilities',     label: 'Utilities',     emoji: '⚡', color: '#06B6D4', defaultBudget: 1500 },
  { key: 'Rent',          label: 'Rent',          emoji: '🏠', color: '#3B82F6', defaultBudget: 5000 },
  { key: 'Entertainment', label: 'Entertainment', emoji: '🎬', color: '#EC4899', defaultBudget: 500  },
  { key: 'Transport',     label: 'Transport',     emoji: '🚗', color: '#10B981', defaultBudget: 2500 },
  { key: 'Health',        label: 'Health',        emoji: '🏥', color: '#EF4444', defaultBudget: 2000 },
  { key: 'Education',     label: 'Education',     emoji: '🎓', color: '#6366F1', defaultBudget: 3000 },
  { key: 'Bills',         label: 'Bills',         emoji: '🧾', color: '#14B8A6', defaultBudget: 1800 },
  { key: 'Others',        label: 'Others',        emoji: '🏷️', color: '#64748B', defaultBudget: 1000 },
];

type BudgetMap = Record<string, number>;

const DEFAULT_BUDGETS: BudgetMap = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.key, c.defaultBudget])
);

function getCategoryLabel(key: string, t: any) {
  switch (key) {
    case 'Food': return t.catFood;
    case 'Shopping': return t.catShopping;
    case 'Utilities': return t.catUtilities;
    case 'Rent': return t.catRent;
    case 'Entertainment': return t.catEntertainment;
    case 'Transport': return t.catTransport;
    case 'Health': return t.catHealth;
    case 'Education': return t.catEducation;
    case 'Bills': return t.catBills;
    case 'Others': return t.catOthers;
    default: return key;
  }
}

function BudgetEditModal({
  visible,
  category,
  currentBudget,
  onSave,
  onClose,
}: {
  visible: boolean;
  category: CategoryItem | null;
  currentBudget: number;
  onSave: (val: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const [input, setInput] = useState(currentBudget.toString());

  React.useEffect(() => {
    if (visible) setInput(currentBudget.toString());
  }, [visible, currentBudget]);

  const handleSave = () => {
    const val = parseFloat(input);
    if (!isNaN(val) && val > 0) {
      onSave(val);
      onClose();
    }
  };

  if (!category) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={Keyboard.dismiss}
          >
            {/* Handle */}
            <View style={[styles.modalHandle, { backgroundColor: theme.backgroundSelected }]} />

            {/* Header */}
            <View style={[styles.modalIconBg, { backgroundColor: `${category.color}18` }]}>
              <Text style={styles.modalIcon}>{category.emoji}</Text>
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {getCategoryLabel(category.key, t)}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              {t.setBudgetLimit}
            </Text>

            {/* Input */}
            <View style={[styles.modalInputWrapper, { backgroundColor: theme.backgroundElement, borderColor: category.color }]}>
              <Text style={[styles.modalInputPrefix, { color: category.color }]}>{getCurrencySymbol().trim()}</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text }]}
                value={input}
                onChangeText={setInput}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                selectTextOnFocus
              />
            </View>

            {/* Quick amount buttons */}
            <View style={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickBtn, { backgroundColor: theme.backgroundElement }]}
                  onPress={() => setInput(amt.toString())}
                >
                  <Text style={[styles.quickBtnText, { color: theme.textSecondary }]}>
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: category.color }]}
              onPress={handleSave}
            >
              <Text style={styles.modalSaveBtnText}>{t.save}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Category Modal ───────────────────────────────────────────────────────

function AddCategoryModal({
  visible,
  onSave,
  onClose,
}: {
  visible: boolean;
  onSave: (name: string, budget: number, emoji: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('3000');
  const [selectedEmoji, setSelectedEmoji] = useState('🏷️');

  const emojis = ['🏷️', '🚗', '🏥', '🎓', '🧾', '🎮', '✈️', '🎁', '🐶', '💻'];

  const handleSave = () => {
    if (!name.trim()) return;
    const bVal = parseFloat(budget);
    if (isNaN(bVal) || bVal <= 0) return;
    onSave(name.trim(), bVal, selectedEmoji);
    setName('');
    setBudget('3000');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={Keyboard.dismiss}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.backgroundSelected }]} />
            <Text style={[styles.modalTitle, { color: theme.text, marginTop: 10 }]}>
              {t.addCatModalTitle}
            </Text>

            {/* Emoji picker row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {emojis.map((em) => (
                  <TouchableOpacity
                    key={em}
                    onPress={() => setSelectedEmoji(em)}
                    style={{
                      padding: 8,
                      borderRadius: 12,
                      backgroundColor: selectedEmoji === em ? '#3B82F6' : theme.backgroundElement,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary, alignSelf: 'flex-start', marginBottom: 4 }]}>
              {t.catNameLabel}
            </Text>
            <TextInput
              style={[styles.modalInputWrapper, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: '#3B82F6', marginBottom: 12, paddingHorizontal: 14, height: 46 }]}
              placeholder={t.catNamePlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary, alignSelf: 'flex-start', marginBottom: 4 }]}>
              {t.catBudgetLabel}
            </Text>
            <TextInput
              style={[styles.modalInputWrapper, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: '#3B82F6', marginBottom: 16, paddingHorizontal: 14, height: 46 }]}
              placeholder="3000"
              placeholderTextColor={theme.textSecondary}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: '#3B82F6' }]}
              onPress={handleSave}
            >
              <Text style={styles.modalSaveBtnText}>{t.saveCatBtn}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Category Budget Card ─────────────────────────────────────────────────────

function BudgetCard({
  category,
  budget,
  spent,
  onEdit,
  onDelete,
  isCustom,
}: {
  category: CategoryItem;
  budget: number;
  spent: number;
  onEdit: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = budget - spent;
  const isOver = spent > budget;
  const isNear = !isOver && pct >= 80;

  const statusColor = isOver ? '#EF4444' : isNear ? '#F59E0B' : category.color;

  return (
    <TouchableOpacity onPress={onEdit} activeOpacity={0.85}>
      <View
        style={[
          styles.budgetCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isOver
              ? 'rgba(239,68,68,0.25)'
              : isNear
              ? 'rgba(245,158,11,0.20)'
              : 'rgba(150,150,150,0.07)',
          },
        ]}
      >
        {/* Left icon + info */}
        <View style={styles.budgetCardLeft}>
          <View style={[styles.budgetIcon, { backgroundColor: `${category.color}18` }]}>
            <Text style={styles.budgetEmoji}>{category.emoji}</Text>
          </View>

          <View style={styles.budgetInfo}>
            <View style={styles.budgetTopRow}>
              <Text style={[styles.budgetLabel, { color: theme.text }]}>
                {getCategoryLabel(category.key, t)}
              </Text>
              {isOver && (
                <View style={styles.overBadge}>
                  <Text style={styles.overBadgeText}>{t.overBadge}</Text>
                </View>
              )}
              {isNear && !isOver && (
                <View style={styles.nearBadge}>
                  <Text style={styles.nearBadgeText}>{t.nearLimitBadge}</Text>
                </View>
              )}
            </View>

            {/* Progress bar */}
            <View style={[styles.barBg, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%` as any,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>

            {/* Amounts row */}
            <View style={styles.budgetAmounts}>
              <Text style={[styles.spentText, { color: statusColor }]}>
                <Text style={styles.tkSmall}>{getCurrencySymbol()}</Text>
                {formatNumber(spent)} {t.spentWord}
              </Text>
              <Text style={[styles.remainText, { color: theme.textSecondary }]}>
                {isOver
                  ? `${getCurrencySymbol()}${formatNumber(Math.abs(remaining))} ${t.overWord}`
                  : `${getCurrencySymbol()}${formatNumber(remaining)} ${t.leftWord}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: budget total + edit cue */}
        <View style={styles.budgetRight}>
          <Text style={[styles.budgetTotal, { color: theme.text }]}>
            {getCurrencySymbol()}{formatNumber(budget)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <Text style={[styles.budgetEditHint, { color: theme.textSecondary }]}>
              {t.tapToEditCue}
            </Text>
            {isCustom && onDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onDelete();
                }}
                style={{ padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 14 }}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const { transactions } = useTransactions();

  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState<BudgetMap>(DEFAULT_BUDGETS);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addCatModalVisible, setAddCatModalVisible] = useState(false);

  // Load budgets and categories from AsyncStorage on mount
  React.useEffect(() => {
    const loadSavedData = async () => {
      try {
        const storedBudgets = await AsyncStorage.getItem('hisabkitab_budgets');
        const storedCategories = await AsyncStorage.getItem('hisabkitab_categories');
        const storedCustomCatsHome = await AsyncStorage.getItem('hisabkitab_custom_categories_home');

        let loadedBudgets: BudgetMap = storedBudgets ? JSON.parse(storedBudgets) : { ...DEFAULT_BUDGETS };
        let loadedCategories: CategoryItem[] = [];

        if (storedCategories) {
          const parsed = JSON.parse(storedCategories);
          if (Array.isArray(parsed)) {
            loadedCategories = parsed.map((c: any) => ({
              key: c.key || c.label || 'Unknown',
              label: c.label || c.key || 'Unknown',
              emoji: c.emoji || '🏷️',
              color: c.color || '#64748B',
              defaultBudget: typeof c.defaultBudget === 'number' ? c.defaultBudget : 1000,
            }));
          }
        } else {
          loadedCategories = [...DEFAULT_CATEGORIES];
        }

        // Auto-sync custom categories from Home screen
        let parsedCustomCatsHome: string[] = [];
        if (storedCustomCatsHome) {
          try {
            parsedCustomCatsHome = JSON.parse(storedCustomCatsHome);
          } catch {}
        }

        let needsSaving = false;
        if (Array.isArray(parsedCustomCatsHome)) {
          parsedCustomCatsHome.forEach((catName) => {
            if (catName && !loadedCategories.some((c) => c.key === catName)) {
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              loadedCategories.push({
                key: catName,
                label: catName,
                emoji: '🏷️',
                color: randomColor,
                defaultBudget: 1000,
              });
              if (loadedBudgets[catName] === undefined) {
                loadedBudgets[catName] = 1000;
              }
              needsSaving = true;
            }
          });
        }

        setBudgets(loadedBudgets);
        setCategoriesList(loadedCategories);

        if (needsSaving) {
          await AsyncStorage.setItem('hisabkitab_categories', JSON.stringify(loadedCategories));
          await AsyncStorage.setItem('hisabkitab_budgets', JSON.stringify(loadedBudgets));
        }
      } catch (error) {
        console.warn('Error loading budgets/categories from AsyncStorage:', error);
      }
    };
    loadSavedData();
  }, []);

  // Calculate actual spending per category — CURRENT MONTH ONLY
  const spentByCategory = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const map: Partial<Record<string, number>> = {};
    transactions
      .filter((tx) => {
        if (tx.type !== 'expense') return false;
        if (!tx.date) return false;
        // Parse as local date to avoid UTC timezone mismatch
        const parts = tx.date.split('-');
        if (parts.length !== 3) return false;
        const txYear = Number(parts[0]);
        const txMonth = Number(parts[1]) - 1;
        return txYear === currentYear && txMonth === currentMonth;
      })
      .forEach((tx) => {
        map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
      });
    return map;
  }, [transactions]);

  // Summary stats
  const summary = useMemo(() => {
    const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
    const totalSpent = categoriesList.reduce(
      (acc, c) => acc + (spentByCategory[c.key] ?? 0),
      0
    );
    const overBudgetCount = categoriesList.filter(
      (c) => (spentByCategory[c.key] ?? 0) > (budgets[c.key] ?? 0)
    ).length;
    const totalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
    return { totalBudget, totalSpent, overBudgetCount, totalPct };
  }, [budgets, spentByCategory, categoriesList]);

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

  const handleEdit = (cat: CategoryItem) => {
    setEditingCat(cat);
    setModalVisible(true);
  };

  const handleSaveBudget = (val: number) => {
    if (editingCat) {
      setBudgets((prev) => {
        const updated = { ...prev, [editingCat.key]: val };
        AsyncStorage.setItem('hisabkitab_budgets', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }
  };

  const handleAddCategory = (name: string, budgetVal: number, emoji: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newCatItem: CategoryItem = {
      key: name,
      label: name,
      emoji: emoji || '🏷️',
      color: randomColor,
      defaultBudget: budgetVal,
    };

    setCategoriesList((prev) => {
      if (prev.some((c) => c.key === name)) return prev;
      const updated = [...prev, newCatItem];
      AsyncStorage.setItem('hisabkitab_categories', JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    setBudgets((prev) => {
      const updated = { ...prev, [name]: budgetVal };
      AsyncStorage.setItem('hisabkitab_budgets', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const handleDeleteCategory = (catKey: string) => {
    Alert.alert(
      language === 'bn' ? 'ক্যাটাগরি মুছুন' : 'Delete Category',
      language === 'bn'
        ? `"${catKey}" ক্যাটাগরিটি মুছে ফেলবেন?`
        : `Delete "${catKey}" category?`,
      [
        { text: t.cancelBtn, style: 'cancel' },
        {
          text: t.deleteBtn,
          style: 'destructive',
          onPress: () => {
            setCategoriesList((prev) => {
              const updated = prev.filter((c) => c.key !== catKey);
              AsyncStorage.setItem('hisabkitab_categories', JSON.stringify(updated)).catch(() => {});
              return updated;
            });
            setBudgets((prev) => {
              const updated = { ...prev };
              delete updated[catKey];
              AsyncStorage.setItem('hisabkitab_budgets', JSON.stringify(updated)).catch(() => {});
              return updated;
            });
          },
        },
      ]
    );
  };


  const summaryStatusColor =
    summary.overBudgetCount > 0
      ? '#EF4444'
      : summary.totalPct >= 80
      ? '#F59E0B'
      : '#10B981';

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>
              {t.monthlyBudgetEyebrow}
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{t.budgetPlannerTitle}</Text>
          </View>

          {/* Add Category Icon Button */}
          <TouchableOpacity
            style={styles.addCategoryIconBtn}
            onPress={() => setAddCatModalVisible(true)}
            activeOpacity={0.75}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Summary Hero Card ── */}
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          {/* Accent bar */}
          <View style={styles.accentBar}>
            <View style={[styles.accentSeg, { flex: Math.round(summary.totalPct), backgroundColor: summaryStatusColor }]} />
            <View style={[styles.accentSeg, { flex: Math.round(100 - summary.totalPct), backgroundColor: 'rgba(150,150,150,0.12)' }]} />
          </View>

          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={[styles.heroEyebrow, { color: theme.textSecondary }]}>
                  {t.totalMonthlyBudget}
                </Text>
                <View style={styles.heroAmountRow}>
                  <Text style={[styles.heroTK, { color: theme.text }]}>{getCurrencySymbol()}</Text>
                  <Text style={[styles.heroAmount, { color: theme.text }]}>
                    {formatNumber(summary.totalBudget)}
                  </Text>
                </View>
              </View>
              <View style={styles.heroDonutOuter}>
                <View
                  style={[
                    styles.heroDonutRing,
                    { borderColor: `${summaryStatusColor}25` },
                  ]}
                />
                <View
                  style={[
                    styles.heroDonutFill,
                    {
                      borderTopColor: summaryStatusColor,
                      borderRightColor: summary.totalPct > 25 ? summaryStatusColor : 'transparent',
                      borderBottomColor: summary.totalPct > 50 ? summaryStatusColor : 'transparent',
                      borderLeftColor: summary.totalPct > 75 ? summaryStatusColor : 'transparent',
                      transform: [{ rotate: `${(summary.totalPct / 100) * 360 - 45}deg` }],
                    },
                  ]}
                />
                <View style={styles.heroDonutHole}>
                  <Text style={[styles.heroDonutPct, { color: summaryStatusColor }]}>
                    {Math.round(summary.totalPct)}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: theme.backgroundSelected }]} />

            {/* Stat row */}
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={[styles.heroStatVal, { color: '#EF4444' }]}>
                  {getCurrencySymbol()}{formatNumber(summary.totalSpent)}
                </Text>
                <Text style={[styles.heroStatLbl, { color: theme.textSecondary }]}>{t.spentLabel}</Text>
              </View>

              <View style={[styles.heroStatSep, { backgroundColor: theme.backgroundSelected }]} />

              <View style={styles.heroStatItem}>
                <Text
                  style={[
                    styles.heroStatVal,
                    { color: summary.totalBudget >= summary.totalSpent ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {getCurrencySymbol()}{formatNumber(Math.abs(summary.totalBudget - summary.totalSpent))}
                </Text>
                <Text style={[styles.heroStatLbl, { color: theme.textSecondary }]}>
                  {summary.totalBudget >= summary.totalSpent ? t.leftLabel : t.overBudgetLabel}
                </Text>
              </View>
            </View>
          </View>
        </ThemedView>

        {/* ── Alert banner if over budget ── */}
        {summary.overBudgetCount > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerIcon}>🔔</Text>
            <Text style={styles.alertBannerText}>
              {summary.overBudgetCount}{t.overBudgetAlert}
            </Text>
          </View>
        )}

        {/* ── Section heading ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t.catBudgetTitle}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            {t.tapToEditSubtitle}
          </Text>
        </View>

        {/* ── Budget Cards ── */}
        <View style={styles.cardsContainer}>
          {categoriesList.map((cat) => {
            const isCustom = !DEFAULT_CATEGORIES.some((d) => d.key === cat.key);
            return (
              <BudgetCard
                key={cat.key}
                category={cat}
                budget={budgets[cat.key] ?? 0}
                spent={spentByCategory[cat.key] ?? 0}
                onEdit={() => handleEdit(cat)}
                isCustom={isCustom}
                onDelete={isCustom ? () => handleDeleteCategory(cat.key) : undefined}
              />
            );
          })}
        </View>

        {/* ── Footer tip ── */}
        <ThemedView type="backgroundElement" style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: theme.text }]}>{t.budgetTipsTitle}</Text>
            <Text style={[styles.tipDesc, { color: theme.textSecondary }]}>
              {t.budgetTipsDesc}
            </Text>
          </View>
        </ThemedView>

      </View>

      {/* ── Edit Modal ── */}
      <BudgetEditModal
        visible={modalVisible}
        category={editingCat}
        currentBudget={editingCat ? (budgets[editingCat.key] ?? 0) : 0}
        onSave={handleSaveBudget}
        onClose={() => setModalVisible(false)}
      />

      {/* ── Add New Category Modal ── */}
      <AddCategoryModal
        visible={addCatModalVisible}
        onSave={handleAddCategory}
        onClose={() => setAddCatModalVisible(false)}
      />
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
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeIcon: { fontSize: 22 },
  addCategoryIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  addCategoryIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  // Hero card
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.10)',
  },
  accentBar: {
    flexDirection: 'row',
    height: 5,
  },
  accentSeg: { height: '100%' },
  heroInner: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  heroTK: {
    fontSize: 17,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 5,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
  },

  // Mini donut in hero
  heroDonutOuter: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroDonutRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
  },
  heroDonutFill: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
  },
  heroDonutHole: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDonutPct: {
    fontSize: 13,
    fontWeight: '800',
  },

  heroDivider: {
    height: 1,
    marginVertical: Spacing.two + 2,
    borderRadius: 1,
  },
  heroStats: {
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
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroStatLbl: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  alertBannerIcon: { fontSize: 20 },
  alertBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 18,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Cards
  cardsContainer: {
    gap: Spacing.two,
  },
  budgetCard: {
    borderRadius: 20,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 4,
  },
  budgetIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetEmoji: { fontSize: 24 },
  budgetInfo: { flex: 1 },
  budgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  overBadge: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  overBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  nearBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  nearBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tkSmall: {
    fontSize: 9,
    fontWeight: '600',
  },
  remainText: {
    fontSize: 11,
    fontWeight: '600',
  },
  budgetRight: {
    alignItems: 'flex-end',
    paddingLeft: Spacing.two,
  },
  budgetTotal: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  budgetEditHint: {
    fontSize: 9,
    fontWeight: '600',
  },

  // Tip card
  tipCard: {
    borderRadius: 20,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.07)',
    marginBottom: Spacing.two,
  },
  tipIcon: { fontSize: 22, marginTop: 2 },
  tipTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  tipDesc: { fontSize: 12, lineHeight: 18, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.three,
  },
  modalIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  modalIcon: { fontSize: 30 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: Spacing.four,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
    gap: 8,
  },
  modalInputPrefix: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    marginBottom: Spacing.four,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

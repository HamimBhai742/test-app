import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { useGoals, GoalItem, SavingsLog } from '@/context/GoalContext';
import { CustomDatePicker } from '@/components/custom-date-picker';
import { Feather } from '@expo/vector-icons';
import { getLocalDateString } from '@/utils/date';

const formatNum = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ─── Add Goal Modal ────────────────────────────────────────────────────────
function AddGoalModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, targetAmount: number, desc?: string) => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    if (!name.trim() || !target.trim()) return;
    const numTarget = parseFloat(target);
    if (isNaN(numTarget) || numTarget <= 0) return;

    onSave(name.trim(), numTarget, desc.trim() || undefined);
    setName('');
    setTarget('');
    setDesc('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <ThemedText style={styles.modalTitle}>{t.addGoalBtn}</ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.goalNameLabel}</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.goalNamePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.targetAmountLabel}</ThemedText>
              <TextInput
                value={target}
                onChangeText={setTarget}
                placeholder="e.g. 20000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.goalDescriptionLabel}</ThemedText>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="e.g. Buying a new Android phone"
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>{t.saveBtn}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Goal Modal ────────────────────────────────────────────────────────
function EditGoalModal({
  visible,
  onClose,
  goal,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  goal: GoalItem | null;
  onSave: (name: string, targetAmount: number, desc?: string) => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTarget(goal.targetAmount.toString());
      setDesc(goal.description || '');
    }
  }, [goal, visible]);

  const handleSave = () => {
    if (!name.trim() || !target.trim()) return;
    const numTarget = parseFloat(target);
    if (isNaN(numTarget) || numTarget <= 0) return;

    onSave(name.trim(), numTarget, desc.trim() || undefined);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <ThemedText style={styles.modalTitle}>
              {language === 'bn' ? 'লক্ষ্য পরিবর্তন করুন' : 'Edit Goal'}
            </ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.goalNameLabel}</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.goalNamePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.targetAmountLabel}</ThemedText>
              <TextInput
                value={target}
                onChangeText={setTarget}
                placeholder="e.g. 20000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.goalDescriptionLabel}</ThemedText>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="e.g. Buying a new Android phone"
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>{t.saveBtn}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Savings Modal ──────────────────────────────────────────────────────
function AddSavingsModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, amount: number, date: string) => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const getTodayDate = () => getLocalDateString();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDate());

  const handleSave = () => {
    if (!title.trim() || !amount.trim()) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    onSave(title.trim(), numAmount, date.trim());
    setTitle('');
    setAmount('');
    setDate(getTodayDate());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <ThemedText style={styles.modalTitle}>{t.addSavingsBtn}</ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.savingsTitleLabel}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t.savingsTitlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.savingsAmountLabel}</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 5000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <CustomDatePicker
                label={t.savingsDateLabel}
                value={date}
                onChange={setDate}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>{t.saveBtn}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Savings Modal ─────────────────────────────────────────────────────
function EditSavingsModal({
  visible,
  onClose,
  log,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  log: SavingsLog | null;
  onSave: (title: string, amount: number, date: string) => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (log) {
      setTitle(log.note || '');
      setAmount(log.amount.toString());
      setDate(log.date);
    }
  }, [log, visible]);

  const handleSave = () => {
    if (!title.trim() || !amount.trim()) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    onSave(title.trim(), numAmount, date.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <ThemedText style={styles.modalTitle}>
              {language === 'bn' ? 'সঞ্চয়ের বিবরণ পরিবর্তন করুন' : 'Edit Savings Log'}
            </ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.savingsTitleLabel}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t.savingsTitlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.savingsAmountLabel}</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 5000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <CustomDatePicker
                label={t.savingsDateLabel}
                value={date}
                onChange={setDate}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>{t.saveBtn}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Goal Screen Component ──────────────────────────────────────────────
export default function GoalScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const t = translations[language];

  const {
    goals,
    addGoal,
    deleteGoal,
    updateGoal,
    addSavings,
    deleteSavings,
    updateSavings,
  } = useGoals();

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [addGoalVisible, setAddGoalVisible] = useState(false);
  const [editGoalVisible, setEditGoalVisible] = useState(false);
  const [addSavingsVisible, setAddSavingsVisible] = useState(false);
  const [editSavingsVisible, setEditSavingsVisible] = useState(false);
  const [selectedSavingsLog, setSelectedSavingsLog] = useState<SavingsLog | null>(null);

  // Find currently selected goal
  const selectedGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedGoalId) || null;
  }, [goals, selectedGoalId]);

  // Total savings across all goals
  const totalAllSaved = useMemo(() => {
    return goals.reduce((sum, goal) => {
      const goalSum = goal.history.reduce((s, log) => s + log.amount, 0);
      return sum + goalSum;
    }, 0);
  }, [goals]);

  // Goal-specific sum calculator
  const getGoalSavedAmount = (goal: GoalItem) => {
    return goal.history.reduce((sum, log) => sum + log.amount, 0);
  };

  const handleCreateGoal = (name: string, targetAmount: number, desc?: string) => {
    addGoal(name, targetAmount, desc);
  };

  const handleUpdateGoal = (name: string, targetAmount: number, desc?: string) => {
    if (selectedGoalId) {
      updateGoal(selectedGoalId, name, targetAmount, desc);
    }
  };

  const handleUpdateSavings = (note: string, amount: number, date: string) => {
    if (selectedGoalId && selectedSavingsLog) {
      updateSavings(selectedGoalId, selectedSavingsLog.id, amount, note, date);
    }
  };

  const handleDeleteGoal = (id: string) => {
    Alert.alert(
      language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Delete',
      t.deleteGoalConfirm,
      [
        { text: t.cancelBtn, style: 'cancel' },
        {
          text: t.deleteBtn,
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(id);
            setSelectedGoalId(null);
          },
        },
      ]
    );
  };

  const handleCreateSavings = (title: string, amount: number, date: string) => {
    if (selectedGoalId) {
      addSavings(selectedGoalId, amount, title, date);
    }
  };

  const handleDeleteSavings = (savingsId: string) => {
    if (selectedGoalId) {
      Alert.alert(
        language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Delete',
        t.deleteSavingsConfirm,
        [
          { text: t.cancelBtn, style: 'cancel' },
          {
            text: t.deleteBtn,
            style: 'destructive',
            onPress: () => deleteSavings(selectedGoalId, savingsId),
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      {/* ─── Responsive Screen Header ─── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerInnerContainer}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (selectedGoal) {
                setSelectedGoalId(null);
              } else {
                onBack();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtnIcon, { color: theme.text }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {selectedGoal ? selectedGoal.name : t.goalHeader}
          </Text>

          {selectedGoal ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.deleteHeaderBtn}
                onPress={() => setEditGoalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteHeaderBtn}
                onPress={() => handleDeleteGoal(selectedGoal.id)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addHeaderBtn}
              onPress={() => setAddGoalVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!selectedGoal ? (
        // ─── Responsive List View Screen ───
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: BottomTabInset + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Dashboard Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.summaryLabel}>
                🎯 {t.totalSaved}
              </ThemedText>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                TK {formatNum(totalAllSaved)}
              </Text>
              <ThemedText type="code" themeColor="textSecondary" style={styles.summarySubtext}>
                {language === 'bn'
                  ? `মোট লক্ষ্য ট্র্যাক করা হয়েছে: ${goals.length} টি`
                  : `Total savings goals: ${goals.length}`}
              </ThemedText>
            </View>

            {/* Goals List */}
            <View style={styles.listContainer}>
              {goals.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyEmoji}>🎯</Text>
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    {t.noGoals}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.addBtnEmpty, { borderColor: '#10B981' }]}
                    onPress={() => setAddGoalVisible(true)}
                  >
                    <Text style={[styles.addBtnEmptyText, { color: '#10B981' }]}>+ {t.addGoalBtnShort}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.map((goal) => {
                  const saved = getGoalSavedAmount(goal);
                  const progressPercent = Math.min(100, Math.round((saved / goal.targetAmount) * 100));

                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={[styles.goalCard, { backgroundColor: theme.backgroundElement }]}
                      onPress={() => setSelectedGoalId(goal.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.goalCardHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <ThemedText type="subtitle" style={styles.goalName} numberOfLines={1}>
                              🏆 {goal.name}
                            </ThemedText>
                            {goal.isCompleted ? (
                              <View style={styles.completedBadge}>
                                <Text style={styles.completedBadgeText}>
                                  {language === 'bn' ? 'সম্পন্ন' : 'Completed'}
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.pointsBadge}>
                                <Text style={styles.pointsBadgeText}>
                                  + {goal.pointsAwarded} pts
                                </Text>
                              </View>
                            )}
                          </View>

                          {goal.description && (
                            <ThemedText themeColor="textSecondary" style={styles.goalDesc} numberOfLines={2}>
                              {goal.description}
                            </ThemedText>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.goalSavedText, { color: goal.isCompleted ? '#10B981' : theme.text }]}>
                            TK {formatNum(saved)}
                          </Text>
                          <ThemedText themeColor="textSecondary" style={styles.goalTargetText}>
                            / {formatNum(goal.targetAmount)}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${progressPercent}%`,
                                backgroundColor: goal.isCompleted ? '#10B981' : '#208AEF',
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.progressLabelRow}>
                          <ThemedText type="code" themeColor="textSecondary">
                            {t.progress}
                          </ThemedText>
                          <Text
                            style={[
                              styles.progressPercentText,
                              { color: goal.isCompleted ? '#10B981' : '#208AEF' },
                            ]}
                          >
                            {progressPercent}%
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {goals.length > 0 && (
              <TouchableOpacity style={[styles.addFAB, { backgroundColor: '#10B981' }]} onPress={() => setAddGoalVisible(true)}>
                <Text style={styles.addFABText}>+ {t.addGoalBtnShort}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        // ─── Responsive Detailed Goal View Screen ───
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: BottomTabInset + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Detail Overview Card */}
            <View style={[styles.detailOverviewCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.detailOverviewHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t.savedSoFar}
                  </ThemedText>
                  <Text style={[styles.detailSavedValue, { color: selectedGoal.isCompleted ? '#10B981' : theme.text }]} numberOfLines={1}>
                    TK {formatNum(getGoalSavedAmount(selectedGoal))}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t.targetAmount}
                  </ThemedText>
                  <Text style={[styles.detailBudgetValue, { color: theme.textSecondary }]} numberOfLines={1}>
                    TK {formatNum(selectedGoal.targetAmount)}
                  </Text>
                </View>
              </View>

              {/* Status Header Alert */}
              <View style={[styles.statusCardRow, { backgroundColor: selectedGoal.isCompleted ? 'rgba(16,185,129,0.1)' : theme.backgroundSelected }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: selectedGoal.isCompleted ? '#10B981' : theme.textSecondary }}>
                  {selectedGoal.isCompleted ? t.goalCompletedStatus : `${language === 'bn' ? 'অসম্পূর্ণ লক্ষ্য' : 'Active Goal'} (🏆 ${selectedGoal.pointsAwarded} Pts)`}
                </Text>
              </View>

              {selectedGoal.description && (
                <ThemedText themeColor="textSecondary" style={styles.detailDescText}>
                  📝 {selectedGoal.description}
                </ThemedText>
              )}

              {/* Detailed Progress Bar */}
              <View style={[styles.progressContainer, { marginTop: 6 }]}>
                {(() => {
                  const saved = getGoalSavedAmount(selectedGoal);
                  const target = selectedGoal.targetAmount;
                  const progressPercent = Math.min(100, Math.round((saved / target) * 100));
                  return (
                    <>
                      <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected, height: 8 }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: selectedGoal.isCompleted ? '#10B981' : '#208AEF',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressLabelRow}>
                        <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>
                          {selectedGoal.isCompleted ? (
                            language === 'bn' ? 'লক্ষ্য সম্পন্ন হয়েছে!' : 'Goal achieved!'
                          ) : (
                            language === 'bn'
                              ? `আরও সঞ্চয় প্রয়োজন: TK ${formatNum(Math.max(0, target - saved))}`
                              : `Needed to save: TK ${formatNum(Math.max(0, target - saved))}`
                          )}
                        </ThemedText>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: selectedGoal.isCompleted ? '#10B981' : '#208AEF' }}>
                          {progressPercent}%
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Responsive Primary Full-Width Action Button */}
              <TouchableOpacity
                style={[styles.fullWidthActionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => setAddSavingsVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.fullWidthActionBtnText}>+ {t.addSavingsBtnShort}</Text>
              </TouchableOpacity>
            </View>

            {/* Savings logs list */}
            <View style={styles.logsListWrapper}>
              <ThemedText type="subtitle" style={styles.logsTitle}>
                📄 {language === 'bn' ? 'সঞ্চয়ের বিবরণ তালিকা' : 'Savings History'}
              </ThemedText>

              {selectedGoal.history.length === 0 ? (
                <View style={[styles.emptyLogsCard, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                    {language === 'bn' ? 'এখনো কোনো সঞ্চয় যোগ করা হয়নি।' : 'No savings logged yet.'}
                  </ThemedText>
                </View>
              ) : (
                selectedGoal.history.map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.logItemRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.backgroundSelected }]}
                    onPress={() => {
                      setSelectedSavingsLog(log);
                      setEditSavingsVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <ThemedText type="smallBold" style={styles.logItemTitle} numberOfLines={2}>
                        {log.note || (language === 'bn' ? 'সঞ্চয় যুক্ত করা হয়েছে' : 'Added savings')}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.logItemDate}>
                        📅 {log.date}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                      <Text style={[styles.logItemAmount, { color: '#10B981' }]}>
                        + TK {formatNum(log.amount)}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteSavings(log.id)} style={styles.logDeleteBtn}>
                        <Text style={styles.logDeleteBtnIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Add Goal Modal */}
      <AddGoalModal
        visible={addGoalVisible}
        onClose={() => setAddGoalVisible(false)}
        onSave={handleCreateGoal}
      />

      {/* Add Savings Modal */}
      <AddSavingsModal
        visible={addSavingsVisible}
        onClose={() => setAddSavingsVisible(false)}
        onSave={handleCreateSavings}
      />

      {/* Edit Goal Modal */}
      <EditGoalModal
        visible={editGoalVisible}
        onClose={() => setEditGoalVisible(false)}
        goal={selectedGoal}
        onSave={handleUpdateGoal}
      />

      {/* Edit Savings Modal */}
      <EditSavingsModal
        visible={editSavingsVisible}
        onClose={() => setEditSavingsVisible(false)}
        log={selectedSavingsLog}
        onSave={handleUpdateSavings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  headerInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtnIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  summarySubtext: {
    fontSize: 12,
  },
  listContainer: {
    gap: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  addBtnEmpty: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  addBtnEmptyText: {
    fontWeight: '700',
    fontSize: 14,
  },
  goalCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.05)',
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
  },
  pointsBadge: {
    backgroundColor: 'rgba(32,138,239,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsBadgeText: {
    color: '#208AEF',
    fontSize: 10,
    fontWeight: '900',
  },
  goalDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  goalSavedText: {
    fontSize: 16,
    fontWeight: '800',
  },
  goalTargetText: {
    fontSize: 12,
  },
  progressContainer: {
    gap: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addFAB: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  addFABText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailOverviewCard: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  detailOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailSavedValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  detailBudgetValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  detailDescText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusCardRow: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  fullWidthActionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  fullWidthActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logsListWrapper: {
    marginTop: Spacing.two,
    gap: 12,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyLogsCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logItemRow: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.05)',
  },
  logItemTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  logItemDate: {
    fontSize: 11,
  },
  logItemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  logDeleteBtn: {
    padding: 6,
  },
  logDeleteBtnIcon: {
    fontSize: 16,
  },
  // Modal layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalFormContainer: {
    gap: 10,
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  inputBox: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    width: '100%',
  },
  submitBtn: {
    backgroundColor: '#208AEF',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

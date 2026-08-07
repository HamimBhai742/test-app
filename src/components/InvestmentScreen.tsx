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
import { useInvestments, InvestmentProject, InvestmentLog } from '@/context/InvestmentContext';
import { CustomDatePicker } from '@/components/custom-date-picker';
import { Feather } from '@expo/vector-icons';

const formatNum = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ─── Add Investment Modal ──────────────────────────────────────────────────
function AddInvestmentModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, budget?: number, desc?: string) => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    const numBudget = budget.trim() ? parseFloat(budget) : undefined;
    onSave(name.trim(), numBudget, desc.trim() || undefined);
    setName('');
    setBudget('');
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
            <ThemedText style={styles.modalTitle}>{t.addInvestmentBtn}</ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.investmentNameLabel}</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.investmentNamePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.targetBudgetLabel}</ThemedText>
              <TextInput
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. 500000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.descriptionLabel}</ThemedText>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="e.g. 4 Years B.Sc program fees"
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

// ─── Edit Investment Modal ──────────────────────────────────────────────────
function EditInvestmentModal({
  visible,
  onClose,
  project,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  project: InvestmentProject | null;
  onSave: (name: string, targetBudget?: number, desc?: string) => void;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setBudget(project.targetBudget ? project.targetBudget.toString() : '');
      setDesc(project.description || '');
    }
  }, [project, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    const numBudget = budget.trim() ? parseFloat(budget) : undefined;
    onSave(name.trim(), numBudget, desc.trim() || undefined);
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
              {language === 'bn' ? 'ইনভেস্টমেন্ট প্রজেক্ট পরিবর্তন করুন' : 'Edit Investment Project'}
            </ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.investmentNameLabel}</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.investmentNamePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.targetBudgetLabel}</ThemedText>
              <TextInput
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. 500000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.descriptionLabel}</ThemedText>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="e.g. 4 Years B.Sc program fees"
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

// ─── Add Log Modal ──────────────────────────────────────────────────────────
function AddLogModal({
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

  const getTodayDate = () => new Date().toISOString().split('T')[0];

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
            <ThemedText style={styles.modalTitle}>{t.addLogBtn}</ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.logTitleLabel}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t.logTitlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.logAmountLabel}</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 45000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <CustomDatePicker
                label={t.logDateLabel}
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

// ─── Edit Log Modal ─────────────────────────────────────────────────────────
function EditLogModal({
  visible,
  onClose,
  log,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  log: InvestmentLog | null;
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
      setTitle(log.title);
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
              {language === 'bn' ? 'খরচের বিবরণ পরিবর্তন করুন' : 'Edit Expense Log'}
            </ThemedText>

            <View style={styles.modalFormContainer}>
              <ThemedText style={styles.inputLabel}>{t.logTitleLabel}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t.logTitlePlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <ThemedText style={styles.inputLabel}>{t.logAmountLabel}</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 45000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.inputBox, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              />

              <CustomDatePicker
                label={t.logDateLabel}
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

// ─── Main Investment Screen Component ─────────────────────────────────────────
export default function InvestmentScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const t = translations[language];

  const {
    investments,
    addInvestment,
    deleteInvestment,
    updateInvestment,
    addLogToInvestment,
    deleteLogFromInvestment,
    updateLogInInvestment,
  } = useInvestments();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [addProjectVisible, setAddProjectVisible] = useState(false);
  const [editProjectVisible, setEditProjectVisible] = useState(false);
  const [addLogVisible, setAddLogVisible] = useState(false);
  const [editLogVisible, setEditLogVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<InvestmentLog | null>(null);

  // Find currently selected project
  const selectedProject = useMemo(() => {
    return investments.find((p) => p.id === selectedProjectId) || null;
  }, [investments, selectedProjectId]);

  // Total investment across all projects
  const totalAllInvested = useMemo(() => {
    return investments.reduce((sum, project) => {
      const projSum = project.logs.reduce((s, log) => s + log.amount, 0);
      return sum + projSum;
    }, 0);
  }, [investments]);

  // Goal-specific sum calculator
  const getProjectSpent = (project: InvestmentProject) => {
    return project.logs.reduce((sum, log) => sum + log.amount, 0);
  };

  const handleCreateProject = (name: string, targetBudget?: number, desc?: string) => {
    addInvestment(name, targetBudget, desc);
  };

  const handleUpdateProject = (name: string, targetBudget?: number, desc?: string) => {
    if (selectedProjectId) {
      updateInvestment(selectedProjectId, name, targetBudget, desc);
    }
  };

  const handleUpdateLog = (title: string, amount: number, date: string) => {
    if (selectedProjectId && selectedLog) {
      updateLogInInvestment(selectedProjectId, selectedLog.id, title, amount, date);
    }
  };

  const handleDeleteProject = (id: string) => {
    Alert.alert(
      language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Delete',
      t.deleteProjectConfirm,
      [
        { text: t.cancelBtn, style: 'cancel' },
        {
          text: t.deleteBtn,
          style: 'destructive',
          onPress: async () => {
            await deleteInvestment(id);
            setSelectedProjectId(null);
          },
        },
      ]
    );
  };

  const handleCreateLog = (title: string, amount: number, date: string) => {
    if (selectedProjectId) {
      addLogToInvestment(selectedProjectId, title, amount, date);
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (selectedProjectId) {
      Alert.alert(
        language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Delete',
        t.deleteLogConfirm,
        [
          { text: t.cancelBtn, style: 'cancel' },
          {
            text: t.deleteBtn,
            style: 'destructive',
            onPress: () => deleteLogFromInvestment(selectedProjectId, logId),
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
              if (selectedProject) {
                setSelectedProjectId(null);
              } else {
                onBack();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtnIcon, { color: theme.text }]}>←</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {selectedProject ? selectedProject.name : t.investmentHeader}
          </Text>

          {selectedProject ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.deleteHeaderBtn}
                onPress={() => setEditProjectVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteHeaderBtn}
                onPress={() => handleDeleteProject(selectedProject.id)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addHeaderBtn}
              onPress={() => setAddProjectVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!selectedProject ? (
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
                📈 {t.totalInvested}
              </ThemedText>
              <Text style={[styles.summaryValue, { color: '#208AEF' }]}>
                TK {formatNum(totalAllInvested)}
              </Text>
              <ThemedText type="code" themeColor="textSecondary" style={styles.summarySubtext}>
                {language === 'bn'
                  ? `মোট প্রজেক্ট ট্র্যাক করা হয়েছে: ${investments.length} টি`
                  : `Total active trackers: ${investments.length}`}
              </ThemedText>
            </View>

            {/* Project List */}
            <View style={styles.listContainer}>
              {investments.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyEmoji}>📉</Text>
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    {t.noInvestments}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.addBtnEmpty, { borderColor: '#208AEF' }]}
                    onPress={() => setAddProjectVisible(true)}
                  >
                    <Text style={styles.addBtnEmptyText}>+ {t.addInvestmentBtnShort}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                investments.map((project) => {
                  const spent = getProjectSpent(project);
                  const progressPercent = project.targetBudget
                    ? Math.min(100, Math.round((spent / project.targetBudget) * 100))
                    : 0;

                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={[styles.projectCard, { backgroundColor: theme.backgroundElement }]}
                      onPress={() => setSelectedProjectId(project.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.projectCardHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <ThemedText type="subtitle" style={styles.projectName} numberOfLines={2}>
                            💼 {project.name}
                          </ThemedText>
                          {project.description && (
                            <ThemedText themeColor="textSecondary" style={styles.projectDesc} numberOfLines={2}>
                              {project.description}
                            </ThemedText>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.projectSpentText, { color: theme.text }]}>
                            TK {formatNum(spent)}
                          </Text>
                          {project.targetBudget && (
                            <ThemedText themeColor="textSecondary" style={styles.projectTargetText}>
                              / {formatNum(project.targetBudget)}
                            </ThemedText>
                          )}
                        </View>
                      </View>

                      {/* Progress Bar (Only if target budget is defined) */}
                      {project.targetBudget && (
                        <View style={styles.progressContainer}>
                          <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected }]}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${progressPercent}%`,
                                  backgroundColor: progressPercent >= 100 ? '#EF4444' : progressPercent >= 80 ? '#F59E0B' : '#10B981',
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
                                { color: progressPercent >= 100 ? '#EF4444' : '#10B981' },
                              ]}
                            >
                              {progressPercent}%
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {investments.length > 0 && (
              <TouchableOpacity style={styles.addFAB} onPress={() => setAddProjectVisible(true)}>
                <Text style={styles.addFABText}>+ {t.addInvestmentBtnShort}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        // ─── Responsive Detailed Project View Screen ───
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
                    {t.spentSoFar}
                  </ThemedText>
                  <Text style={[styles.detailSpentValue, { color: theme.text }]} numberOfLines={1}>
                    TK {formatNum(getProjectSpent(selectedProject))}
                  </Text>
                </View>

                {selectedProject.targetBudget && (
                  <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {t.targetBudget}
                    </ThemedText>
                    <Text style={[styles.detailBudgetValue, { color: theme.textSecondary }]} numberOfLines={1}>
                      TK {formatNum(selectedProject.targetBudget)}
                    </Text>
                  </View>
                )}
              </View>

              {selectedProject.description && (
                <ThemedText themeColor="textSecondary" style={styles.detailDescText}>
                  📝 {selectedProject.description}
                </ThemedText>
              )}

              {/* Detailed Progress Bar */}
              {selectedProject.targetBudget && (
                <View style={[styles.progressContainer, { marginTop: 6 }]}>
                  {(() => {
                    const spent = getProjectSpent(selectedProject);
                    const budget = selectedProject.targetBudget || 1;
                    const progressPercent = Math.min(100, Math.round((spent / budget) * 100));
                    return (
                      <>
                        <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected, height: 8 }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${progressPercent}%`,
                                backgroundColor: progressPercent >= 100 ? '#EF4444' : progressPercent >= 80 ? '#F59E0B' : '#10B981',
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.progressLabelRow}>
                          <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>
                            {language === 'bn'
                              ? `অবশিষ্ট: TK ${formatNum(Math.max(0, budget - spent))}`
                              : `Remaining: TK ${formatNum(Math.max(0, budget - spent))}`}
                          </ThemedText>
                          <Text style={{ fontWeight: '700', fontSize: 13, color: '#10B981' }}>
                            {progressPercent}%
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}

              {/* Responsive Primary Full-Width Action Button */}
              <TouchableOpacity
                style={[styles.fullWidthActionBtn, { backgroundColor: '#208AEF' }]}
                onPress={() => setAddLogVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.fullWidthActionBtnText}>+ {t.addLogBtnShort}</Text>
              </TouchableOpacity>
            </View>

            {/* Logs List Section */}
            <View style={styles.logsListWrapper}>
              <ThemedText type="subtitle" style={styles.logsTitle}>
                📄 {language === 'bn' ? 'খরচের বিবরণ তালিকা' : 'Itemized Logs'}
              </ThemedText>

              {selectedProject.logs.length === 0 ? (
                <View style={[styles.emptyLogsCard, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                    {language === 'bn' ? 'এখনো কোনো খরচের বিবরণ যোগ করা হয়নি।' : 'No expenses logged yet.'}
                  </ThemedText>
                </View>
              ) : (
                selectedProject.logs.map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.logItemRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.backgroundSelected }]}
                    onPress={() => {
                      setSelectedLog(log);
                      setEditLogVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <ThemedText type="smallBold" style={styles.logItemTitle} numberOfLines={2}>
                        {log.title}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.logItemDate}>
                        📅 {log.date}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                      <Text style={[styles.logItemAmount, { color: '#EF4444' }]}>
                        - TK {formatNum(log.amount)}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(log.id)} style={styles.logDeleteBtn}>
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

      {/* Add Investment Modal */}
      <AddInvestmentModal
        visible={addProjectVisible}
        onClose={() => setAddProjectVisible(false)}
        onSave={handleCreateProject}
      />

      {/* Add Log Modal */}
      <AddLogModal
        visible={addLogVisible}
        onClose={() => setAddLogVisible(false)}
        onSave={handleCreateLog}
      />

      {/* Edit Investment Modal */}
      <EditInvestmentModal
        visible={editProjectVisible}
        onClose={() => setEditProjectVisible(false)}
        project={selectedProject}
        onSave={handleUpdateProject}
      />

      {/* Edit Log Modal */}
      <EditLogModal
        visible={editLogVisible}
        onClose={() => setEditLogVisible(false)}
        log={selectedLog}
        onSave={handleUpdateLog}
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
    color: '#208AEF',
    fontWeight: '700',
    fontSize: 14,
  },
  projectCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.05)',
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  projectDesc: {
    fontSize: 12,
  },
  projectSpentText: {
    fontSize: 16,
    fontWeight: '800',
  },
  projectTargetText: {
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
    backgroundColor: '#208AEF',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
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
  detailSpentValue: {
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
  fullWidthActionBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#208AEF',
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

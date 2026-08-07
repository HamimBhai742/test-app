import React, { useState, useMemo } from 'react';
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
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { useDues, DueItem } from '@/context/DueContext';
import { Feather } from '@expo/vector-icons';

const formatNum = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ─── Add Due Modal ────────────────────────────────────────────────────────────


function AddEditDueModal({
  visible,
  onClose,
  onSave,
  initialDue,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (item: Omit<DueItem, 'id' | 'isSettled' | 'createdAt'>) => void;
  initialDue?: DueItem;
}) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receivable' | 'payable'>('receivable');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  // Prefill fields when editing an existing due record
  React.useEffect(() => {
    if (initialDue) {
      setPersonName(initialDue.personName);
      setPhone(initialDue.phone || '');
      setAmount(initialDue.amount.toString());
      setType(initialDue.type);
      setDueDate(initialDue.dueDate || '');
      setNote(initialDue.note || '');
    } else {
      setPersonName('');
      setPhone('');
      setAmount('');
      setType('receivable');
      setDueDate('');
      setNote('');
    }
  }, [initialDue, visible]);

  const handleSave = () => {
    if (!personName.trim()) return;
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    onSave({
      personName: personName.trim(),
      phone: phone.trim() || undefined,
      amount: numAmt,
      type,
      note: note.trim() || undefined,
      dueDate: dueDate.trim() || undefined,
    });

    if (!initialDue) {
      setPersonName('');
      setPhone('');
      setAmount('');
      setType('receivable');
      setDueDate('');
      setNote('');
    }
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {initialDue
                ? (language === 'bn' ? 'দেনা-পাওনা এডিট করুন' : 'Edit Due/Debt')
                : t.addDueModalTitle}
            </Text>

            {/* Type Selector (Receivable vs Payable) */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'receivable' && { backgroundColor: '#10B981' },
                  type !== 'receivable' && { backgroundColor: theme.backgroundElement },
                ]}
                onPress={() => setType('receivable')}
              >
                <Text style={{ color: type === 'receivable' ? '#FFF' : theme.text, fontWeight: '700', fontSize: 13 }}>
                  {t.dueTypeReceivable}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  type === 'payable' && { backgroundColor: '#EF4444' },
                  type !== 'payable' && { backgroundColor: theme.backgroundElement },
                ]}
                onPress={() => setType('payable')}
              >
                <Text style={{ color: type === 'payable' ? '#FFF' : theme.text, fontWeight: '700', fontSize: 13 }}>
                  {t.dueTypePayable}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Person Name */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.personNameLabel}</Text>
            <TextInput
              style={[styles.inputBox, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: '#3B82F6' }]}
              placeholder={t.personNamePlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={personName}
              onChangeText={setPersonName}
            />

            {/* Phone Number */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.phoneLabel}</Text>
            <TextInput
              style={[styles.inputBox, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: '#3B82F6' }]}
              placeholder={t.phonePlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {/* Amount */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>পরিমাণ (TK)</Text>
            <TextInput
              style={[styles.inputBox, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: type === 'receivable' ? '#10B981' : '#EF4444' }]}
              placeholder="5000"
              placeholderTextColor={theme.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            {/* Note */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.dueNoteLabel}</Text>
            <TextInput
              style={[styles.inputBox, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: '#3B82F6' }]}
              placeholder={t.dueNotePlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={note}
              onChangeText={setNote}
            />

            {/* Due Date */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t.dueDateLabel}</Text>
            <TextInput
              style={[styles.inputBox, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: '#3B82F6' }]}
              placeholder="2026-08-15"
              placeholderTextColor={theme.textSecondary}
              value={dueDate}
              onChangeText={setDueDate}
            />

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: type === 'receivable' ? '#10B981' : '#EF4444' }]}
              onPress={handleSave}
            >
              <Text style={styles.submitBtnText}>{t.saveBtn}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DuesScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];

  const { dues, totalReceivable, totalPayable, netBalance, addDue, settleDue, deleteDue, updateDue } = useDues();

  const [activeTab, setActiveTab] = useState<'all' | 'receivable' | 'payable' | 'settled'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDue, setEditingDue] = useState<DueItem | undefined>(undefined);

  const handleOpenAddModal = () => {
    setEditingDue(undefined);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setEditingDue(undefined);
    setModalVisible(false);
  };

  const handleSaveDue = async (item: Omit<DueItem, 'id' | 'isSettled' | 'createdAt'>) => {
    if (editingDue) {
      await updateDue(editingDue.id, item);
    } else {
      await addDue(item);
    }
  };


  // Filter dues according to active tab
  const filteredDues = useMemo(() => {
    switch (activeTab) {
      case 'receivable':
        return dues.filter((d) => d.type === 'receivable' && !d.isSettled);
      case 'payable':
        return dues.filter((d) => d.type === 'payable' && !d.isSettled);
      case 'settled':
        return dues.filter((d) => d.isSettled);
      default:
        return dues;
    }
  }, [dues, activeTab]);

  // WhatsApp Reminder Handler
  const handleWhatsAppReminder = (item: DueItem) => {
    const rawPhone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = rawPhone.startsWith('88') ? rawPhone : rawPhone.length === 11 ? `88${rawPhone}` : rawPhone;

    let message = '';
    if (item.type === 'receivable') {
      message = `প্রিয় ${item.personName}, হিসাব কিতাব অ্যাপ থেকে জানাচ্ছি, আপনার কাছে ৳${formatNum(item.amount)} বকেয়া রয়েছে। ${item.note ? `(নোট: ${item.note})` : ''} অনুগ্রহ করে পরিশোধ করার জন্য অনুরোধ রইলো। ধন্যবাদ!`;
    } else {
      message = `প্রিয় ${item.personName}, হিসাব কিতাব অ্যাপ থেকে জানাচ্ছি, আপনার ৳${formatNum(item.amount)} দেনা রয়েছে। ${item.note ? `(নোট: ${item.note})` : ''} শীগ্রই পরিশোধ করা হবে। ধন্যবাদ!`;
    }

    const encodedMsg = encodeURIComponent(message);
    const url = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://api.whatsapp.com/send?text=${encodedMsg}`);
        }
      })
      .catch((err) => console.warn('WhatsApp error:', err));
  };

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
              {t.dueEyebrow}
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{t.dueLedgerTitle}</Text>
          </View>

          <TouchableOpacity
            style={styles.addIconBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.75}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Overview Hero Card ── */}
        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <View style={styles.heroRow}>
            {/* Receivable */}
            <View style={styles.heroItem}>
              <Text style={[styles.heroVal, { color: '#10B981' }]}>TK {formatNum(totalReceivable)}</Text>
              <Text style={[styles.heroLbl, { color: theme.textSecondary }]}>{t.totalReceivable}</Text>
            </View>

            <View style={[styles.heroSep, { backgroundColor: theme.backgroundSelected }]} />

            {/* Payable */}
            <View style={styles.heroItem}>
              <Text style={[styles.heroVal, { color: '#EF4444' }]}>TK {formatNum(totalPayable)}</Text>
              <Text style={[styles.heroLbl, { color: theme.textSecondary }]}>{t.totalPayable}</Text>
            </View>
          </View>

          <View style={[styles.heroDivider, { backgroundColor: theme.backgroundSelected }]} />

          {/* Net Balance */}
          <View style={styles.netRow}>
            <Text style={[styles.netLbl, { color: theme.textSecondary }]}>{t.netBalance}:</Text>
            <Text style={[styles.netVal, { color: netBalance >= 0 ? '#10B981' : '#EF4444' }]}>
              {netBalance >= 0 ? `+ TK ${formatNum(netBalance)}` : `- TK ${formatNum(Math.abs(netBalance))}`}
            </Text>
          </View>
        </ThemedView>

        {/* ── Filter Tabs ── */}
        <View style={styles.filterTabsRow}>
          {(['all', 'receivable', 'payable', 'settled'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = {
              all: t.tabAll,
              receivable: t.tabReceivable,
              payable: t.tabPayable,
              settled: t.tabSettled,
            };

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterTab,
                  isActive
                    ? { backgroundColor: '#208AEF' }
                    : { backgroundColor: theme.backgroundElement },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={{ color: isActive ? '#FFF' : theme.text, fontWeight: '700', fontSize: 12 }}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Dues Item List ── */}
        <View style={styles.listContainer}>
          {filteredDues.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement }]}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t.emptyDues}</Text>
            </View>
          ) : (
            filteredDues.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.dueCard}>
                <View style={styles.dueCardHeader}>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: theme.text }]}>{item.personName}</Text>
                    {item.phone ? (
                      <Text style={[styles.personPhone, { color: theme.textSecondary }]}>
                        📞 {item.phone}
                      </Text>
                    ) : null}
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: item.isSettled
                          ? 'rgba(100, 116, 139, 0.15)'
                          : item.type === 'receivable'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: item.isSettled
                            ? '#64748B'
                            : item.type === 'receivable'
                            ? '#10B981'
                            : '#EF4444',
                        },
                      ]}
                    >
                      {item.isSettled
                        ? t.settledBadge
                        : item.type === 'receivable'
                        ? '🟢 পাওনা (পাবো)'
                        : '🔴 দেনা (দেবো)'}
                    </Text>
                  </View>
                </View>

                {/* Amount & Note */}
                <View style={styles.dueCardBody}>
                  <Text
                    style={[
                      styles.dueAmount,
                      {
                        color: item.isSettled
                          ? theme.textSecondary
                          : item.type === 'receivable'
                          ? '#10B981'
                          : '#EF4444',
                        textDecorationLine: item.isSettled ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    TK {formatNum(item.amount)}
                  </Text>

                  {item.note ? (
                    <Text style={[styles.dueNote, { color: theme.textSecondary }]}>
                      📝 {item.note}
                    </Text>
                  ) : null}

                  {item.dueDate ? (
                    <Text style={[styles.dueDateText, { color: theme.textSecondary }]}>
                      📅 তারিখ: {item.dueDate}
                    </Text>
                  ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.dueCardActions}>
                  {!item.isSettled ? (
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => {
                        setEditingDue(item);
                        setModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="edit-2" size={12} color="#FFF" />
                      <Text style={styles.editBtnText}>{language === 'bn' ? 'এডিট' : 'Edit'}</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.settleBtn,
                      { backgroundColor: item.isSettled ? theme.backgroundSelected : '#10B981' },
                    ]}
                    onPress={() => settleDue(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.settleBtnText, { color: item.isSettled ? theme.text : '#FFF' }]}>
                      {item.isSettled ? '🔄 পুনরায় চালু' : t.settleBtn}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteDue(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            ))
          )}
        </View>

      </View>

      {/* Add / Edit Due Modal */}
      <AddEditDueModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveDue}
        initialDue={editingDue}
      />
    </ScrollView>
  );
}

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
  addIconBtn: {
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
  addIconBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  heroItem: {
    alignItems: 'center',
  },
  heroVal: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroLbl: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroSep: {
    width: 1,
    height: 36,
  },
  heroDivider: {
    height: 1,
    marginVertical: 14,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  netLbl: {
    fontSize: 14,
    fontWeight: '700',
  },
  netVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  listContainer: {
    gap: 12,
  },
  emptyBox: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  dueCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  dueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  personInfo: {},
  personName: {
    fontSize: 16,
    fontWeight: '800',
  },
  personPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dueCardBody: {
    gap: 4,
  },
  dueAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  dueNote: {
    fontSize: 13,
    fontWeight: '500',
  },
  dueDateText: {
    fontSize: 12,
  },
  dueCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  waBtn: {
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  waBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  settleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  settleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 'auto',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 10,
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  typeTab: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  submitBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

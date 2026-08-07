import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  generateMonthlyStatementHTML,
  generateCashMemoHTML,
  printOrDownloadPDF,
  PDFTransactionItem,
  PDFStatementSummary,
} from '@/utils/pdf-generator';

interface PDFExportModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: PDFTransactionItem[];
  currentMonthSummary?: PDFStatementSummary;
  userName?: string;
}

export function PDFExportModal({
  visible,
  onClose,
  transactions,
  currentMonthSummary,
  userName,
}: PDFExportModalProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { language } = useLanguage();
  const t = translations[language];

  const [mode, setMode] = useState<'statement' | 'memo'>('statement');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTxId, setSelectedTxId] = useState<string>(
    transactions.length > 0 ? transactions[0].id : ''
  );

  const selectedTx = transactions.find((tx) => tx.id === selectedTxId) || transactions[0];

  const totalInc = transactions.filter((tx) => tx.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExp = transactions.filter((tx) => tx.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netSav = totalInc - totalExp;
  const savRate = totalInc > 0 ? Math.round((netSav / totalInc) * 100) : 0;

  const summaryToUse: PDFStatementSummary = currentMonthSummary || {
    monthName: 'চলতি মাস',
    year: new Date().getFullYear(),
    totalIncome: totalInc,
    totalExpense: totalExp,
    netSavings: netSav,
    savingsRate: savRate,
    userName,
  };

  const handleDownloadPDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const dateStr = new Date().toISOString().split('T')[0];
    try {
      if (mode === 'statement') {
        const html = generateMonthlyStatementHTML(summaryToUse, transactions);
        await printOrDownloadPDF(
          html,
          `Hisab_Kitab_Statement_${summaryToUse.monthName}_${summaryToUse.year}_${dateStr}`
        );
      } else if (mode === 'memo') {
        if (selectedTx) {
          const html = generateCashMemoHTML(selectedTx, userName);
          const cleanTitle = selectedTx.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
          await printOrDownloadPDF(html, `Hisab_Kitab_Memo_${selectedTx.date}_${cleanTitle}`);
        } else {
          alert('ক্যাশ মেমো তৈরির জন্য কমপক্ষে একটি লেনদেন থাকা প্রয়োজন।');
        }
      }
    } catch (e) {
      console.warn('PDF export error:', e);
    } finally {
      setTimeout(() => setIsGenerating(false), 600);
    }
  };

  const handleShareWhatsApp = () => {
    let message = '';
    if (mode === 'statement') {
      message = `📄 *হিসাব কিতাব - ${summaryToUse.monthName} ${summaryToUse.year} মাসিক স্টেটমেন্ট*\n\n🟢 মোট আয়: ৳${summaryToUse.totalIncome.toLocaleString()}\n🔴 মোট ব্যয়: ৳${summaryToUse.totalExpense.toLocaleString()}\n🔵 নিট সঞ্চয়: ৳${summaryToUse.netSavings.toLocaleString()}\n📈 সঞ্চয়ের হার: ${summaryToUse.savingsRate}%\n\nপ্রফেশনাল ফাইন্যান্সিয়াল ট্র্যাকিং এর জন্য ধন্যবাদ!`;
    } else if (mode === 'memo' && selectedTx) {
      message = `🧾 *হিসাব কিতাব - ক্যাশ মেমো রসিদ*\n\nবিবরণ: ${selectedTx.title}\nপরিমাণ: ৳${selectedTx.amount.toLocaleString()}\nক্যাটাগরি: ${selectedTx.category}\nধরন: ${selectedTx.type === 'income' ? 'আয় (Income)' : 'ব্যয় (Expense)'}\nতারিখ: ${selectedTx.date}\n\nস্ট্যাটাস: Verified Paid/Received ✓`;
    }

    const encodedMsg = encodeURIComponent(message);
    const url = `https://wa.me/?text=${encodedMsg}`;
    Linking.openURL(url).catch((err) => console.warn('WhatsApp error:', err));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: theme.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{t.pdfModalTitle}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeTabsRow}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'statement' && styles.modeTabActive,
                { backgroundColor: mode === 'statement' ? '#208AEF' : isDark ? '#232836' : '#E2E8F0' },
              ]}
              onPress={() => setMode('statement')}
            >
              <Text style={{ color: mode === 'statement' ? '#FFF' : theme.text, fontWeight: '700', fontSize: 12 }}>
                {t.pdfMonthlyStatement}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === 'memo' && styles.modeTabActive,
                { backgroundColor: mode === 'memo' ? '#208AEF' : isDark ? '#232836' : '#E2E8F0' },
              ]}
              onPress={() => setMode('memo')}
            >
              <Text style={{ color: mode === 'memo' ? '#FFF' : theme.text, fontWeight: '700', fontSize: 12 }}>
                {t.pdfCashMemo}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode 1: Monthly Statement Preview */}
          {mode === 'statement' ? (
            <View style={[styles.previewCard, { backgroundColor: isDark ? '#1F2430' : '#F8FAFC', borderColor: isDark ? '#2D3548' : '#E2E8F0' }]}>
              <Text style={[styles.previewTitle, { color: theme.text }]}>
                {summaryToUse.monthName} {summaryToUse.year} - রিপোর্ট সামারি
              </Text>

              <View style={styles.summaryStatsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: '#10B981' }]}>
                    ৳ {summaryToUse.totalIncome.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLbl, { color: theme.textSecondary }]}>মোট আয়</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: '#EF4444' }]}>
                    ৳ {summaryToUse.totalExpense.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLbl, { color: theme.textSecondary }]}>মোট ব্যয়</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: '#208AEF' }]}>
                    ৳ {summaryToUse.netSavings.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLbl, { color: theme.textSecondary }]}>নিট সঞ্চয়</Text>
                </View>
              </View>

              <Text style={[styles.txCountNote, { color: theme.textSecondary }]}>
                মোট {transactions.length} টি লেনদেন এই রিপোর্টে যুক্ত করা হবে।
              </Text>
            </View>
          ) : null}

          {/* Mode 2: Single Cash Memo Selector */}
          {mode === 'memo' ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.selectorLabel, { color: theme.textSecondary }]}>
                মেমো রসিদ তৈরির জন্য লেনদেন বাছুন:
              </Text>

              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                {transactions.map((tx) => {
                  const isSelected = tx.id === selectedTxId;
                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={[
                        styles.txSelectItem,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(32, 138, 239, 0.25)'
                              : 'rgba(32, 138, 239, 0.15)'
                            : isDark
                            ? '#1F2430'
                            : theme.backgroundElement,
                          borderColor: isSelected ? '#208AEF' : isDark ? '#2D3548' : '#E2E8F0',
                        },
                      ]}
                      onPress={() => setSelectedTxId(tx.id)}
                    >
                      <View>
                        <Text style={[styles.txSelectTitle, { color: theme.text }]}>{tx.title}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>{tx.date} • {tx.category}</Text>
                      </View>
                      <Text style={{ fontWeight: '800', color: tx.type === 'income' ? '#10B981' : '#EF4444' }}>
                        ৳ {tx.amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.downloadBtn, isGenerating && { opacity: 0.8 }]}
              onPress={handleDownloadPDF}
              disabled={isGenerating}
              activeOpacity={0.85}
              style={[styles.downloadBtn, isGenerating && { opacity: 0.7 }]}
            >
              {isGenerating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.downloadBtnText}>তৈরি হচ্ছে, অপেক্ষা করুন...</Text>
                </View>
              ) : (
                <Text style={styles.downloadBtnText}>{t.pdfDownloadBtn}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.waShareBtn} onPress={handleShareWhatsApp} activeOpacity={0.8}>
              <Text style={styles.waShareBtnText}>{t.pdfShareWABtn}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '700',
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 2,
  },
  txCountNote: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  txSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  txSelectTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
  },
  downloadBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#208AEF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  waShareBtn: {
    paddingVertical: 8,
  },
  waShareBtnText: {
    color: '#25D366',
    fontSize: 13,
    fontWeight: '700',
  },
});

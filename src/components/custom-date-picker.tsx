import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
}

export function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const theme = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const [showModal, setShowModal] = useState(false);

  // Parse initial date
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parseInt(parts[0], 10));
        setMonth(parseInt(parts[1], 10) - 1);
        setSelectedDay(parseInt(parts[2], 10));
      }
    }
  }, [value, showModal]);

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)

  // Weekdays header
  const weekdays = language === 'bn' 
    ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesBn = [
    'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const currentMonthName = language === 'bn' ? monthNamesBn[month] : monthNamesEn[month];

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
  };

  const handleConfirm = () => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(selectedDay).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setShowModal(false);
  };

  // Format value for display on the button
  const displayDate = () => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const mName = language === 'bn' ? monthNamesBn[mIdx] : monthNamesEn[mIdx];
      return language === 'bn' ? `${d} ${mName}, ${y}` : `${d} ${mName} ${y}`;
    }
    return value;
  };

  // Generate calendar grid array
  const gridCells = [];
  // Add empty spaces for padding
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push({ type: 'empty', key: `empty-${i}` });
  }
  // Add actual days
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({ type: 'day', day: d, key: `day-${d}` });
  }

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.text }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.pickerButtonText, { color: theme.text }]}>📅 {displayDate()}</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={[styles.calendarSheet, { backgroundColor: theme.background }]} onPress={(e) => e.stopPropagation()}>
            {/* Header: Month and Year */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <Text style={[styles.navBtnText, { color: theme.text }]}>◀</Text>
              </TouchableOpacity>
              <Text style={[styles.headerText, { color: theme.text }]}>{currentMonthName} {year}</Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <Text style={[styles.navBtnText, { color: theme.text }]}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Weekdays Header */}
            <View style={styles.weekdaysRow}>
              {weekdays.map((w, idx) => (
                <Text key={idx} style={[styles.weekdayText, { color: theme.textSecondary }]}>{w}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.gridContainer}>
              {gridCells.map((cell) => {
                if (cell.type === 'empty') {
                  return <View key={cell.key} style={styles.gridCell} />;
                }
                const isSelected = cell.day === selectedDay;
                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.gridCell,
                      isSelected && { backgroundColor: '#208AEF', borderRadius: 20 }
                    ]}
                    onPress={() => cell.day && handleSelectDay(cell.day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? '#FFF' : theme.text },
                        isSelected && { fontWeight: '700' }
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footerRow}>
              <TouchableOpacity style={[styles.footerBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.footerBtnText, { color: theme.text }]}>{t.cancelBtn}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#208AEF' }]} onPress={handleConfirm}>
                <Text style={[styles.footerBtnText, { color: '#FFF' }]}>{language === 'bn' ? 'ঠিক আছে' : 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  pickerButton: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarSheet: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
  },
  navBtnText: {
    fontSize: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  gridCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  footerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

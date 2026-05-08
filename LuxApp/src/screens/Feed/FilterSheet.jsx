import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';

const REGIONS = ['All', 'India', 'Philippines', 'Indonesia', 'Vietnam', 'Global'];
const LANGUAGES = ['All', 'Hindi', 'English', 'Bengali', 'Tamil', 'Telugu'];

export default function FilterSheet({ visible, filters, onApply, onClose }) {
  const [region, setRegion] = useState(filters.region);
  const [language, setLanguage] = useState(filters.language);

  const handleApply = () => {
    onApply({ region, language });
  };

  const handleReset = () => {
    setRegion('All');
    setLanguage('All');
    onApply({ region: 'All', language: 'All' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Pressable onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Region</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {REGIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRegion(r)}
              style={[styles.chip, region === r && styles.chipActive]}
            >
              <Text style={[styles.chipText, region === r && styles.chipTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLanguage(l)}
              style={[styles.chip, language === l && styles.chipActive]}
            >
              <Text style={[styles.chipText, language === l && styles.chipTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyText}>Apply Filters</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  resetText: { fontSize: 14, color: theme.colors.accentCyan, fontWeight: '600' },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary,
    marginBottom: 10, marginTop: 8,
  },
  chipRow: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: theme.radius.pill, marginRight: 8,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(255,45,120,0.15)',
    borderColor: theme.colors.accentMagenta,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  chipTextActive: { color: theme.colors.accentMagenta },
  applyBtn: {
    backgroundColor: theme.colors.accentMagenta,
    paddingVertical: 16, borderRadius: theme.radius.pill,
    alignItems: 'center', marginTop: 20,
  },
  applyText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

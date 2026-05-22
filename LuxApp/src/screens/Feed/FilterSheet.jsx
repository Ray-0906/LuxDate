// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import theme from '../../theme/theme.js';
import { PremiumButton } from '../../components/ui.jsx';

const REGIONS = ['All', 'India', 'Philippines', 'Indonesia', 'Vietnam', 'Global'];
const LANGUAGES = ['All', 'Hindi', 'English', 'Bengali', 'Tamil', 'Telugu'];

function FilterChip({ label, isActive, onPress }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1, { damping: 15 });
  }, [isActive, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[
      styles.chip,
      isActive && styles.chipActive,
      isActive && theme.shadow.glowMagenta,
      animatedStyle
    ]}>
      <Pressable onPress={onPress} style={styles.chipPressable}>
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function FilterSheet({ visible, filters, onApply, onClose }) {
  const [region, setRegion] = useState(filters.region);
  const [language, setLanguage] = useState(filters.language);

  // Sync state when sheet becomes visible
  useEffect(() => {
    if (visible) {
      setRegion(filters.region);
      setLanguage(filters.language);
    }
  }, [visible, filters]);

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.scrollContent}>
          {REGIONS.map((r) => (
            <FilterChip
              key={r}
              label={r}
              isActive={region === r}
              onPress={() => setRegion(r)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Language</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.scrollContent}>
          {LANGUAGES.map((l) => (
            <FilterChip
              key={l}
              label={l}
              isActive={language === l}
              onPress={() => setLanguage(l)}
            />
          ))}
        </ScrollView>

        <PremiumButton
          title="Apply Filters"
          onPress={handleApply}
          colors={theme.gradients.primary}
          glowType={theme.shadow.glowMagenta}
          style={styles.applyBtn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
  },
  sheet: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  resetText: {
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.accentCyan,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: theme.typography.fontBody,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  chipRow: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: theme.radius.pill,
    marginRight: 10,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  chipPressable: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: 'rgba(233, 30, 140, 0.12)',
    borderColor: theme.colors.accentMagenta,
  },
  chipText: {
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.accentMagenta,
    fontWeight: '700',
  },
  applyBtn: {
    marginTop: 20,
  },
});

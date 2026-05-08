import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import HotFeed from './HotFeed.jsx';
import NearbyFeed from './NearbyFeed.jsx';
import FilterSheet from './FilterSheet.jsx';

const TABS = ['Hot', 'Nearby'];

export default function ForYouScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({ region: 'All', language: 'All' });

  const hasActiveFilter = filters.region !== 'All' || filters.language !== 'All';

  const onApplyFilters = useCallback((f) => {
    setFilters(f);
    setFilterVisible(false);
  }, []);

  const openProfile = useCallback((girl) => {
    navigation.navigate('GirlProfile', { girl });
  }, [navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgPrimary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Lux<Text style={{ color: theme.colors.accentMagenta }}>Date</Text></Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('SearchScreen')} style={styles.iconBtn}>
            <Ionicons name="search-outline" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Pressable onPress={() => setFilterVisible(true)} style={styles.iconBtn}>
            <Ionicons
              name={hasActiveFilter ? 'globe' : 'options-outline'}
              size={22}
              color={hasActiveFilter ? theme.colors.accentCyan : theme.colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(i)}
            style={[styles.tab, activeTab === i && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            {activeTab === i && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Feed Content */}
      {activeTab === 0 ? (
        <HotFeed filters={filters} onOpenProfile={openProfile} />
      ) : (
        <NearbyFeed onOpenProfile={openProfile} />
      )}

      {/* Filter Bottom Sheet */}
      <FilterSheet
        visible={filterVisible}
        filters={filters}
        onApply={onApplyFilters}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  logo: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.bgTertiary,
  },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 18, alignItems: 'center' },
  tabActive: {},
  tabText: { fontSize: 15, fontWeight: '600', color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.textPrimary },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '25%', right: '25%',
    height: 3, borderRadius: 2, backgroundColor: theme.colors.accentMagenta,
  },
});

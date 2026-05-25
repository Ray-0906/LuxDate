// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import theme from '../../theme/theme.js';
import HotFeed from './HotFeed.jsx';
import NearbyFeed from './NearbyFeed.jsx';
import FilterSheet from './FilterSheet.jsx';
import BrandMark from '../../components/BrandMark.jsx';
import useAppSettingsStore from '../../store/appSettingsStore.js';

const TABS = ['Hot', 'Nearby'];
const TAB_WIDTH = 100;

export default function ForYouScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const appName = useAppSettingsStore((s) => s.settings.branding.appName);
  const [activeTab, setActiveTab] = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({ region: 'All', language: 'All' });
  const [onlineCount, setOnlineCount] = useState(148);

  const tabX = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + delta;
        return newCount < 50 ? 50 : newCount > 500 ? 500 : newCount;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTabPress = (index) => {
    setActiveTab(index);
    tabX.value = withSpring(index, { damping: 18 });
  };

  const hasActiveFilter = filters.region !== 'All' || filters.language !== 'All';

  const onApplyFilters = useCallback((f) => {
    setFilters(f);
    setFilterVisible(false);
  }, []);

  const openProfile = useCallback((girl) => {
    navigation.navigate('GirlProfile', { girl });
  }, [navigation]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabX.value * TAB_WIDTH }],
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgPrimary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleArea}>
          <View style={styles.logoRow}>
            <BrandMark size={34} iconOnly />
            <Text style={styles.logo}>{appName}</Text>
          </View>
          <Text style={styles.socialProof}>
            ✦ {onlineCount} women online now
          </Text>
        </View>

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

      {/* Slide-animated Pill Segmented Tabs */}
      <View style={styles.tabContainer}>
        <Animated.View style={[styles.activePill, animatedPillStyle]} />
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            onPress={() => handleTabPress(i)}
            style={styles.tab}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
              {tab}
            </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitleArea: {
    flexDirection: 'column',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontSize: 20,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  socialProof: {
    fontSize: 11,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.accentCyan,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.pill,
    padding: 4,
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  activePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: TAB_WIDTH - 8,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 140, 0.25)',
  },
  tab: {
    width: TAB_WIDTH - 4,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
});

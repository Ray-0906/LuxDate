import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import useAuthStore from '../../store/authStore.js';

const WEALTH_COLORS = ['#666', '#8B8B8B', '#B8860B', '#FFD700', '#FF6347', '#FF2D78', '#8B2FF8'];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const loadProfile = useAuthStore((s) => s.loadProfile);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const wealthColor = WEALTH_COLORS[Math.min(user?.wealthLevel || 0, WEALTH_COLORS.length - 1)];

  const menuItems = [
    { icon: 'wallet-outline', label: 'Wallet', screen: 'Wallet', color: theme.colors.accentCyan },
    { icon: 'diamond-outline', label: 'VIP Plans', screen: 'VIPPlans', color: theme.colors.accentViolet },
    { icon: 'receipt-outline', label: 'Transactions', screen: 'TransactionHistory', color: theme.colors.textSecondary },
    { icon: 'gift-outline', label: 'Gifts Sent', screen: 'GiftsSent', color: theme.colors.accentMagenta },
    { icon: 'heart-outline', label: 'Relationships', screen: 'Relationships', color: theme.colors.accentRed },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{user?.name || user?.username || 'User'}</Text>
          <Text style={styles.meta}>
            {user?.age ? `${user.age} · ` : ''}{user?.gender || ''}{user?.location ? ` · ${user.location}` : ''}
          </Text>

          {/* Wealth Level Badge */}
          <View style={[styles.wealthBadge, { borderColor: wealthColor }]}>
            <Text style={[styles.wealthText, { color: wealthColor }]}>
              ★ Level {user?.wealthLevel || 0}
            </Text>
          </View>
        </View>

        {/* Wallet Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="wallet" size={20} color={theme.colors.accentCyan} />
            <Text style={styles.statValue}>{user?.coinBalance || 0}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="star" size={20} color={theme.colors.accentViolet} />
            <Text style={styles.statValue}>{user?.pointBalance || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable style={styles.statBox} onPress={() => navigation.navigate('CoinRecharge')}>
            <Ionicons name="add-circle" size={20} color={theme.colors.accentMagenta} />
            <Text style={[styles.statValue, { color: theme.colors.accentMagenta }]}>Recharge</Text>
            <Text style={styles.statLabel}>Buy Coins</Text>
          </Pressable>
        </View>

        {/* VIP Badge */}
        {user?.isVip && (
          <View style={styles.vipBanner}>
            <Ionicons name="diamond" size={18} color="#FFD700" />
            <Text style={styles.vipText}>VIP Active</Text>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.accentRed} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  scroll: { paddingHorizontal: 20 },
  profileCard: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: theme.colors.accentMagenta,
  },
  username: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 12 },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  wealthBadge: {
    marginTop: 10, borderWidth: 1.5, borderRadius: theme.radius.pill,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  wealthText: { fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.bgSecondary, borderRadius: theme.radius.lg,
    padding: 16, marginTop: 16,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: theme.colors.borderGlass },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: 11, color: theme.colors.textMuted },
  vipBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: theme.radius.md,
    padding: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
  },
  vipText: { fontSize: 14, fontWeight: '700', color: '#FFD700' },
  menu: { marginTop: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.borderGlass,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginTop: 24,
    backgroundColor: 'rgba(255,48,64,0.08)', borderRadius: theme.radius.md,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: theme.colors.accentRed },
});

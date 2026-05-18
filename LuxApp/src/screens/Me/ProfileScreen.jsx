import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import useAuthStore from '../../store/authStore.js';
import { vipApi, coinsApi, relationshipsApi } from '../../api/services.js';
import RelationshipEngine from '../../engines/RelationshipEngine.js';

const WEALTH_COLORS = ['#666', '#8B8B8B', '#B8860B', '#FFD700', '#FF6347', '#FF2D78', '#8B2FF8'];

const FRAME_BORDER = {
  none: theme.colors.accentMagenta,
  gold: '#FFD700',
  elite: '#DA70D6',
};

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const loadProfile = useAuthStore((s) => s.loadProfile);

  const [checkinInfo, setCheckinInfo] = useState(null);
  const [postNudge, setPostNudge] = useState(null);
  const [myConnections, setMyConnections] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      coinsApi.checkinStatus().then((r) => setCheckinInfo(r.data?.data)).catch(() => setCheckinInfo(null));
      vipApi.status().then((r) => {
        const d = r.data?.data;
        if (d?.justExpired) {
          Alert.alert('VIP expired', 'Renew from VIP Plans to keep daily rewards.');
        }
      }).catch(() => {});
      relationshipsApi.my()
        .then((r) => setMyConnections(r.data?.data?.slots || []))
        .catch(() => setMyConnections([]));
      const p = route.params?.postCallTopUp;
      if (p) {
        setPostNudge(p);
        navigation.setParams({ postCallTopUp: undefined });
      }
    }, [loadProfile, navigation, route.params])
  );

  const wealthColor = WEALTH_COLORS[Math.min(user?.wealthLevel || 0, WEALTH_COLORS.length - 1)];
  const frameColor = FRAME_BORDER[user?.vipFrameType] || FRAME_BORDER.none;
  const badgeLabel = user?.vipBadgeType && user.vipBadgeType !== 'none' ? user.vipBadgeType : null;

  const menuItems = [
    { icon: 'wallet-outline', label: 'Wallet', screen: 'Wallet', color: theme.colors.accentCyan },
    { icon: 'diamond-outline', label: 'VIP Plans', screen: 'VIPPlans', color: theme.colors.accentViolet },
    { icon: 'receipt-outline', label: 'Transactions', screen: 'TransactionHistory', color: theme.colors.textSecondary },
  ];

  const claimCheckin = async () => {
    try {
      const res = await coinsApi.checkinClaim();
      const d = res.data?.data;
      if (!d?.success && d?.error === 'already_claimed_today') {
        await loadProfile();
        Alert.alert('Check-in', 'Already claimed today. Come back tomorrow!');
        return;
      }
      if (!d?.success) {
        Alert.alert('Check-in', d?.message || 'Unable to claim');
        return;
      }
      await loadProfile();
      Alert.alert('Check-in', `+${d.coins} coins`);
      const st = await coinsApi.checkinStatus();
      setCheckinInfo(st.data?.data);
    } catch (e) {
      Alert.alert('Check-in', e?.response?.data?.message || e.message || 'Failed');
    }
  };

  const handleBreakBond = async (slot) => {
    const rel = slot?.relationship;
    if (!rel?._id) return;
    Alert.alert(
      'End this bond?',
      'This cannot be undone and coins are not refunded.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'End Bond',
          style: 'destructive',
          onPress: async () => {
            try {
              await relationshipsApi.break(rel._id, { reason: 'manual_break' });
              RelationshipEngine.cancelPendingAcceptance(rel._id);
              const res = await relationshipsApi.my();
              setMyConnections(res.data?.data?.slots || []);
            } catch (e) {
              Alert.alert('Relationship', e?.response?.data?.message || 'Unable to end bond');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {postNudge ? (
          <Pressable
            style={styles.nudge}
            onPress={() => {
              setPostNudge(null);
              navigation.navigate('CoinPack');
            }}
          >
            <Ionicons name="flash" size={18} color={theme.colors.accentMagenta} />
            <Text style={styles.nudgeText}>
              {postNudge.balance === 0
                ? "You're out of coins — top up to keep calling."
                : `Only ${postNudge.balance} coins left — not enough for 2 more minutes.`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}

        <View style={styles.profileCard}>
          <Image
            source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/120' }}
            style={[styles.avatar, { borderColor: frameColor, borderWidth: user?.vipFrameType && user.vipFrameType !== 'none' ? 3 : 2 }]}
          />
          <View style={styles.nameRow}>
            <Text style={styles.username}>{user?.name || user?.username || 'User'}</Text>
            {badgeLabel ? (
              <View style={styles.badgeChip}>
                <Text style={styles.badgeText}>{badgeLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>
            {user?.age ? `${user.age} · ` : ''}{user?.gender || ''}{user?.location ? ` · ${user.location}` : ''}
          </Text>

          <View style={[styles.wealthBadge, { borderColor: wealthColor }]}>
            <Text style={[styles.wealthText, { color: wealthColor }]}>
              ★ Level {user?.wealthLevel || 0}
            </Text>
          </View>
        </View>

        {!user?.isVip && checkinInfo?.canClaim ? (
          <View style={styles.checkinCard}>
            <Text style={styles.checkinTitle}>Daily check-in</Text>
            <Text style={styles.checkinSub}>
              Claim {checkinInfo.coinsIfClaim} coins today
            </Text>
            <Pressable style={styles.checkinBtn} onPress={claimCheckin}>
              <Text style={styles.checkinBtnText}>Claim</Text>
            </Pressable>
          </View>
        ) : null}

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
          <Pressable style={styles.statBox} onPress={() => navigation.navigate('CoinPack')}>
            <Ionicons name="add-circle" size={20} color={theme.colors.accentMagenta} />
            <Text style={[styles.statValue, { color: theme.colors.accentMagenta }]}>Recharge</Text>
            <Text style={styles.statLabel}>Buy Coins</Text>
          </Pressable>
        </View>

        {user?.isVip ? (
          <View style={styles.vipBanner}>
            <Ionicons name="diamond" size={18} color="#FFD700" />
            <Text style={styles.vipText}>VIP Active</Text>
          </View>
        ) : null}

        <View style={styles.connectionsCard}>
          <Text style={styles.connectionsTitle}>My Connections</Text>
          <View style={styles.connectionCardGrid}>
            {myConnections.map((slot) => {
              const rel = slot.relationship;
              const isActive = slot.state === 'accepted' || slot.state === 'pending';
              const girlPhoto = rel?.girl?.photo || '';
              return (
                <Pressable
                  key={slot.type}
                  style={styles.connectionCard}
                  onPress={() => {
                    if (isActive && rel?.girlProfileId) {
                      navigation.navigate('GirlProfile', {
                        girl: {
                          _id: rel.girlProfileId,
                          name: rel?.girl?.name,
                          photos: girlPhoto ? [girlPhoto] : [],
                        },
                      });
                    } else {
                      navigation.navigate('ForYou');
                    }
                  }}
                  onLongPress={() => {
                    if (isActive) handleBreakBond(slot);
                  }}
                >
                  <View style={styles.connectionCardMedia}>
                    {isActive && girlPhoto ? (
                      <Image source={{ uri: girlPhoto }} style={styles.connectionCardPhoto} />
                    ) : (
                      <View style={styles.connectionCardPlaceholder}>
                        <Ionicons
                          name={slot.state === 'pending' ? 'hourglass-outline' : 'person-add-outline'}
                          size={22}
                          color={theme.colors.textMuted}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.connectionCardTitle}>{slot.typeIcon} {slot.typeLabel}</Text>
                  {isActive ? (
                    <Text style={styles.connectionCardSub} numberOfLines={2}>
                      {rel?.girl?.name || 'Connected'} · {slot.state === 'pending' ? 'Pending' : 'Active'}
                    </Text>
                  ) : (
                    <Text style={styles.connectionCardSub}>Waiting for someone</Text>
                  )}
                  <Text style={styles.connectionCardHint}>
                    {isActive ? 'Tap to open profile' : 'Tap to find connection'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!!myConnections.length && (
            <Text style={styles.connectionsFootnote}>Long press an active card to break bond.</Text>
          )}
        </View>

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
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.bgSecondary,
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  nudgeText: { flex: 1, color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600' },
  profileCard: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badgeChip: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFD700', textTransform: 'uppercase' },
  username: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  wealthBadge: {
    marginTop: 10, borderWidth: 1.5, borderRadius: theme.radius.pill,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  wealthText: { fontSize: 12, fontWeight: '700' },
  checkinCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  checkinTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  checkinSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  checkinBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentViolet,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  checkinBtnText: { color: '#FFF', fontWeight: '800' },
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
  connectionsCard: {
    marginTop: 14,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  connectionsTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  connectionCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  connectionCard: {
    width: '31.5%',
    backgroundColor: theme.colors.bgPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderRadius: 12,
    padding: 10,
    minHeight: 165,
  },
  connectionCardMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  connectionCardPhoto: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: theme.colors.accentMagenta,
  },
  connectionCardPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  connectionCardSub: {
    marginTop: 6,
    minHeight: 30,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  connectionCardHint: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accentCyan,
  },
  connectionsFootnote: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
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

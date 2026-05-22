// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme/theme.js';
import useAuthStore from '../../store/authStore.js';
import { vipApi, coinsApi, relationshipsApi } from '../../api/services.js';
import RelationshipEngine from '../../engines/RelationshipEngine.js';

const WEALTH_COLORS = ['#9B9BC0', '#B0B0D8', '#C9A84C', '#FFD700', '#FF5B84', '#E91E8C', '#7C3AED'];

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
  const isVip = user?.isVip;
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

  const getSlotIconName = (type) => {
    const t = String(type).toLowerCase();
    if (t.includes('love') || t.includes('cp') || t.includes('spouse') || t.includes('partner')) {
      return 'heart-outline';
    }
    if (t.includes('bestie') || t.includes('friend')) {
      return 'people-outline';
    }
    return 'sparkles-outline';
  };

  const getSlotColor = (type) => {
    const t = String(type).toLowerCase();
    if (t.includes('love') || t.includes('cp') || t.includes('spouse') || t.includes('partner')) {
      return theme.colors.accentMagenta;
    }
    if (t.includes('bestie') || t.includes('friend')) {
      return theme.colors.accentCyan;
    }
    return theme.colors.accentGold;
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

        {/* User Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={isVip ? theme.gradients.gold : theme.gradients.primary}
            style={styles.avatarBorder}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/120' }}
                style={styles.avatar}
              />
            </View>
          </LinearGradient>

          <View style={styles.nameRow}>
            <Text style={styles.username}>{user?.name || user?.username || 'User'}</Text>
            {isVip && (
              <LinearGradient
                colors={theme.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.vipBadgeChip}
              >
                <Ionicons name="diamond" size={10} color="#3A2E00" style={{ marginRight: 2 }} />
                <Text style={styles.vipBadgeText}>{badgeLabel || 'VIP'}</Text>
              </LinearGradient>
            )}
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

        {/* Daily Check-in Card (with Gold Shimmer styling) */}
        {!isVip && checkinInfo?.canClaim && (
          <View style={styles.checkinCard}>
            <View style={styles.checkinContent}>
              <Text style={styles.checkinTitle}>Daily check-in</Text>
              <Text style={styles.checkinSub}>
                Claim {checkinInfo.coinsIfClaim} free coins today
              </Text>
            </View>
            <TouchableOpacity onPress={claimCheckin} style={styles.checkinBtnContainer}>
              <LinearGradient
                colors={theme.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.checkinBtn}
              >
                <Text style={styles.checkinBtnText}>Claim</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Bento Card */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="wallet-outline" size={20} color={theme.colors.accentCyan} />
            <Text style={styles.statValue}>{user?.coinBalance || 0}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Ionicons name="sparkles-outline" size={20} color={theme.colors.accentViolet} />
            <Text style={styles.statValue}>{user?.pointBalance || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable style={styles.statBox} onPress={() => navigation.navigate('CoinPack')}>
            <Ionicons name="add-outline" size={20} color={theme.colors.accentMagenta} style={styles.addIcon} />
            <Text style={[styles.statValue, { color: theme.colors.accentMagenta }]}>Recharge</Text>
            <Text style={styles.statLabel}>Top Up</Text>
          </Pressable>
        </View>

        {/* VIP Banner */}
        {isVip ? (
          <LinearGradient
            colors={theme.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.vipActiveBanner}
          >
            <Ionicons name="diamond" size={16} color="#3A2E00" />
            <Text style={styles.vipActiveText}>Lux VIP Premium Privilege Active</Text>
          </LinearGradient>
        ) : (
          <Pressable onPress={() => navigation.navigate('VIPPlans')} style={styles.vipUpsellBanner}>
            <Ionicons name="diamond-outline" size={16} color={theme.colors.accentGold} />
            <Text style={styles.vipUpsellText}>Unlock Daily Rewards & Profile Border. Upgrade to VIP →</Text>
          </Pressable>
        )}

        {/* Connections Card */}
        <View style={styles.connectionsCard}>
          <Text style={styles.connectionsTitle}>My Connections</Text>
          <View style={styles.connectionCardGrid}>
            {myConnections.map((slot) => {
              const rel = slot.relationship || slot.occupiedBy;
              const isActive = !!rel && (slot.state === 'accepted' || slot.state === 'pending' || slot.state === 'occupied');
              const girlPhoto = rel?.girl?.photo || '';
              const slotColor = getSlotColor(slot.type);

              return (
                <Pressable
                  key={slot.type}
                  style={[styles.connectionCard, isActive && { borderColor: 'rgba(255,255,255,0.1)' }]}
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
                      <View style={styles.photoFrame}>
                        <Image source={{ uri: girlPhoto }} style={styles.connectionCardPhoto} />
                      </View>
                    ) : (
                      <View style={styles.connectionCardPlaceholder}>
                        <Ionicons
                          name={slot.state === 'pending' ? 'hourglass-outline' : getSlotIconName(slot.type)}
                          size={20}
                          color={slotColor}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.connectionCardTitle, { color: slotColor }]}>{slot.typeLabel}</Text>
                  {isActive ? (
                    <Text style={styles.connectionCardSub} numberOfLines={2}>
                      {rel?.girl?.name || 'Connected'} · {slot.state === 'pending' ? 'Pending' : 'Active'}
                    </Text>
                  ) : (
                    <Text style={styles.connectionCardSub}>Waiting for connection</Text>
                  )}
                  <Text style={styles.connectionCardHint}>
                    {isActive ? 'Details →' : 'Find Bond →'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!!myConnections.length && (
            <Text style={styles.connectionsFootnote}>Long press an active slot to end bond.</Text>
          )}
        </View>

        {/* Menu list */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.accentRed} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

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
    borderColor: 'rgba(233,30,140,0.2)',
  },
  nudgeText: { flex: 1, color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: theme.typography.fontBody },
  profileCard: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  avatarBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.5,
  },
  avatarContainer: {
    width: 91,
    height: 91,
    borderRadius: 45.5,
    backgroundColor: theme.colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  vipBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vipBadgeText: { fontSize: 10, fontWeight: '800', color: '#3A2E00', textTransform: 'uppercase', fontFamily: theme.typography.fontBody },
  username: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, fontFamily: theme.typography.fontDisplay },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.typography.fontBody },
  wealthBadge: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  wealthText: { fontSize: 11, fontWeight: '700', fontFamily: theme.typography.fontBody },
  checkinCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkinContent: { flex: 1, marginRight: 12 },
  checkinTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, fontFamily: theme.typography.fontDisplay },
  checkinSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3, fontFamily: theme.typography.fontBody },
  checkinBtnContainer: { minWidth: 80 },
  checkinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinBtnText: { color: '#3A2E00', fontWeight: '800', fontSize: 13, fontFamily: theme.typography.fontBody },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.05)' },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, fontFamily: theme.typography.fontDisplay },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.typography.fontBody },
  addIcon: {
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  vipActiveBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12,
    padding: 12, marginTop: 14,
  },
  vipActiveText: { fontSize: 13, fontWeight: '800', color: '#3A2E00', fontFamily: theme.typography.fontBody },
  vipUpsellBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(201,168,76,0.05)', borderRadius: 12,
    padding: 12, marginTop: 14, borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
  },
  vipUpsellText: { fontSize: 11, fontWeight: '600', color: theme.colors.accentGoldLight, fontFamily: theme.typography.fontBody, textAlign: 'center', flex: 1 },
  connectionsCard: {
    marginTop: 16,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  connectionsTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, fontFamily: theme.typography.fontDisplay },
  connectionCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  connectionCard: {
    width: '32%',
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 10,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionCardMedia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.accentMagenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionCardPhoto: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  connectionCardPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: theme.typography.fontBody,
  },
  connectionCardSub: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: theme.typography.fontBody,
    minHeight: 26,
  },
  connectionCardHint: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accentCyan,
    fontFamily: theme.typography.fontBody,
  },
  connectionsFootnote: {
    marginTop: 2,
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: theme.typography.fontBody,
  },
  menu: { marginTop: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuIcon: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, fontFamily: theme.typography.fontBody },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, marginTop: 24,
    backgroundColor: 'rgba(255,59,107,0.06)', borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,59,107,0.1)',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: theme.colors.accentRed, fontFamily: theme.typography.fontBody },
});

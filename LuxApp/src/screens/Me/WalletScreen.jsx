// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme/theme.js';
import useAuthStore from '../../store/authStore.js';
import { coinsApi } from '../../api/services.js';
import useAppSettingsStore from '../../store/appSettingsStore.js';

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const callSettings = useAppSettingsStore((s) => s.settings.calls);
  const defaultCallRate = user?.isVip ? callSettings.vipRate : callSettings.nonVipRate;

  const [loading, setLoading] = useState(true);
  const [callCostPerMinute, setCallCostPerMinute] = useState(defaultCallRate);
  const [quickPacks, setQuickPacks] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoading(true);

      const fetchData = async () => {
        try {
          await loadProfile();
          const [econRes, packsRes] = await Promise.all([
            coinsApi.economy().catch(() => null),
            coinsApi.packs({ context: 'wallet' }).catch(() => null),
          ]);

          if (!isMounted) return;

          if (econRes?.data?.data?.callCostPerMinute) {
            setCallCostPerMinute(econRes.data.data.callCostPerMinute);
          }

          if (packsRes?.data?.data) {
            const list = packsRes.data.data;
            const filtered = list.filter((p) => p?._id && !String(p._id).startsWith('legacy'));
            setQuickPacks(filtered.slice(0, 3)); // Take top 3 packs
          }
        } catch (e) {
          console.warn('Wallet data fetch error:', e);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchData();

      return () => {
        isMounted = false;
      };
    }, [loadProfile])
  );

  const coinBalance = user?.coinBalance ?? 0;
  const minutesAvailable = Math.floor(coinBalance / (callCostPerMinute || defaultCallRate || 10));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="diamond" size={18} color={theme.colors.accentGold} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* GOLD BORDER BALANCE CARD */}
          <LinearGradient
            colors={theme.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradientBorder}
          >
            <View style={styles.cardInner}>
              <View style={styles.coinIconWrap}>
                <Ionicons name="diamond" size={32} color={theme.colors.accentGold} />
              </View>
              <Text style={styles.cardLabel}>YOUR COINS</Text>
              <Text style={styles.balanceText}>{coinBalance}</Text>
              <Text style={styles.durationEstimate}>
                Enough for ~{minutesAvailable} minutes of calls
              </Text>
            </View>
          </LinearGradient>

          {/* QUICK PACK ROW */}
          {quickPacks.length > 0 && (
            <View style={styles.quickRechargeSection}>
              <Text style={styles.sectionHeader}>✦ QUICK RECHARGE</Text>
              <View style={styles.packsRow}>
                {quickPacks.map((pack, idx) => {
                  const isPopular = idx === 1; // Middle one gets popular tag
                  return (
                    <Pressable
                      key={pack._id}
                      style={styles.quickPackCard}
                      onPress={() => navigation.navigate('CoinPack', { selectedPackId: pack._id })}
                    >
                      {isPopular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>POPULAR</Text>
                        </View>
                      )}
                      <Ionicons name="diamond" size={20} color={theme.colors.accentGold} style={styles.packIcon} />
                      <Text style={styles.packCoins}>{pack.coins}</Text>
                      <Text style={styles.packPrice}>₹{pack.priceInr}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ACTIONS */}
          <View style={styles.actionContainer}>
            <Pressable onPress={() => navigation.navigate('CoinPack')}>
              <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Ionicons name="diamond-outline" size={18} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Buy Coins</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('TransactionHistory')}
            >
              <Ionicons name="receipt-outline" size={18} color={theme.colors.textSecondary} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Transaction History</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardGradientBorder: {
    borderRadius: 24,
    padding: 1.5,
    marginBottom: 32,
    ...theme.shadow.glowGold,
  },
  cardInner: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 22.5,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  coinIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
  },
  cardLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 54,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '900',
    lineHeight: 58,
    marginBottom: 12,
  },
  durationEstimate: {
    fontSize: 13,
    color: theme.colors.accentCyan,
    fontWeight: '600',
  },
  quickRechargeSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  packsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickPackCard: {
    flex: 1,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -9,
    backgroundColor: theme.colors.accentMagenta,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  packIcon: {
    marginBottom: 6,
  },
  packCoins: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
    marginBottom: 4,
  },
  packPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  actionContainer: {
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glowMagenta,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

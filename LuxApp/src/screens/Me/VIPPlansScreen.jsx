// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, Dimensions,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme/theme.js';
import { vipApi, coinsApi } from '../../api/services.js';
import useAuthStore from '../../store/authStore.js';
import {
  checkoutAndVerifyVip,
  fetchPaymentGatewayNames,
  isUserCancelledRazorpay,
} from '../../payments/runPayments.js';
import PaymentGatewayPickModal from '../../components/PaymentGatewayPickModal.jsx';
import MockPayConfirmModal from '../../components/MockPayConfirmModal.jsx';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ----------------------------------------------------
// UI Data Map & Fallback Generators
// ----------------------------------------------------

const generateRewardSchedule = (durationDays, dailyCoins) => {
  return Array.from({ length: durationDays }).map((_, i) => ({
    day: i + 1,
    coins: dailyCoins,
  }));
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toKeyText = (value) => String(value || '').trim().toLowerCase();

const normalizeDailyRewards = (plan, durationDays, fallbackDailyCoins) => {
  const candidates = [
    plan?.dailyRewards,
    plan?.rewardSchedule,
    plan?.checkinSchedule,
    plan?.dailyCheckinSchedule,
    plan?.schedule,
  ];
  const rawSchedule = candidates.find((entry) => Array.isArray(entry) && entry.length > 0) || [];
  if (rawSchedule.length > 0) {
    return rawSchedule
      .map((entry, index) => {
        const day = toNumber(entry?.day || entry?.dayNumber || entry?.index) || index + 1;
        const coins = toNumber(
          entry?.coins ??
            entry?.amount ??
            entry?.reward ??
            entry?.dailyCheckinCoins ??
            fallbackDailyCoins
        );
        return { day, coins };
      })
      .filter((entry) => entry.day > 0 && entry.coins > 0);
  }
  if (fallbackDailyCoins > 0 && durationDays > 0) {
    return generateRewardSchedule(durationDays, fallbackDailyCoins);
  }
  return [];
};

const mapBackendPlan = (plan, index) => {
  const durationDays = toNumber(plan.durationDays || plan.duration || plan.validityDays) || 30;
  const isWeekly = durationDays <= 7;
  const type = plan.type || (isWeekly ? 'weekly' : 'monthly');
  const name = plan.name || (index % 2 === 0 ? `Super ${isWeekly ? 'Weekly' : 'Monthly'}` : `Luxury ${isWeekly ? 'Weekly' : 'Monthly'}`);
  
  const price = toNumber(plan.price || plan.priceInr || plan.amountInr);
  const fakePrice = price > 0 ? +(price * 1.5).toFixed(0) : 0; // fake 33% off
  const upfrontCoins = toNumber(
    plan.upfrontCoins ?? plan.instantRewardCoins ?? plan.instantCoins ?? plan.joiningCoins
  );
  let dailyCheckinCoins = toNumber(
    plan.dailyCheckinCoins ?? plan.dailyCoins ?? plan.checkinCoins ?? plan.dailyRewardCoins
  );
  const totalCoins = toNumber(plan.totalCoins ?? plan.totalRewardCoins);

  const schedule = normalizeDailyRewards(plan, durationDays, dailyCheckinCoins);
  if (dailyCheckinCoins <= 0 && schedule.length > 0) {
    dailyCheckinCoins = toNumber(schedule[0]?.coins);
  }
  const resolvedTotalCoins =
    totalCoins > 0 ? totalCoins : upfrontCoins + schedule.reduce((sum, day) => sum + toNumber(day.coins), 0);
  const resolvedId =
    plan?._id ||
    plan?.id ||
    `${toKeyText(name)}-${toKeyText(type)}-${durationDays}-${price}-${index}`;

  return {
    ...plan,
    id: resolvedId,
    name,
    type,
    durationDays,
    price,
    fakePrice,
    totalCoins: resolvedTotalCoins,
    instantReward: upfrontCoins,
    dailyCheckinCoins,
    dailyRewards: schedule,
    extraBenefits: plan.bonusPerks?.length > 0 ? plan.bonusPerks : ['VIP Frame', 'Premium Badge', 'Chat Privileges'],
    theme: isWeekly ? ['#3b1b60', '#1c0f33'] : ['#5b2413', '#2a110a'], // Purple vs Gold themes
  };
};

const hasMeaningfulCoinBenefits = (plan) => {
  const scheduleHasCoins = Array.isArray(plan.dailyRewards)
    ? plan.dailyRewards.some((entry) => toNumber(entry?.coins) > 0)
    : false;

  return (
    toNumber(plan.instantReward) > 0 ||
    toNumber(plan.dailyCheckinCoins) > 0 ||
    toNumber(plan.totalCoins) > 0 ||
    scheduleHasCoins
  );
};

const getPlanDedupeKey = (plan) => {
  if (plan.id) return `id:${plan.id}`;
  return [
    'fallback',
    toKeyText(plan.name),
    toNumber(plan.price),
    toNumber(plan.durationDays),
    toKeyText(plan.type),
  ].join(':');
};

const sanitizePlans = (apiPlans) => {
  const seen = new Set();
  const mappedPlans = apiPlans.map((plan, index) => mapBackendPlan(plan, index));

  return mappedPlans.filter((plan) => {
    if (!hasMeaningfulCoinBenefits(plan)) return false;

    const dedupeKey = getPlanDedupeKey(plan);
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
};

// ----------------------------------------------------
// Day Card Component
// ----------------------------------------------------

const PulsingDayCard = ({ isClaimed, isTodayClaimable, isUnlocked, isLocked, dayReward, index, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isTodayClaimable) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.3);
    }
  }, [isTodayClaimable, pulseAnim]);

  if (isClaimed) {
    return (
      <View style={[styles.dayCard, styles.dayCardClaimed]}>
        <View style={styles.claimedOverlay}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.accentGreen} />
        </View>
        <Text style={styles.dayLabel}>Day {dayReward.day}</Text>
        <Text style={styles.dayCoinsMuted}>+{dayReward.coins}</Text>
      </View>
    );
  }

  if (isLocked) {
    return (
      <Pressable onPress={onPress} style={[styles.dayCard, styles.dayCardLocked]}>
        <View style={styles.lockedOverlay}>
          <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
        </View>
        <Text style={styles.dayLabel}>Day {dayReward.day}</Text>
        <Text style={styles.dayCoinsMuted}>+{dayReward.coins}</Text>
      </Pressable>
    );
  }

  if (isTodayClaimable) {
    return (
      <Pressable onPress={onPress} style={styles.dayCardPressable}>
        <Animated.View style={[styles.dayCardGlow, { opacity: pulseAnim }]} />
        <LinearGradient
          colors={theme.gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dayCardGradientBorder}
        >
          <View style={styles.dayCardToday}>
            <Text style={styles.dayLabelToday}>Day {dayReward.day}</Text>
            <View style={styles.dayCoinsRow}>
              <Ionicons name="diamond" size={10} color={theme.colors.accentGold} style={{ marginRight: 2 }} />
              <Text style={styles.dayCoinsToday}>+{dayReward.coins}</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.dayCard, styles.dayCardUnlocked]}>
      <Text style={styles.dayLabelUnlocked}>Day {dayReward.day}</Text>
      <View style={styles.dayCoinsRow}>
        <Ionicons name="diamond" size={10} color={theme.colors.accentGold} style={{ marginRight: 2 }} />
        <Text style={styles.dayCoinsUnlocked}>+{dayReward.coins}</Text>
      </View>
    </Pressable>
  );
};

export default function VIPPlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vipInfo, setVipInfo] = useState(null);
  const [claimingSubscriptionId, setClaimingSubscriptionId] = useState(null);
  const [buyingId, setBuyingId] = useState(null);
  const [gatewayLoadingPlanId, setGatewayLoadingPlanId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Modals state
  const [gwPick, setGwPick] = useState({ visible: false, plan: null, gateways: [] });
  const [mockPay, setMockPay] = useState({ visible: false, amountInr: 0, purposeLabel: '' });
  const mockPayResolversRef = useRef({ resolve: null, reject: null });
  const scrollRef = useRef(null);

  // Stable social proof active count
  const activeMembersCount = useRef(1420 + (new Date().getDate() * 12)).current;

  const fetchVipStatus = async () => {
    try {
      const res = await vipApi.status();
      setVipInfo(res.data?.data || res.data);
    } catch (e) {
      console.warn('Could not fetch VIP status', e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchVipStatus();
        const res = await vipApi.plans();
        const apiPlans = res.data?.data || res.data || [];

        setPlans(sanitizePlans(apiPlans));
        setActiveIndex(0);
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const confirmMockUi = useCallback(async ({ amountInr, purposeLabel }) => {
    await new Promise((resolve, reject) => {
      mockPayResolversRef.current = { resolve, reject };
      setMockPay({ visible: true, amountInr, purposeLabel });
    });
  }, []);

  const onMockConfirm = useCallback(() => {
    mockPayResolversRef.current?.resolve?.();
    mockPayResolversRef.current = { resolve: null, reject: null };
    setMockPay((s) => ({ ...s, visible: false }));
  }, []);

  const onMockCancel = useCallback(() => {
    const e = new Error('User cancelled mock payment');
    e.code = 'MOCK_USER_CANCELLED';
    mockPayResolversRef.current?.reject?.(e);
    mockPayResolversRef.current = { resolve: null, reject: null };
    setMockPay((s) => ({ ...s, visible: false }));
  }, []);

  const runCheckout = useCallback(async (plan, gateway) => {
    setBuyingId(plan.id);
    try {
      await checkoutAndVerifyVip(plan.id, { phone: user?.phone || '', gateway, confirmMockUi });
    } catch (e) {
      if (!isUserCancelledRazorpay(e)) Alert.alert('Purchase failed', e?.response?.data?.message || e.message || 'Try again');
      return;
    } finally {
      setBuyingId(null);
    }
    try { await loadProfile(); await fetchVipStatus(); } catch {}
    Alert.alert('VIP activated', 'Enjoy your benefits!');
  }, [user, loadProfile, confirmMockUi]);

  const buy = async (plan) => {
    setGatewayLoadingPlanId(plan.id);
    let gateways;
    try { gateways = await fetchPaymentGatewayNames(); } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load payment options');
      setGatewayLoadingPlanId(null);
      return;
    }
    setGatewayLoadingPlanId(null);
    if (gateways.length === 0) return Alert.alert('Error', 'No payment gateways available');
    if (gateways.length === 1) {
      await runCheckout(plan, gateways[0]);
      return;
    }
    setGwPick({ visible: true, plan, gateways });
  };

  const onGatewaySelect = async (gateway) => {
    const plan = gwPick.plan;
    setGwPick({ visible: false, plan: null, gateways: [] });
    if (plan) await runCheckout(plan, gateway);
  };

  const onGatewayCancel = () => setGwPick({ visible: false, plan: null, gateways: [] });

  const handleClaimReward = async (planProgress, dayNumber) => {
    if (!planProgress?.subscriptionId) {
      Alert.alert('VIP', 'This plan is not purchased yet.');
      return;
    }
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      Alert.alert('VIP', 'Invalid day selected.');
      return;
    }
    setClaimingSubscriptionId(planProgress.subscriptionId);
    try {
      const res = await coinsApi.checkinClaim({
        subscriptionId: planProgress.subscriptionId,
        planId: planProgress.planId,
        dayNumber,
      });
      const data = res?.data?.data || {};
      if (!data?.success) {
        Alert.alert('VIP', data?.message || 'Unable to claim reward');
        return;
      }
      Alert.alert('Success', `Claimed ${data?.coins || 0} VIP coins!`);
      await loadProfile();
      await fetchVipStatus();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to claim coins');
    } finally {
      setClaimingSubscriptionId(null);
    }
  };

  const handleScroll = (event) => {
    if (plans.length === 0) return;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < plans.length) {
      setActiveIndex(index);
    }
  };

  if (loading) {
     return (
       <View style={[styles.root, { justifyContent: 'center' }]}>
          <ActivityIndicator color={theme.colors.accentMagenta} size="large" />
       </View>
     );
  }

  const noValidPlans = plans.length === 0;
  const safeActiveIndex = plans.length > 0 ? Math.min(activeIndex, plans.length - 1) : 0;
  const activePlan = plans[safeActiveIndex];
  const plansProgress = Array.isArray(vipInfo?.plansProgress) ? vipInfo.plansProgress : [];
  const resolvePlanProgress = (planId) =>
    plansProgress.find((entry) => String(entry?.planId) === String(planId)) || null;
  const isSubbed = !!vipInfo?.isVip;
  const activePlanProgress = activePlan ? resolvePlanProgress(activePlan.id) : null;
  const isActivePlanPurchased = !!activePlanProgress;
  const discountRate = activePlan?.fakePrice > 0 ? Math.round(((activePlan.fakePrice - activePlan.price) / activePlan.fakePrice) * 100) : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        {isSubbed ? (
          <View style={styles.vipStatusHeader}>
            <View style={styles.vipActiveBadge}>
              <Text style={styles.vipActiveBadgeText}>✦ VIP Active</Text>
            </View>
            <Text style={styles.vipExpiryText}>
              Valid until {vipInfo?.expiryDate ? new Date(vipInfo.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '30 days'}
            </Text>
          </View>
        ) : (
          <Text style={styles.headerTitle}>VIP Membership</Text>
        )}
        <Pressable hitSlop={12}>
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {!noValidPlans ? (
        <>
          {/* TOP TABS */}
          <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {plans.map((p, i) => (
                <Pressable
                  key={p.id}
                  style={styles.tabItem}
                  onPress={() => scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true })}
                >
                  {safeActiveIndex === i ? (
                    <LinearGradient
                      colors={theme.gradients.gold}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeTabGradient}
                    >
                      <Text style={styles.tabTextActive}>{p.name}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveTabContainer}>
                      <Text style={styles.tabText}>{p.name}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* MAIN CONTENT DIST */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ flex: 1 }}
          >
            {plans.map((plan) => (
              <ScrollView key={plan.id} style={{ width: SCREEN_WIDTH }} contentContainerStyle={{ paddingBottom: 120 }}>
                {resolvePlanProgress(plan.id) && (
                 <View style={styles.activeBannerGold}>
                   <Text style={styles.activeBannerTextGold}>
                     ✦ Active · {resolvePlanProgress(plan.id)?.progress?.remainingCheckins || 0} rewards remaining
                   </Text>
                 </View>
                )}

                {/* HERO CARD */}
                <LinearGradient
                  colors={['#1A0A2E', '#0E1A2E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCardGradient}
                >
                  <View style={styles.heroCenterIcon}>
                    <Ionicons name="crown" size={40} color={theme.colors.accentGold} />
                  </View>
                  <Text style={styles.heroPlanName}>{plan.name}</Text>
                  <Text style={styles.heroTotalCoins}>{plan.totalCoins} Coins</Text>
                  
                  <View style={styles.heroPriceContainer}>
                    {plan.fakePrice > 0 && (
                      <Text style={styles.heroFakePrice}>Regular price ≈ ₹{plan.fakePrice}</Text>
                    )}
                    <Text style={styles.heroPrice}>₹{plan.price}</Text>
                  </View>
                  
                  <Text style={styles.socialProofText}>✦ {activeMembersCount.toLocaleString()} members active this month</Text>
                </LinearGradient>

                <Text style={styles.calculationTip}>
                  Normal Recharge ≈ <Ionicons name="diamond" size={12} color={theme.colors.accentGold} /> {plan.price}{'\n'}
                  <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                    {plan.durationDays} Day Card = <Ionicons name="diamond" size={12} color={theme.colors.accentGold} /> {plan.totalCoins} + privileges
                  </Text>
                </Text>

                {/* BENEFITS SUMMARY */}
                <View style={styles.benefitsRow}>
                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBg}>
                      <Ionicons name="star" size={24} color={theme.colors.accentGold} />
                    </View>
                    <Text style={styles.benefitLabel}>Instant</Text>
                    <Text style={styles.benefitValue}>+{plan.instantReward}</Text>
                  </View>
                  
                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBg}>
                      <Ionicons name="calendar" size={24} color={theme.colors.accentGold} />
                    </View>
                    <Text style={styles.benefitLabel}>Daily</Text>
                    <Text style={styles.benefitValue}>+{plan.dailyCheckinCoins}</Text>
                  </View>

                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBg}>
                      <Ionicons name="gift" size={24} color={theme.colors.accentGold} />
                    </View>
                    <Text style={styles.benefitLabel}>Extra</Text>
                    <Text style={styles.benefitValue}>VIP Frame</Text>
                  </View>

                  <View style={styles.benefitBox}>
                    <View style={styles.benefitIconBg}>
                      <Ionicons name="crown" size={24} color={theme.colors.accentGold} />
                    </View>
                    <Text style={styles.benefitLabel}>Privilege</Text>
                    <Text style={styles.benefitValue}>VIP Badge</Text>
                  </View>
                </View>

                {/* SCHEDULE GRID */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>✦ DAILY SCHEDULE</Text>
                </View>

                <View style={styles.scheduleGrid}>
                  {plan.dailyRewards.map((dayReward, idx) => {
                    const planProgress = resolvePlanProgress(plan.id);
                    const isPlanPurchased = !!planProgress;
                    const unlockedDays = isPlanPurchased ? planProgress?.progress?.unlockedDays || 0 : 0;
                    const claimedDayNumbers = Array.isArray(planProgress?.progress?.claimedDayNumbers)
                      ? planProgress.progress.claimedDayNumbers
                      : [];
                    const dayNumber = Number(dayReward?.day || idx + 1);
                    const isClaimed = claimedDayNumbers.includes(dayNumber);
                    const isUnlocked = isPlanPurchased && dayNumber <= unlockedDays;
                    const isTodayClaimable = isUnlocked && !isClaimed;
                    const isLocked = !isClaimed && !isUnlocked;
                    const canPressClaim = isTodayClaimable && !claimingSubscriptionId;
                    
                    return (
                      <PulsingDayCard
                        key={idx}
                        isClaimed={isClaimed}
                        isTodayClaimable={isTodayClaimable}
                        isUnlocked={isUnlocked}
                        isLocked={isLocked}
                        dayReward={dayReward}
                        index={idx}
                        onPress={() => {
                          if (!isPlanPurchased) {
                            Alert.alert('VIP', 'Buy this plan to unlock its daily check-ins.');
                            return;
                          }
                          if (isClaimed) {
                            Alert.alert('VIP', 'This day is already claimed.');
                            return;
                          }
                          if (isLocked) {
                            Alert.alert('VIP', 'This day is not unlocked yet.');
                            return;
                          }
                          if (!canPressClaim) return;
                          handleClaimReward(planProgress, dayNumber);
                        }}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            ))}
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="information-circle-outline" size={30} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No valid VIP plans available</Text>
          <Text style={styles.emptyStateBody}>
            Plans will appear here after valid rewards and schedules are published.
          </Text>
        </View>
      )}

      {/* BOTTOM ACTION CTA */}
      {!noValidPlans && activePlan && (
        <View style={[styles.bottomCTA, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {isSubbed && isActivePlanPurchased ? (
            <View style={styles.ctaButtonDisabled}>
              <Text style={styles.ctaTextDisabled}>✓ Plan Active</Text>
            </View>
          ) : (
             <Pressable 
               onPress={() => buy(activePlan)}
               disabled={!!buyingId || !!gatewayLoadingPlanId}
               style={styles.ctaPressable}
             >
               <LinearGradient
                 colors={theme.gradients.gold}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 0 }}
                 style={styles.ctaButton}
               >
                  {discountRate > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discountRate}% OFF</Text>
                    </View>
                  )}
                  <View style={styles.ctaContentRow}>
                    <Text style={styles.ctaPrice}>
                      {gatewayLoadingPlanId === activePlan.id ? 'Loading...' : `Activate VIP · ₹${activePlan.price.toFixed(2)}`}
                    </Text>
                    {activePlan.fakePrice > 0 && (
                      <Text style={styles.ctaFakePrice}>₹{activePlan.fakePrice}</Text>
                    )}
                  </View>
               </LinearGradient>
             </Pressable>
          )}
        </View>
      )}

      {/* PORTALS */}
      <PaymentGatewayPickModal
        visible={gwPick.visible}
        gateways={gwPick.gateways}
        plan={gwPick.plan}
        onSelect={onGatewaySelect}
        onCancel={onGatewayCancel}
      />
      <MockPayConfirmModal
        visible={mockPay.visible}
        amountInr={mockPay.amountInr}
        purposeLabel={mockPay.purposeLabel}
        onConfirm={onMockConfirm}
        onCancel={onMockCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
  },
  vipStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vipActiveBadge: {
    backgroundColor: theme.colors.accentGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  vipActiveBadgeText: {
    color: '#3A2E00',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  vipExpiryText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 4,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  activeTabGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
  },
  tabTextActive: {
    color: '#3A2E00',
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  heroCardGradient: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 75,
  },
  heroCenterIcon: {
    marginBottom: 12,
  },
  heroPlanName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.accentGoldLight,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: theme.typography.fontDisplay,
    marginBottom: 6,
  },
  heroTotalCoins: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontDisplay,
    marginBottom: 12,
  },
  heroPriceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroFakePrice: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
    fontFamily: theme.typography.fontBody,
    marginBottom: 4,
  },
  heroPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.accentGold,
    fontFamily: theme.typography.fontBody,
  },
  socialProofText: {
    fontSize: 12,
    color: theme.colors.accentGold,
    fontWeight: '700',
    fontFamily: theme.typography.fontDisplay,
    textAlign: 'center',
    marginTop: 8,
  },
  calculationTip: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 18,
    fontFamily: theme.typography.fontBody,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  benefitBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  benefitIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  benefitLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  benefitValue: {
    color: theme.colors.accentGold,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontDisplay,
    letterSpacing: 1.2,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    rowGap: 12,
    columnGap: 12,
    justifyContent: 'flex-start'
  },
  dayCardPressable: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    height: 64,
    position: 'relative',
  },
  dayCardGlow: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.accentGold,
    borderRadius: 14,
    transform: [{ scale: 1.05 }],
  },
  dayCardGradientBorder: {
    flex: 1,
    borderRadius: 14,
    padding: 1.5,
  },
  dayCardToday: {
    flex: 1,
    backgroundColor: '#161625',
    borderRadius: 12.5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    height: 64,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  dayCardClaimed: {
    backgroundColor: 'rgba(45, 255, 147, 0.04)',
    borderColor: 'rgba(45, 255, 147, 0.2)',
  },
  dayCardLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    opacity: 0.6,
  },
  dayCardUnlocked: {
    backgroundColor: 'rgba(201, 168, 76, 0.05)',
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
    marginBottom: 4,
  },
  dayLabelToday: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accentGoldLight,
    fontFamily: theme.typography.fontBody,
    marginBottom: 4,
  },
  dayLabelUnlocked: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontBody,
    marginBottom: 4,
  },
  dayCoinsMuted: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontDisplay,
  },
  dayCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayCoinsToday: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accentGold,
    fontFamily: theme.typography.fontDisplay,
  },
  dayCoinsUnlocked: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accentGoldLight,
    fontFamily: theme.typography.fontDisplay,
  },
  claimedOverlay: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 5,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyStateTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: theme.typography.fontDisplay,
  },
  emptyStateBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.typography.fontBody,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0, right: 0,
    backgroundColor: theme.colors.bgPrimary,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
  },
  ctaPressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    flexDirection: 'row',
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3A2E00',
    fontFamily: theme.typography.fontBody,
  },
  ctaFakePrice: {
    fontSize: 13,
    color: 'rgba(58, 46, 0, 0.6)',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
    marginLeft: 8,
  },
  ctaButtonDisabled: {
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextDisabled: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
  },
  discountBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.bgPrimary,
    zIndex: 20,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  activeBannerGold: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: -8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBannerTextGold: {
    color: theme.colors.accentGoldLight,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
});
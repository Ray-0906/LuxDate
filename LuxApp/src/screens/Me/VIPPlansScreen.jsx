import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, Dimensions,
  ImageBackground, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

  const handleClaimReward = async (planProgress) => {
    if (!planProgress?.subscriptionId) {
      Alert.alert('VIP', 'This plan is not purchased yet.');
      return;
    }
    if (!planProgress?.canClaimToday) {
      Alert.alert('VIP', 'Today reward is already claimed for this plan.');
      return;
    }
    setClaimingSubscriptionId(planProgress.subscriptionId);
    try {
      const res = await coinsApi.checkinClaim({
        subscriptionId: planProgress.subscriptionId,
        planId: planProgress.planId,
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
        <Text style={styles.headerTitle}>{activePlan?.name || 'VIP Membership'}</Text>
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
                  <Text style={[styles.tabText, safeActiveIndex === i && styles.tabTextActive]}>{p.name}</Text>
                  {safeActiveIndex === i && <View style={styles.tabIndicator} />}
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
              <ScrollView key={plan.id} style={{ width: SCREEN_WIDTH }} contentContainerStyle={{ paddingBottom: 100 }}>
                {resolvePlanProgress(plan.id) && (
                 <View style={styles.activeBanner}>
                   <Ionicons name="star" size={20} color={theme.colors.accentYellow} />
                   <Text style={styles.activeBannerText}>
                     Plan Purchased ({resolvePlanProgress(plan.id)?.progress?.remainingCheckins || 0} claims left)
                   </Text>
                 </View>
                )}
                {/* HERO CARD */}
                <View style={[styles.heroCard, { backgroundColor: plan.theme[0] }]}>
                <View style={styles.heroGlow} />
                <View style={styles.heroContent}>
                   <View>
                     <Text style={styles.heroTitle}>{plan.name}</Text>
                     <View style={styles.heroGetContainer}>
                        <Text style={styles.heroGetText}>Get</Text>
                        <Ionicons name="diamond" size={16} color="#FFD700" style={{ marginHorizontal: 4 }} />
                        <Text style={styles.heroGetAmount}>{plan.totalCoins}</Text>
                     </View>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                       <Text style={styles.heroByText}>by paying</Text>
                       <Ionicons name="diamond" size={12} color="#FFD700" style={{ marginHorizontal: 4 }} />
                       <Text style={styles.heroByAmount}>{plan.price} price</Text>
                     </View>
                   </View>
                   <View style={styles.cardImagePlaceholder}>
                      <Ionicons name="card" size={48} color="#FFD700" />
                   </View>
                </View>
                
                <View style={styles.timerContainer}>
                   <Text style={styles.timerText}>11</Text><Text style={styles.timerSep}>:</Text>
                   <Text style={styles.timerText}>30</Text><Text style={styles.timerSep}>:</Text>
                   <Text style={styles.timerText}>17</Text><Text style={styles.timerSep}>:</Text>
                   <Text style={styles.timerText}>52</Text>
                </View>
             </View>

             <Text style={styles.calculationTip}>
               Normal Recharge ≈ <Ionicons name="diamond" size={12} color="#FFD700" /> {plan.price}{'\n'}
               <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                 {plan.durationDays} Day Card = <Ionicons name="diamond" size={12} color="#FFD700" /> {plan.totalCoins} + privileges
               </Text>
             </Text>

             {/* BENEFITS SUMMARY */}
             <View style={styles.benefitsRow}>
               <View style={styles.benefitBox}>
                 <Text style={styles.benefitLabel}>Instant Reward</Text>
                 <View style={styles.benefitIconBg}>
                    <Ionicons name="gift-outline" size={32} color="#FFD700" />
                 </View>
                 <Text style={styles.benefitValue}>{plan.instantReward}</Text>
               </View>
               <Text style={styles.plus}>+</Text>
               <View style={styles.benefitBox}>
                 <Text style={styles.benefitLabel}>Daily Check-in ({plan.durationDays}d)</Text>
                 <View style={styles.benefitIconBg}>
                    <Ionicons name="calendar-outline" size={32} color="#FFD700" />
                 </View>
                 <Text style={styles.benefitValue}>{plan.dailyCheckinCoins}</Text>
               </View>
               <Text style={styles.plus}>+</Text>
               <View style={styles.benefitBox}>
                 <Text style={styles.benefitLabel}>Extra Reward</Text>
                 <View style={styles.benefitIconBg}>
                    <Ionicons name="diamond-outline" size={32} color="#FFD700" />
                 </View>
                 <Text style={styles.benefitValue}>VIP Frame</Text>
               </View>
             </View>

             {/* SCHEDULE GRID */}
             <View style={styles.scheduleHeader}>
               <View style={styles.lineFade} />
               <Text style={styles.scheduleTitle}>Get schedule</Text>
               <View style={styles.lineFade} />
             </View>

             <View style={styles.scheduleGrid}>
                 {plan.dailyRewards.map((dayReward, index) => {
                   const planProgress = resolvePlanProgress(plan.id);
                   const isPlanPurchased = !!planProgress;
                   const claimedDays = isPlanPurchased ? planProgress?.progress?.daysClaimed || 0 : 0;
                   const unlockedDays = isPlanPurchased
                     ? Math.max(claimedDays, planProgress?.progress?.unlockedDays || 0)
                     : 0;
                   const isClaimed = index < claimedDays;
                   const isUnlocked = isPlanPurchased && index < unlockedDays;
                   const isTodayClaimable = isUnlocked && index === claimedDays && !!planProgress?.canClaimToday;
                   const isLocked = !isClaimed && !isUnlocked;
                   const canPressClaim =
                     isTodayClaimable &&
                     !claimingSubscriptionId;
                   
                   return (
                   <Pressable 
                     key={index} 
                     style={[
                       styles.dayCard, 
                       isClaimed && styles.dayCardClaimed,
                       isTodayClaimable && styles.dayCardToday,
                       isUnlocked && !isClaimed && styles.dayCardUnlocked,
                       isLocked && styles.dayCardLocked
                     ]}
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
                       if (!planProgress?.canClaimToday) {
                         Alert.alert('VIP', 'Today reward for this plan is already claimed.');
                         return;
                       }
                       if (!canPressClaim) return;
                       handleClaimReward(planProgress);
                     }}
                   >
                     {isClaimed && (
                        <View style={styles.claimedOverlay}>
                           <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                        </View>
                     )}
                     {isLocked && (
                        <View style={styles.lockedOverlay}>
                          <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
                        </View>
                     )}
                     <Text style={[styles.dayLabel, (isClaimed || isTodayClaimable) && { color: theme.colors.textPrimary }]}>{dayReward.day}{dayReward.day === 1 ? 'st' : dayReward.day === 2 ? 'nd' : dayReward.day === 3 ? 'rd' : 'th'}</Text>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                       <Ionicons name="diamond" size={14} color="#FFD700" />
                       <Text style={styles.dayCoins}>x{dayReward.coins}</Text>
                     </View>
                   </Pressable>
                 )})}
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
            <View style={[styles.ctaButton, { backgroundColor: theme.colors.success }]}>
              <Text style={[styles.ctaPrice, { fontSize: 18, color: '#fff', marginRight: 0 }]}>
                Purchased
              </Text>
            </View>
          ) : (
             <Pressable 
               style={styles.ctaButton} 
               onPress={() => buy(activePlan)}
               disabled={!!buyingId || !!gatewayLoadingPlanId}
             >
                {discountRate > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{discountRate}% OFF</Text>
                  </View>
                )}
               <Text style={styles.ctaPrice}>
                 {gatewayLoadingPlanId === activePlan.id ? 'Loading payment methods...' : `₹${activePlan.price.toFixed(2)}`}
               </Text>
                {activePlan.fakePrice > 0 && <Text style={styles.ctaFakePrice}>₹{activePlan.fakePrice}</Text>}
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabScroll: {
    paddingHorizontal: 10,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    width: 20,
    height: 3,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 2,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: -5,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  activeBannerText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  heroCard: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 75,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  heroGetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroGetText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  heroGetAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD700',
  },
  heroByText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  heroByAmount: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  cardImagePlaceholder: {
    width: 70, height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)'
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerSep: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  calculationTip: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 20,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  benefitBox: {
    alignItems: 'center',
    flex: 1,
  },
  benefitIconBg: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  benefitLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  benefitValue: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  plus: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: 10,
    marginTop: 10,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  lineFade: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderGlass,
  },
  scheduleTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    rowGap: 12,
    columnGap: 12,
    justifyContent: 'flex-start'
  },
  dayCard: {
    width: (SCREEN_WIDTH - 32 - 36) / 4,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    overflow: 'hidden',
  },
  dayCardClaimed: {
    opacity: 0.6,
    borderColor: theme.colors.success,
  },
  dayCardToday: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  dayCardUnlocked: {
    borderColor: 'rgba(255, 215, 0, 0.45)',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  dayCardLocked: {
    opacity: 0.85,
  },
  claimedOverlay: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  dayLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-start'
  },
  dayCoins: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
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
  },
  emptyStateBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  ctaButton: {
    backgroundColor: '#e6e6e6',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  ctaPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginRight: 8,
  },
  ctaFakePrice: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountBadge: {
    position: 'absolute',
    top: -14,
    right: '15%',
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.bgPrimary,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  }
});
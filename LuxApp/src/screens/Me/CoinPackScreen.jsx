// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../theme/theme.js';
import { coinsApi } from '../../api/services.js';
import useAuthStore from '../../store/authStore.js';
import {
  checkoutAndVerifyCoinPack,
  fetchPaymentGatewayNames,
  isUserCancelledRazorpay,
} from '../../payments/runPayments.js';
import MockPayConfirmModal from '../../components/MockPayConfirmModal.jsx';

export default function CoinPackScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  
  // Step state for single modal
  const [step, setStep] = useState('packages'); // 'packages' | 'gateways'
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [loadingGateways, setLoadingGateways] = useState(false);

  // Still keeping mock pay confirm separate for security pin etc
  const [mockPay, setMockPay] = useState({ visible: false, amountInr: 0, purposeLabel: '' });
  const [selectedPackId, setSelectedPackId] = useState(null);
  const mockPayResolversRef = useRef({ resolve: null, reject: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coinsApi.packs({ context: 'wallet' });
      const list = res.data?.data ?? res.data ?? [];
      const filtered = (Array.isArray(list) ? list : []).filter((p) => p?._id && !String(p._id).startsWith('legacy'));
      setPacks(filtered);
      
      const routePackId = route.params?.selectedPackId;
      if (routePackId && filtered.some(p => String(p._id) === String(routePackId))) {
        setSelectedPackId(routePackId);
      } else if (filtered.length > 0) {
        setSelectedPackId(filtered[0]._id);
      }
    } catch {
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, [route.params?.selectedPackId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const runCheckout = useCallback(
    async (pack, gateway) => {
      setBuyingId(pack._id);
      try {
        await checkoutAndVerifyCoinPack(pack._id, {
          phone: user?.phone || '',
          gateway,
          confirmMockUi,
        });
      } catch (e) {
        if (!isUserCancelledRazorpay(e)) {
          Alert.alert('Payment failed', e?.response?.data?.message || e.message || 'Try again');
        }
        return;
      } finally {
        // #region agent log
        fetch('http://127.0.0.1:7800/ingest/b0692f4a-68ed-4309-8de8-e990dc865839', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a0d528' },
          body: JSON.stringify({
            sessionId: 'a0d528',
            hypothesisId: 'H3',
            location: 'CoinPackScreen.jsx:runCheckout.finally',
            message: 'coin row spinner cleared',
            data: { packId: String(pack._id) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        setBuyingId(null);
      }
      try {
        await loadProfile();
      } catch {
        /* balance refresh optional */
      }
      Alert.alert('Success', 'Coins added to your wallet');
    },
    [user?.phone, loadProfile, confirmMockUi]
  );

  const handleBuy = async (pack) => {
    let fetchedGateways;
    setLoadingGateways(true);
    setBuyingId(pack._id);
    try {
      fetchedGateways = await fetchPaymentGatewayNames();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load payment options');
      return;
    } finally {
      setLoadingGateways(false);
      setBuyingId(null);
    }
    if (fetchedGateways.length === 0) {
      Alert.alert('Error', 'No payment gateways available');
      return;
    }
    if (fetchedGateways.length === 1) {
      await runCheckout(pack, fetchedGateways[0]);
      return;
    }
    setGateways(fetchedGateways);
    setSelectedGateway(fetchedGateways[0]);
    setStep('gateways');
  };

  const onHandleBack = () => {
    if (step === 'gateways') {
      setStep('packages');
    } else {
      navigation.goBack();
    }
  };

  const selectedPack = packs.find((p) => p._id === selectedPackId);

  return (
    <View style={styles.root}>
      <Pressable style={styles.overlay} onPress={onHandleBack} />
      <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.dragHandle} />
        
        <View style={styles.header}>
          {step === 'gateways' ? (
            <Pressable onPress={onHandleBack} hitSlop={12} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 32 }} />
          )}

          <View style={styles.titleArea}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {step === 'packages' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>
              {step === 'packages' ? 'Get More Coins' : 'Select Payment'}
            </Text>
          </View>

          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <Text style={styles.sub}>
          {step === 'packages' ? 'Fuel your connections.' : 'Select your preferred gateway.'}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accentMagenta} size="large" />
          </View>
        ) : (
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {step === 'packages' ? (
              <View style={styles.gridContainer}>
                {packs.map((item) => {
                  const isSelected = selectedPackId === item._id;
                  const discount = item.bonusCoins ? Math.round((item.bonusCoins / item.coins) * 100) : 0;
                  return (
                    <Pressable
                      key={item._id}
                      style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                      onPress={() => setSelectedPackId(item._id)}
                    >
                      {!!discount && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{discount}% OFF</Text>
                        </View>
                      )}
                      
                      {isSelected && (
                        <View style={styles.checkIndicator}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.accentMagenta} />
                        </View>
                      )}

                      <View style={styles.packIconWrap}>
                        <Ionicons name="diamond" size={28} color={theme.colors.accentGold} />
                      </View>
                      
                      <Text style={styles.gridItemCoins}>
                        {item.coins}
                      </Text>
                      
                      <View style={[styles.pricePill, isSelected && styles.pricePillSelected]}>
                        <Text style={styles.gridItemPrice}>
                          ₹{item.priceInr.toFixed(2)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {packs.length === 0 && (
                  <Text style={styles.empty}>No packs available. Try again later.</Text>
                )}
              </View>
            ) : (
              <View style={styles.paymentContainer}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCoinsWrap}>
                    <Ionicons name="diamond" size={20} color={theme.colors.accentGold} />
                    <Text style={styles.summaryCoinsText}>{selectedPack?.coins} Coins</Text>
                  </View>
                  <Text style={styles.summaryPriceText}>₹{selectedPack?.priceInr.toFixed(2)}</Text>
                </View>

                <View style={styles.gatewaysList}>
                  {gateways.map(gw => {
                    const isSelected = selectedGateway === gw;
                    return (
                      <Pressable 
                        key={gw} 
                        style={[styles.gatewayRow, isSelected && styles.gatewayRowActive]}
                        onPress={() => setSelectedGateway(gw)}
                      >
                        <View style={styles.gatewayInfo}>
                          <View style={styles.gatewayIcon}>
                            <Ionicons name="card-outline" size={20} color={theme.colors.textSecondary} />
                          </View>
                          <Text style={styles.gatewayName}>{gw === 'mock' ? 'Test Pay (no real charge)' : gw}</Text>
                        </View>
                        <View style={[styles.radioBorder, isSelected && styles.radioBorderActive]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {!loading && packs.length > 0 && (
          <View style={styles.footer}>
            {step === 'packages' && (
              <View style={styles.footerInfo}>
                <Ionicons name="diamond" size={16} color={theme.colors.accentGold} style={{ marginRight: 6 }} />
                <Text style={styles.balance}>{user?.coinBalance ?? 0} coins in your wallet</Text>
              </View>
            )}
            
            <Pressable 
              onPress={() => {
                const pack = packs.find(p => p._id === selectedPackId);
                if (step === 'packages') {
                  if (pack) handleBuy(pack);
                } else {
                  if (pack && selectedGateway) runCheckout(pack, selectedGateway);
                }
              }} 
              disabled={(step === 'packages' ? !selectedPackId : !selectedGateway) || !!buyingId} 
              style={styles.continueBtnWrapper}
            >
              <LinearGradient
                colors={((step === 'packages' ? !selectedPackId : !selectedGateway) || !!buyingId) ? ['rgba(233,30,140,0.4)', 'rgba(124,58,237,0.4)'] : theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>
                  {loadingGateways ? 'Loading payment methods...' : buyingId ? 'Processing...' : step === 'packages' ? 'Continue' : 'Complete Payment'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

      </View>

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
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: theme.colors.bgSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 32,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  titleArea: {
    alignItems: 'center',
  },
  stepBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  stepBadgeText: {
    color: theme.colors.accentCyan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
  },
  sub: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  gridItemSelected: {
    backgroundColor: 'rgba(233, 30, 140, 0.08)',
    borderColor: theme.colors.accentMagenta,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: theme.colors.accentMagenta,
    borderBottomRightRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  packIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridItemCoins: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
  },
  pricePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  pricePillSelected: {
    backgroundColor: 'rgba(233, 30, 140, 0.15)',
  },
  gridItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  empty: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    width: '100%',
    padding: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  balance: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  continueBtnWrapper: {
    width: '100%',
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Gateway Styles
  paymentContainer: {
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryCoinsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCoinsText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
    fontFamily: theme.typography.fontDisplay,
  },
  summaryPriceText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  gatewaysList: {
    gap: 12,
  },
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gatewayRowActive: {
    borderColor: theme.colors.accentMagenta,
  },
  gatewayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gatewayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gatewayName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  radioBorder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioBorderActive: {
    borderColor: theme.colors.accentMagenta,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accentMagenta,
  }
});

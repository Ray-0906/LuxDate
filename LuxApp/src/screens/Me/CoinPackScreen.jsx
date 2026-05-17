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
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { coinsApi } from '../../api/services.js';
import useAuthStore from '../../store/authStore.js';
import {
  checkoutAndVerifyCoinPack,
  fetchPaymentGatewayNames,
  isUserCancelledRazorpay,
} from '../../payments/runPayments.js';
import PaymentGatewayPickModal from '../../components/PaymentGatewayPickModal.jsx';
import MockPayConfirmModal from '../../components/MockPayConfirmModal.jsx';

export default function CoinPackScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
      if (filtered.length > 0) {
        setSelectedPackId(filtered[0]._id);
      }
    } catch {
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <View style={styles.root}>
      <Pressable style={styles.overlay} onPress={onHandleBack} />
      <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.dragHandle} />
        
        <View style={styles.header}>
          {step === 'gateways' ? (
            <Pressable onPress={onHandleBack} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
          <Text style={styles.headerTitle}>Make video calls with Coins</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={26} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        {step === 'packages' && <Text style={styles.sub}>Call beauties with Coins</Text>}

      {loading ? (
        <ActivityIndicator color={theme.colors.accentMagenta} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
                        <Text style={styles.badgeText}>{discount}% off</Text>
                      </View>
                    )}
                    <Ionicons name="diamond" size={32} color={theme.colors.accentMagenta} style={styles.iconSpaced} />
                    <Text style={[styles.gridItemCoins, isSelected && styles.textSelected]}>
                      {item.coins}
                    </Text>
                    <View style={[styles.pricePill, isSelected && styles.pricePillSelected]}>
                      <Text style={[styles.gridItemPrice, isSelected && styles.textSelected]}>
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
                  <Ionicons name="diamond" size={24} color={theme.colors.accentMagenta} />
                  <Text style={styles.summaryCoinsText}>{packs.find(p=>p._id === selectedPackId)?.coins}</Text>
                </View>
                <Text style={styles.summaryPriceText}>₹{packs.find(p=>p._id === selectedPackId)?.priceInr.toFixed(2)}</Text>
              </View>

              <View style={styles.gatewaysList}>
                {gateways.map(gw => (
                  <Pressable 
                    key={gw} 
                    style={styles.gatewayRow}
                    onPress={() => setSelectedGateway(gw)}
                  >
                    <View style={styles.gatewayInfo}>
                      <View style={styles.gatewayIcon}>
                        <Ionicons name="card-outline" size={20} color={theme.colors.textSecondary} />
                      </View>
                      <Text style={styles.gatewayName}>{gw === 'mock' ? 'Test pay (mock — no real charge)' : gw}</Text>
                    </View>
                    <View style={styles.radioBorder}>
                      {selectedGateway === gw && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {!loading && packs.length > 0 && (
        <View style={styles.footer}>
           {step === 'packages' && (
             <View style={styles.footerInfo}>
               <Ionicons name="diamond" size={16} color={theme.colors.accentMagenta} />
               <Text style={styles.balance}> My Coins: {user?.coinBalance ?? 0}</Text>
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
             style={[styles.continueBtn, ((step === 'packages' ? !selectedPackId : !selectedGateway) || !!buyingId) && styles.continueBtnDisabled]}
           >
             <Text style={styles.continueBtnText}>
               {loadingGateways ? 'Loading payment methods...' : buyingId ? 'Processing...' : 'Continue'}
             </Text>
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
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: theme.colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.borderGlass,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  sub: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 24 },
  scrollContent: {
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  gridItemSelected: {
    backgroundColor: 'rgba(224, 60, 160, 0.15)', // magenta tint
    borderColor: theme.colors.accentMagenta,
  },
  badge: {
    position: 'absolute',
    top: 0, left: 0,
    backgroundColor: theme.colors.accentMagenta,
    borderBottomRightRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  iconSpaced: {
    marginBottom: 6,
  },
  gridItemCoins: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  pricePill: {
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pricePillSelected: {
    backgroundColor: theme.colors.bgPrimary,
  },
  gridItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  textSelected: {
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
    marginBottom: 16,
  },
  balance: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' },
  continueBtn: {
    backgroundColor: theme.colors.accentMagenta,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Gateway Styles
  paymentContainer: {
    marginTop: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
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
  },
  summaryPriceText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  gatewaysList: {
    gap: 16,
  },
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGlass,
  },
  gatewayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gatewayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    borderColor: theme.colors.accentMagenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.accentMagenta,
  }
});

// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme/theme.js';
import { coinsApi } from '../api/services.js';
import useAuthStore from '../store/authStore.js';
import {
  checkoutAndVerifyCoinPack,
  fetchPaymentGatewayNames,
  isUserCancelledRazorpay,
} from '../payments/runPayments.js';
import PaymentGatewayPickModal from './PaymentGatewayPickModal.jsx';
import MockPayConfirmModal from './MockPayConfirmModal.jsx';

/**
 * Bottom-sheet style coin packs (no VIP). context: call | gift | wallet
 */
export default function CoinPackSheet({
  visible,
  onClose,
  context = 'wallet',
  requiredCoins = 0,
  onSuccess,
}) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);

  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [gwPick, setGwPick] = useState({ visible: false, pack: null, gateways: [] });
  const [mockPay, setMockPay] = useState({ visible: false, amountInr: 0, purposeLabel: '' });
  const mockPayResolversRef = useRef({ resolve: null, reject: null });

  const [selectedPackId, setSelectedPackId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coinsApi.packs({ context });
      const list = res.data?.data ?? res.data ?? [];
      const filtered = (Array.isArray(list) ? list : []).filter(
        (p) => p?._id && !String(p._id).startsWith('legacy')
      );
      setPacks(filtered);
      if (filtered.length > 0) {
        setSelectedPackId(filtered[0]._id);
      }
    } catch (e) {
      console.warn('packs load', e);
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

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

  /** Called after user picks gateway from modal (sheet path). */
  const runCheckoutWithGateway = useCallback(
    async (pack, gateway) => {
      const id = pack._id;
      setBuyingId(id);
      try {
        const phone = user?.phone || '';
        await checkoutAndVerifyCoinPack(id, {
          phone,
          gateway,
          confirmMockUi,
        });
        await loadProfile();
        onSuccess?.();
        onClose?.();
      } catch (e) {
        if (isUserCancelledRazorpay(e)) {
          return;
        }
        Alert.alert('Payment failed', e?.response?.data?.message || e.message || 'Try again');
      } finally {
        setBuyingId(null);
      }
    },
    [user?.phone, loadProfile, onSuccess, onClose, confirmMockUi]
  );

  const handleBuy = async (pack) => {
    let gateways;
    try {
      gateways = await fetchPaymentGatewayNames();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not load payment options');
      return;
    }
    if (gateways.length === 0) {
      Alert.alert('Error', 'No payment gateways available');
      return;
    }
    setGwPick({ visible: true, pack, gateways });
  };

  const onGatewaySelect = async (gateway) => {
    const pack = gwPick.pack;
    setGwPick({ visible: false, pack: null, gateways: [] });
    if (pack) await runCheckoutWithGateway(pack, gateway);
  };

  const onGatewayCancel = () => {
    setGwPick({ visible: false, pack: null, gateways: [] });
  };

  const shortfall = requiredCoins > 0 ? Math.max(0, requiredCoins - (user?.coinBalance || 0)) : 0;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable 
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]} 
            onPress={(ev) => ev.stopPropagation?.()}
          >
            {/* Top Drag Handle */}
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <View style={styles.titleArea}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>STEP 1 OF 2</Text>
                </View>
                <Text style={styles.headerTitle}>Get More Coins</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.sub}>Fuel your connections.</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.accentMagenta} size="large" />
              </View>
            ) : (
              <>
                <ScrollView 
                  style={styles.scrollContent} 
                  contentContainerStyle={styles.scrollContainer}
                  showsVerticalScrollIndicator={false}
                >
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
                </ScrollView>

                <View style={styles.footer}>
                  <View style={styles.footerInfo}>
                    <Ionicons name="diamond" size={16} color={theme.colors.accentGold} style={{ marginRight: 6 }} />
                    <Text style={styles.balance}>{user?.coinBalance ?? 0} coins in your wallet</Text>
                  </View>
                  
                  {shortfall > 0 ? (
                    <Text style={styles.shortfall}>Need {shortfall} more coins for this action</Text>
                  ) : null}

                  <Pressable 
                    style={[styles.continueBtnWrapper, (!selectedPackId || !!buyingId) && styles.continueBtnDisabled]}
                    onPress={() => {
                      const pack = packs.find(p => p._id === selectedPackId);
                      if (pack) handleBuy(pack);
                    }}
                    disabled={!selectedPackId || !!buyingId}
                  >
                    <LinearGradient
                      colors={(!selectedPackId || !!buyingId) ? ['rgba(233,30,140,0.4)', 'rgba(124,58,237,0.4)'] : theme.gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.continueBtn}
                    >
                      <Text style={styles.continueBtnText}>
                        {buyingId ? 'Processing...' : 'Continue'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <PaymentGatewayPickModal
        visible={gwPick.visible}
        gateways={gwPick.gateways}
        pack={gwPick.pack}
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
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.bgSecondary, // Dark Navy #0E0E1A
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 32,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  titleArea: {
    flexDirection: 'column',
  },
  stepBadge: {
    alignSelf: 'flex-start',
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
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  sub: {
    paddingHorizontal: 20,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    fontFamily: theme.typography.fontBody,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    maxHeight: 340,
  },
  scrollContainer: {
    paddingBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: theme.colors.bgTertiary, // Elevated Dark #161625
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
    fontFamily: theme.typography.fontBody,
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
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
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
    fontFamily: theme.typography.fontBody,
  },
  empty: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    width: '100%',
    padding: 20,
    fontFamily: theme.typography.fontBody,
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
    fontFamily: theme.typography.fontBody,
  },
  shortfall: {
    alignSelf: 'center',
    marginTop: -4,
    marginBottom: 12,
    color: theme.colors.accentRed,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: theme.typography.fontBody,
  },
  continueBtnWrapper: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
});

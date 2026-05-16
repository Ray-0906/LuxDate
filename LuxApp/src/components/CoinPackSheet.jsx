import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(ev) => ev.stopPropagation?.()}>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </Pressable>
            
            <View style={styles.headerCentered}>
              <Text style={styles.title}>Make video calls with Coins</Text>
              <Text style={styles.subtitle}>Call beauties with Coins</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={theme.colors.accentMagenta} style={{ marginVertical: 40 }} />
            ) : (
              <>
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

                <View style={styles.footerInfo}>
                  <Ionicons name="diamond" size={16} color={theme.colors.accentMagenta} />
                  <Text style={styles.balance}> My Coins: {user?.coinBalance ?? 0}</Text>
                </View>
                {shortfall > 0 ? (
                  <Text style={styles.shortfall}>Need {shortfall} more coins for this action</Text>
                ) : null}

                <Pressable 
                  style={[styles.continueBtn, (!selectedPackId || !!buyingId) && styles.continueBtnDisabled]}
                  onPress={() => {
                    const pack = packs.find(p => p._id === selectedPackId);
                    if (pack) handleBuy(pack);
                  }}
                  disabled={!selectedPackId || !!buyingId}
                >
                  <Text style={styles.continueBtnText}>{buyingId ? `Loading...` : `Continue`}</Text>
                </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '90%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: -20,
    zIndex: 10,
  },
  headerCentered: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500' },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 10,
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
    backgroundColor: 'rgba(224, 60, 160, 0.15)',
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
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  balance: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' },
  shortfall: { alignSelf: 'center', marginTop: -4, marginBottom: 12, color: theme.colors.accentRed, fontWeight: '600', fontSize: 13 },
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
  }
});

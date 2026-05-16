import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { vipApi } from '../../api/services.js';
import useAuthStore from '../../store/authStore.js';
import {
  checkoutAndVerifyVip,
  fetchPaymentGatewayNames,
  isUserCancelledRazorpay,
} from '../../payments/runPayments.js';
import PaymentGatewayPickModal from '../../components/PaymentGatewayPickModal.jsx';
import MockPayConfirmModal from '../../components/MockPayConfirmModal.jsx';

export default function VIPPlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [gwPick, setGwPick] = useState({ visible: false, plan: null, gateways: [] });
  const [mockPay, setMockPay] = useState({ visible: false, amountInr: 0, purposeLabel: '' });
  const mockPayResolversRef = useRef({ resolve: null, reject: null });

  useEffect(() => {
    (async () => {
      try {
        const res = await vipApi.plans();
        setPlans(res.data?.data || res.data || []);
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

  const runCheckout = useCallback(
    async (plan, gateway) => {
      setBuyingId(plan._id);
      try {
        await checkoutAndVerifyVip(plan._id, {
          phone: user?.phone || '',
          gateway,
          confirmMockUi,
        });
      } catch (e) {
        if (!isUserCancelledRazorpay(e)) {
          Alert.alert('Purchase failed', e?.response?.data?.message || e.message || 'Try again');
        }
        return;
      } finally {
        setBuyingId(null);
      }
      try {
        await loadProfile();
      } catch {
        /* optional */
      }
      Alert.alert('VIP activated', 'Enjoy your benefits!');
    },
    [user?.phone, loadProfile, confirmMockUi]
  );

  const buy = async (plan) => {
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
    setGwPick({ visible: true, plan, gateways });
  };

  const onGatewaySelect = async (gateway) => {
    const plan = gwPick.plan;
    setGwPick({ visible: false, plan: null, gateways: [] });
    if (plan) await runCheckout(plan, gateway);
  };

  const onGatewayCancel = () => {
    setGwPick({ visible: false, plan: null, gateways: [] });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>VIP plans</Text>
        <View style={{ width: 26 }} />
      </View>
      <Text style={styles.sub}>Profile-only upgrades — not shown during calls.</Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.accentViolet} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.durationDays} days · ₹{item.price} · {item.upfrontCoins ?? 0} coins upfront
              </Text>
              <Text style={styles.meta}>
                Then {item.dailyCheckinCoins ?? 0} coins / day check-in
              </Text>
              <Pressable
                style={styles.btn}
                onPress={() => buy(item)}
                disabled={!!buyingId}
              >
                {buyingId === item._id ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.btnText}>Subscribe</Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}

      <PaymentGatewayPickModal
        visible={gwPick.visible}
        gateways={gwPick.gateways}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  sub: { paddingHorizontal: 20, color: theme.colors.textMuted, fontSize: 13, marginBottom: 8 },
  list: { padding: 20 },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  name: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  meta: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 14 },
  btn: {
    marginTop: 16,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: { fontWeight: '800', color: '#111', fontSize: 16 },
});

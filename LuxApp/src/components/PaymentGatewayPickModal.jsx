// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme/theme.js';

const LABELS = {
  mock: 'Test Pay (no real charge)',
  razorpay: 'Razorpay',
  googlepay: 'Google Pay',
  paytm: 'Paytm',
  phonepe: 'PhonePe',
};

export default function PaymentGatewayPickModal({
  visible,
  gateways = [],
  pack = null,
  plan = null,
  onSelect,
  onCancel,
}) {
  const insets = useSafeAreaInsets();
  const [selectedGateway, setSelectedGateway] = useState(null);

  useEffect(() => {
    if (visible && gateways.length > 0) {
      setSelectedGateway(gateways[0]);
    }
  }, [visible, gateways]);

  const target = pack || plan;
  const price = target?.priceInr || target?.price || 0;
  const coins = target?.coins || 0;
  const isVideoPlan = !!pack;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable 
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]} 
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* Top Handle Indicator */}
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.titleArea}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 2 OF 2</Text>
              </View>
              <Text style={styles.headerTitle}>Select Payment</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.sub}>Choose a gateway to complete your transaction.</Text>

          {/* Package Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCoinsWrap}>
              <Ionicons name="diamond" size={22} color={theme.colors.accentGold} />
              <Text style={styles.summaryCoinsText}>
                {coins ? `${coins} Coins` : target?.name || 'Package'}
              </Text>
            </View>
            <Text style={styles.summaryPriceText}>₹{Number(price).toFixed(2)}</Text>
          </View>

          {/* Gateways List */}
          <View style={styles.gatewaysList}>
            {gateways.map((name) => {
              const isSelected = selectedGateway === name;
              return (
                <Pressable
                  key={name}
                  style={[styles.gatewayRow, isSelected && styles.gatewayRowActive]}
                  onPress={() => setSelectedGateway(name)}
                >
                  <View style={styles.gatewayInfo}>
                    <View style={styles.gatewayIcon}>
                      <Ionicons name="card-outline" size={20} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.gatewayName}>{LABELS[name] || name}</Text>
                  </View>
                  <View style={[styles.radioBorder, isSelected && styles.radioBorderActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Footer Action */}
          <View style={styles.footer}>
            <Pressable 
              style={[styles.continueBtnPressable, !selectedGateway && styles.continueBtnDisabled]}
              onPress={() => selectedGateway && onSelect(selectedGateway)}
              disabled={!selectedGateway}
            >
              <LinearGradient
                colors={!selectedGateway ? ['rgba(233,30,140,0.4)', 'rgba(124,58,237,0.4)'] : theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>Continue to Payment</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
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
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    fontFamily: theme.typography.fontBody,
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
    gap: 8,
  },
  summaryCoinsText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: theme.typography.fontDisplay,
  },
  summaryPriceText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  gatewaysList: {
    gap: 12,
    marginBottom: 24,
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
    backgroundColor: 'rgba(233, 30, 140, 0.04)',
  },
  gatewayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gatewayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
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
  },
  footer: {
    marginTop: 8,
  },
  continueBtnPressable: {
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
});

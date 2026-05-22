// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../theme/theme.js';

/** Confirms mock checkout without native Alert. */
export default function MockPayConfirmModal({
  visible,
  amountInr,
  purposeLabel,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          {/* Top Decorative Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="card" size={32} color={theme.colors.accentGold} />
          </View>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>TEST ENVIRONMENT</Text>
          </View>

          <Text style={styles.title}>Confirm Purchase</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Price</Text>
            <Text style={styles.amountText}>₹{amountInr}</Text>
            <Text style={styles.purposeText}>{purposeLabel}</Text>
          </View>

          <View style={styles.noteContainer}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.note}>This is a simulated transaction. No real money will be charged.</Text>
          </View>

          <View style={styles.actions}>
            {/* Confirm button (Primary gradient) */}
            <Pressable style={styles.btnPressable} onPress={onConfirm}>
              <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnPrimary}
              >
                <Text style={styles.btnPrimaryText}>Confirm Payment</Text>
              </LinearGradient>
            </Pressable>

            {/* Cancel button (Outline) */}
            <Pressable style={styles.btnOutline} onPress={onCancel}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
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
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.bgTertiary, // Elevated Dark #161625
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    alignItems: 'center',
    ...theme.shadow.glass,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.25)',
  },
  badgeContainer: {
    backgroundColor: 'rgba(233, 30, 140, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accentMagenta,
    letterSpacing: 1.2,
    fontFamily: theme.typography.fontBody,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
    marginBottom: 16,
    textAlign: 'center',
  },
  amountContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: theme.typography.fontBody,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.accentGold,
    fontFamily: theme.typography.fontDisplay,
    marginBottom: 4,
  },
  purposeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.typography.fontBody,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 24,
    gap: 8,
  },
  note: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
    lineHeight: 15,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  btnPressable: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnPrimary: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    fontFamily: theme.typography.fontBody,
  },
  btnOutline: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: theme.typography.fontBody,
  },
});

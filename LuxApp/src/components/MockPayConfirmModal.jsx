import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import theme from '../theme/theme.js';

/** Confirms mock checkout without native Alert (same Android hang class as gateway Alert). */
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
          <Text style={styles.badge}>Mock payment</Text>
          <Text style={styles.title}>Confirm test payment</Text>
          <Text style={styles.sub}>
            ₹{amountInr} — {purposeLabel}
          </Text>
          <Text style={styles.note}>No real money is charged.</Text>
          <Pressable style={styles.primary} onPress={onConfirm}>
            <Text style={styles.primaryText}>Confirm</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accentMagenta,
    marginBottom: 8,
  },
  title: { fontSize: 19, fontWeight: '800', color: theme.colors.textPrimary },
  sub: { marginTop: 10, fontSize: 16, color: theme.colors.textPrimary, fontWeight: '600' },
  note: { marginTop: 8, fontSize: 14, color: theme.colors.textSecondary },
  primary: {
    marginTop: 20,
    backgroundColor: theme.colors.accentMagenta,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { fontWeight: '800', color: '#fff', fontSize: 16 },
  cancel: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 15 },
});

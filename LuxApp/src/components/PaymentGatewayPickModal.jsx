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
import theme from '../theme/theme.js';

const LABELS = {
  mock: 'Test pay (mock — no real charge)',
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
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation?.()}>
          
          <View style={styles.headerInfo}>
            <View style={styles.packDesc}>
               {isVideoPlan && <Ionicons name="diamond" size={20} color={theme.colors.accentMagenta} style={{marginRight: 6}} />}
               <Text style={styles.packTitle}>{coins ? coins : target?.name || 'Package'}</Text>
            </View>
            <Text style={styles.packPrice}>₹{Number(price).toFixed(2)}</Text>
          </View>

          <View style={styles.gatewaysContainer}>
            {gateways.map((name) => {
              const isSelected = selectedGateway === name;
              return (
                <Pressable
                  key={name}
                  style={styles.radioRow}
                  onPress={() => setSelectedGateway(name)}
                >
                  <View style={styles.radioLabelRow}>
                    <View style={styles.iconCircle}>
                       <Ionicons name="card-outline" size={18} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.radioText}>{LABELS[name] || name}</Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable 
              style={[styles.continueBtn, !selectedGateway && styles.continueBtnDisabled]}
              onPress={() => selectedGateway && onSelect(selectedGateway)} 
            >
              <Text style={styles.continueBtnText}>Continue</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    maxHeight: '90%',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  packDesc: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  packPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  gatewaysContainer: {
    marginBottom: 20,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGlass,
  },
  radioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.accentMagenta,
  },
  radioInner: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accentMagenta,
  },
  footer: {
    marginTop: 10,
    marginBottom: 10,
  },
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

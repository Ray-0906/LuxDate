// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../theme/theme.js';

export default function InsufficientCoinsModal({
  visible,
  onClose,
  onGoWallet,
  onBuyCoins,
  coinBalance = 0,
  requiredCoins = 0,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Gold Coin Icon Block */}
          <View style={styles.iconWrapper}>
            <View style={styles.glowOverlay} />
            <Ionicons name="diamond" size={40} color={theme.colors.accentGold} />
          </View>

          <Text style={styles.title}>You need more coins</Text>
          
          <Text style={styles.balanceInfo}>
            Current balance: {coinBalance} coins
          </Text>
          
          {requiredCoins > 0 && (
            <Text style={styles.requiredInfo}>
              Needed: {requiredCoins} coins
            </Text>
          )}

          <Text style={styles.subtext}>
            Top up to keep the connection going.
          </Text>

          <View style={styles.actions}>
            {/* Buy Coins (Primary CTA) */}
            <Pressable
              style={styles.ctaPressable}
              onPress={() => {
                if (onBuyCoins) {
                  onClose();
                  onBuyCoins();
                } else {
                  onGoWallet();
                }
              }}
            >
              <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnPrimary}
              >
                <Text style={styles.btnPrimaryText}>
                  {onBuyCoins ? 'Buy Coins' : 'Open Wallet'}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Maybe Later (Ghost CTA) */}
            <Pressable style={styles.btnGhost} onPress={onClose}>
              <Text style={styles.btnGhostText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    alignItems: 'center',
    ...theme.shadow.glass,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  glowOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    ...theme.shadow.glowGold,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: theme.typography.fontDisplay,
    textAlign: 'center',
    marginBottom: 8,
  },
  balanceInfo: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
    textAlign: 'center',
  },
  requiredInfo: {
    color: theme.colors.accentRed,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
    marginTop: 4,
    textAlign: 'center',
  },
  subtext: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.typography.fontBody,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  ctaPressable: {
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
  btnGhost: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
  },
});

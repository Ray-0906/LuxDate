import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
          <Text style={styles.title}>Not enough coins</Text>
          <Text style={styles.body}>
            Current balance: {coinBalance} coins
          </Text>
          {requiredCoins > 0 ? (
            <Text style={styles.body}>
              Needed: {requiredCoins} coins
            </Text>
          ) : null}
          <Text style={styles.subtle}>
            Buy a coin pack to continue.
          </Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>Later</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => {
                if (onBuyCoins) {
                  onClose();
                  onBuyCoins();
                } else {
                  onGoWallet();
                }
              }}
            >
              <Text style={styles.btnPrimaryText}>{onBuyCoins ? 'Buy coins' : 'Open Wallet'}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    marginTop: 10,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  subtle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 14,
  },
  btnGhost: {
    backgroundColor: theme.colors.bgTertiary,
  },
  btnPrimary: {
    backgroundColor: theme.colors.accentMagenta,
  },
  btnGhostText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: '800',
  },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import useAuthStore from '../../store/authStore.js';

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Coin balance</Text>
        <Text style={styles.balance}>{user?.coinBalance ?? 0}</Text>
        <Pressable style={styles.primary} onPress={() => navigation.navigate('CoinPack')}>
          <Text style={styles.primaryText}>Buy coins</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.navigate('TransactionHistory')}>
          <Text style={styles.secondaryText}>Transaction history</Text>
        </Pressable>
      </View>
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
  card: { margin: 20, padding: 22, borderRadius: 22, backgroundColor: theme.colors.bgSecondary },
  label: { color: theme.colors.textMuted, fontSize: 14 },
  balance: { fontSize: 36, fontWeight: '900', color: theme.colors.accentCyan, marginTop: 6 },
  primary: {
    marginTop: 22,
    backgroundColor: theme.colors.accentMagenta,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  secondary: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: theme.colors.textSecondary, fontWeight: '600' },
});

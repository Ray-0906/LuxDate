import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { coinsApi } from '../../api/services.js';

export default function TransactionHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coinsApi.transactions({ limit: 50 });
      setItems(res.data?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accentMagenta} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.note}>{item.note || '—'}</Text>
              </View>
              <Text style={[styles.amt, item.amount < 0 ? styles.neg : styles.pos]}>
                {item.amount > 0 ? '+' : ''}{item.amount}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
        />
      )}
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
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.bgSecondary,
    marginBottom: 10,
  },
  type: { fontWeight: '700', color: theme.colors.textPrimary, textTransform: 'capitalize' },
  note: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  amt: { fontWeight: '800', fontSize: 16 },
  pos: { color: theme.colors.accentGreen },
  neg: { color: theme.colors.accentRed },
  empty: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40 },
});

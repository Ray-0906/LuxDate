// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
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

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.floor((new Date() - date) / 60000); // mins
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getTransactionUi = (type) => {
    const t = String(type || '').toLowerCase();
    
    if (t.includes('purchase') || t.includes('recharge') || t.includes('buy') || t.includes('gateway')) {
      return {
        icon: 'diamond',
        color: theme.colors.accentGold,
        bgColor: 'rgba(201, 168, 76, 0.15)',
      };
    }
    if (t.includes('gift')) {
      return {
        icon: 'gift',
        color: theme.colors.textPrimary,
        bgColor: 'rgba(255, 255, 255, 0.06)',
      };
    }
    if (t.includes('call') || t.includes('video') || t.includes('chat')) {
      return {
        icon: 'videocam',
        color: theme.colors.textPrimary,
        bgColor: 'rgba(255, 255, 255, 0.06)',
      };
    }
    if (t.includes('reward') || t.includes('bonus') || t.includes('checkin') || t.includes('claim')) {
      return {
        icon: 'star',
        color: theme.colors.accentCyan,
        bgColor: 'rgba(0, 229, 255, 0.12)',
      };
    }
    if (t.includes('vip') || t.includes('sub')) {
      return {
        icon: 'crown',
        color: theme.colors.accentGold,
        bgColor: 'rgba(201, 168, 76, 0.15)',
      };
    }
    
    return {
      icon: 'swap-horizontal',
      color: theme.colors.textSecondary,
      bgColor: 'rgba(255, 255, 255, 0.06)',
    };
  };

  const renderRow = ({ item }) => {
    const ui = getTransactionUi(item.type);
    const isLargeNegative = item.amount <= -100;
    
    let amountStyle = styles.pos;
    if (item.amount < 0) {
      amountStyle = isLargeNegative ? styles.negLarge : styles.negNormal;
    }

    return (
      <View style={styles.row}>
        {/* Left Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: ui.bgColor }]}>
          <Ionicons name={ui.icon} size={20} color={ui.color} />
        </View>

        {/* Center Details */}
        <View style={styles.details}>
          <Text style={styles.type}>{item.type}</Text>
          <Text style={styles.note}>{item.note || '—'}</Text>
        </View>

        {/* Right Info */}
        <View style={styles.rightBlock}>
          <Text style={[styles.amt, amountStyle]}>
            {item.amount > 0 ? '+' : ''}{item.amount}
          </Text>
          {item.createdAt && (
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Transactions</Text>
        <Pressable hitSlop={12}>
          <Ionicons name="funnel-outline" size={22} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={theme.colors.accentMagenta} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id || item.id)}
          contentContainerStyle={styles.list}
          renderItem={renderRow}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No activity yet.</Text>
              <Text style={styles.emptySubtitle}>Your coin history will appear here.</Text>
            </View>
          }
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
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  type: {
    fontWeight: '700',
    fontSize: 15,
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
    fontFamily: theme.typography.fontDisplay,
  },
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontFamily: theme.typography.fontBody,
  },
  rightBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amt: {
    fontWeight: '800',
    fontSize: 15,
    fontFamily: theme.typography.fontDisplay,
  },
  pos: { color: theme.colors.accentCyan },
  negNormal: { color: theme.colors.textSecondary },
  negLarge: { color: theme.colors.accentRed },
  time: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontFamily: theme.typography.fontBody,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontDisplay,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
    textAlign: 'center',
  },
});

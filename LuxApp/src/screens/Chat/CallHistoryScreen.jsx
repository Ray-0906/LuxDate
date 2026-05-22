// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { callsApi } from '../../api/services';
import theme from '../../theme/theme.js';

const CallHistoryScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchHistory = async (pageNumber = 1, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);
      else if (pageNumber === 1) setLoading(true);

      const res = await callsApi.history({ page: pageNumber, limit: 20 });
      const newCalls = res.data.data || res.data.calls || res.data || [];

      if (pageNumber === 1) {
        setCalls(newCalls);
      } else {
        setCalls(prev => [...prev, ...newCalls]);
      }

      setHasMore(newCalls.length === 20);
      setPage(pageNumber);
    } catch (e) {
      console.warn('Failed to fetch call history', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const onRefresh = useCallback(() => {
    fetchHistory(1, true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore && !refreshing) {
      fetchHistory(page + 1);
    }
  };

  const confirmClearAll = async () => {
    try {
      setShowClearModal(false);
      await callsApi.clearHistory();
      setCalls([]);
    } catch (e) {
      console.warn('Failed to clear call history');
    }
  };

  const handleClearAll = () => {
    setShowClearModal(true);
  };

  const formatDuration = seconds => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = dateStr => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Math.floor((new Date() - date) / 60000); // mins
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status) => {
    if (status === 'accepted') return theme.colors.accentCyan; // Cyan #00E5FF
    if (status === 'missed') return theme.colors.accentRed;    // Crimson #FF3B6B
    return '#B8B8DC'; // Muted Lavender rejected
  };

  const getCallIconName = (status, type) => {
    if (status === 'missed' || status === 'rejected') {
      return 'call-outline';
    }
    return type === 'incoming' ? 'arrow-down-left-outline' : 'arrow-up-right-outline';
  };

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const isOnline = item.girlProfileId?._id 
      ? (item.girlProfileId._id.charCodeAt(item.girlProfileId._id.length - 1) % 2 === 0) 
      : false;

    return (
      <View style={styles.callItem}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.girlProfileId?.photos?.[0] ||
                item.girlProfileId?.profilePhotoUrl ||
                'https://via.placeholder.com/150',
            }}
            style={[styles.avatar, { borderColor: statusColor }]}
          />
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.callInfo}>
          <Text style={styles.name}>
            {item.girlProfileId?.name || 'Unknown'}
          </Text>
          <View style={styles.callDetails}>
            <Ionicons
              name={getCallIconName(item.status, item.type)}
              size={14}
              color={statusColor}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              {item.status === 'accepted'
                ? ` • ${formatDuration(item.duration)}`
                : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back-outline"
            size={20}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleClearAll}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={theme.colors.accentRed}
          />
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={theme.colors.accentRed}
              />
            </View>
            <Text style={styles.modalTitle}>Clear History?</Text>
            <Text style={styles.modalSubtitle}>
              This will permanently delete all call records. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowClearModal(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmClearAll}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={calls}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accentMagenta}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyWrap}>
              <Ionicons
                name="call-outline"
                size={48}
                color={theme.colors.textMuted}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyText}>No calls logged</Text>
              <Text style={styles.emptySubtext}>Your recent calls will appear here.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '800',
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  listContent: { flexGrow: 1, paddingBottom: 40 },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: theme.colors.bgTertiary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accentGreen,
    borderWidth: 1.5,
    borderColor: theme.colors.bgPrimary,
  },
  callInfo: { flex: 1, marginLeft: 14 },
  name: {
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '700',
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  callDetails: { flexDirection: 'row', alignItems: 'center' },
  statusText: {
    fontFamily: theme.typography.fontBody,
    fontWeight: '500',
    fontSize: 13,
  },
  timeText: {
    fontFamily: theme.typography.fontBody,
    fontWeight: '400',
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.85)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,59,107,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '800',
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: theme.typography.fontBody,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: theme.typography.fontBody,
    fontWeight: '700',
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: theme.typography.fontBody,
    fontWeight: '700',
    fontSize: 14,
    color: '#FFF',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 140,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: theme.typography.fontBody,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default CallHistoryScreen;

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
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { callsApi } from '../../api/services';
import theme from '../../theme/theme.js';

const CallHistoryScreen = () => {
  const navigation = useNavigation();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  const [showClearModal, setShowClearModal] = useState(false);

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
    if (diff < 60) return `${diff} mins ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hrs ago`;
    return date.toLocaleDateString();
  };

  const getCallIcon = (status, type) => {
    if (status === 'missed' || status === 'rejected')
      return (
        <Ionicons
          name="call-outline"
          size={16}
          color={theme.colors.accentRed}
        />
      );
    return type === 'incoming' ? (
      <Ionicons
        name="call-outline"
        size={16}
        color={theme.colors.accentGreen}
      />
    ) : (
      <Ionicons
        name="call-outline"
        size={16}
        color={theme.colors.textPrimary}
      />
    );
  };

  const renderItem = ({ item }) => {
    const isMissed = item.status === 'missed' || item.status === 'rejected';

    return (
      <View style={styles.callItem}>
        <Image
          source={{
            uri:
              item.girlProfileId?.photos?.[0] ||
              'https://via.placeholder.com/150',
          }}
          style={styles.avatar}
        />
        <View style={styles.callInfo}>
          <Text style={[styles.name, isMissed && styles.missedName]}>
            {item.girlProfileId?.name || 'Unknown'}
          </Text>
          <View style={styles.callDetails}>
            {getCallIcon(item.status, item.type)}
            <Text style={styles.statusText}>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
          <Ionicons
            name="trash-outline"
            size={24}
            color={theme.colors.accentRed || theme.colors.statusError}
          />
        </TouchableOpacity>
      </View>
      <Modal visible={showClearModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <View
            style={{
              width: '80%',
              backgroundColor: '#111',
              padding: 20,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: '600',
                marginBottom: 12,
              }}
            >
              Clear Call History?
            </Text>

            <Text
              style={{
                color: '#999',
                marginBottom: 20,
              }}
            >
              This will remove all call logs permanently.
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <TouchableOpacity
                onPress={() => setShowClearModal(false)}
                style={{ marginRight: 20 }}
              >
                <Text style={{ color: '#999' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={confirmClearAll}>
                <Text style={{ color: 'red', fontWeight: '600' }}>Clear</Text>
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
              <Text style={styles.emptyText}>No call history yet</Text>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: { padding: 4 },
  clearBtn: { padding: 4 },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  listContent: { flexGrow: 1, paddingBottom: 20 },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333' },
  callInfo: { flex: 1, marginLeft: 16 },
  name: {
    fontWeight: '600',
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  missedName: { color: theme.colors.accentRed },
  callDetails: { flexDirection: 'row', alignItems: 'center' },
  statusText: {
    fontWeight: '400',
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  timeText: { fontWeight: '400', fontSize: 12, color: theme.colors.textMuted },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: { fontWeight: '400', fontSize: 16, color: theme.colors.textMuted },
});

export default CallHistoryScreen;

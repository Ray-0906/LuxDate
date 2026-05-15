import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { chatApi } from '../../api/services.js';
import useChatBadgeStore from '../../store/chatBadgeStore.js';

export default function InboxScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const setUnreadCount = useChatBadgeStore((s) => s.setUnreadCount);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await chatApi.inbox();
      const items = res.data.data || [];
      const unreadCount = items.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
      setConversations(items);
      setUnreadCount(unreadCount);
    } catch (e) {
      console.warn('Inbox error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      fetchInbox();
      
      // Auto refresh exactly when a new socket ping is blasted over
      const { default: socketService } = require('../../api/socket.js');
      const handleSocketPing = () => fetchInbox();
      socketService.onNewMessage(handleSocketPing);

      return () => {
        socketService.offNewMessage(handleSocketPing);
      };
    }, [fetchInbox])
  );

  const renderItem = useCallback(({ item }) => {
    const girl = item.girl || item.girlProfile || {};
    const lastMsg = item.lastMessage || item.content?.text || '';
    const unread = item.unreadCount || 0;

    return (
      <Pressable
        style={styles.chatItem}
        onPress={() => navigation.navigate('Conversation', { girl, sessionId: item._id })}
      >
        <Image
          source={{ uri: girl.photos?.[0] || girl.profilePhotoUrl || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>{girl.name || 'Unknown'}</Text>
            <Text style={styles.chatTime}>
              {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}
            </Text>
          </View>
          <Text style={styles.chatPreview} numberOfLines={1}>{lastMsg || 'Tap to chat'}</Text>
        </View>
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <Pressable onPress={() => navigation.navigate('CallHistory')} style={styles.iconBtn}>
          <Ionicons name="call-outline" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start chatting from the For You tab</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingBottom: 100 },
  chatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderGlass,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.bgTertiary },
  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, flex: 1 },
  chatTime: { fontSize: 11, color: theme.colors.textMuted },
  chatPreview: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 3 },
  unreadBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.colors.accentMagenta,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.textSecondary },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted },
});

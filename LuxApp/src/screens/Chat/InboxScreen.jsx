// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
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

  const totalUnread = conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0);

  const renderItem = useCallback(({ item }) => {
    const girl = item.girl || item.girlProfile || {};
    const lastMsg = item.lastMessage || item.content?.text || '';
    const unread = item.unreadCount || 0;
    
    // Hash-based online status for variety in lists
    const isOnline = girl.isOnline || (girl._id ? (girl._id.charCodeAt(girl._id.length - 1) % 2 === 0) : false);

    return (
      <Pressable
        style={[styles.chatItem, unread > 0 && { backgroundColor: 'rgba(233,30,140,0.04)' }]}
        onPress={() => navigation.navigate('Conversation', { girl, sessionId: item._id })}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: girl.photos?.[0] || girl.profilePhotoUrl || 'https://via.placeholder.com/60' }}
            style={styles.avatar}
          />
          {isOnline && (
            <View style={styles.onlineDot} />
          )}
        </View>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.headerSubtitle}> · {totalUnread} new</Text>
          )}
        </View>
        <Pressable onPress={() => navigation.navigate('CallHistory')} style={styles.iconBtn}>
          <Ionicons name="call-outline" size={16} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No messages yet.</Text>
          <Text style={styles.emptySubtext}>Discover someone you like and start the conversation.</Text>
          <Pressable onPress={() => navigation.navigate('ForYou')} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>Explore profiles →</Text>
          </Pressable>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerTitle: { fontSize: 24, fontFamily: theme.typography.fontDisplay, fontWeight: '800', color: theme.colors.textPrimary },
  headerSubtitle: { fontSize: 13, fontFamily: theme.typography.fontBody, color: theme.colors.textSecondary, fontWeight: '600' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingBottom: 100 },
  chatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.bgTertiary },
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
  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 15, fontFamily: theme.typography.fontDisplay, fontWeight: '700', color: theme.colors.textPrimary, flex: 1 },
  chatTime: { fontSize: 11, fontFamily: theme.typography.fontBody, color: theme.colors.textMuted },
  chatPreview: { fontSize: 13, fontFamily: theme.typography.fontBody, color: theme.colors.textSecondary, marginTop: 3 },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.colors.accentMagenta,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 20,
  },
  unreadText: { fontSize: 10, fontWeight: '800', color: '#FFF', fontFamily: theme.typography.fontBody },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, fontFamily: theme.typography.fontDisplay, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: theme.colors.textSecondary, fontFamily: theme.typography.fontBody, textAlign: 'center', marginBottom: 16 },
  emptyCta: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyCtaText: {
    color: theme.colors.accentMagenta,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
});

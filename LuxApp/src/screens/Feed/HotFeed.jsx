import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Pressable,
  RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { profilesApi } from '../../api/services.js';

const { width: W } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_W = (W - 20 * 2 - CARD_GAP) / 2;
const CARD_H = CARD_W * 1.45;

export default function HotFeed({ filters, onOpenProfile }) {
  const [girls, setGirls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const params = {};
      if (filters?.region && filters.region !== 'All') params.region = filters.region;
      if (filters?.language && filters.language !== 'All') params.language = filters.language;
      const res = await profilesApi.hot(params);
      setGirls(res.data.data || []);
    } catch (e) {
      console.warn('Hot feed error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  const renderCard = useCallback(({ item }) => (
    <Pressable
      onPress={() => onOpenProfile(item)}
      style={styles.card}
    >
      <Image
        source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/300' }}
        style={styles.cardImg}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}, {item.age}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="location-outline" size={12} color={theme.colors.accentCyan} />
          <Text style={styles.cardLocation} numberOfLines={1}>{item.location || item.region}</Text>
        </View>
      </View>
      {/* Charm badge */}
      {item.charmLevel > 1 && (
        <View style={styles.charmBadge}>
          <Text style={styles.charmText}>✦ {item.charmLevel}</Text>
        </View>
      )}
    </Pressable>
  ), [onOpenProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
      </View>
    );
  }

  return (
    <FlatList
      data={girls}
      keyExtractor={(item) => item._id}
      renderItem={renderCard}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accentMagenta}
          colors={[theme.colors.accentMagenta]}
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No profiles found</Text>
          <Text style={styles.emptySubtext}>Pull down to refresh</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    width: CARD_W, height: CARD_H, borderRadius: theme.radius.lg,
    overflow: 'hidden', backgroundColor: theme.colors.bgSecondary,
  },
  cardImg: { width: '100%', height: '100%' },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
  },
  cardInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 15, fontWeight: '700', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cardLocation: { fontSize: 11, color: theme.colors.textSecondary },
  charmBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(139,47,248,0.85)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  charmText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.textSecondary },
  emptySubtext: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
});

// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Pressable,
  RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import theme from '../../theme/theme.js';
import { profilesApi } from '../../api/services.js';

const { width: W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (W - 20 * 2 - CARD_GAP) / 2;
const CARD_H = CARD_W * 1.45;

function PulsingOnlineDot() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.dotContainer}>
      <Animated.View style={[styles.pulseDot, pulseStyle]} />
      <View style={styles.solidDot} />
    </View>
  );
}

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

  const renderCard = useCallback(({ item }) => {
    const isOnline = item.isOnline || (item._id && item._id.charCodeAt(item._id.length - 1) % 2 === 0);
    return (
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
          colors={['transparent', 'rgba(10, 10, 15, 0.3)', '#0A0A0F']}
          style={styles.cardGradient}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}, {item.age}
          </Text>
          <View style={styles.cardMeta}>
            <Ionicons name="location" size={12} color={theme.colors.accentCyan} />
            <Text style={styles.cardLocation} numberOfLines={1}>{item.location || item.region}</Text>
          </View>
        </View>
        
        {/* Elite Badge top-left */}
        {item.charmLevel > 1 && (
          <LinearGradient
            colors={theme.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.eliteBadge}
          >
            <Text style={styles.eliteText}>✦ Elite</Text>
          </LinearGradient>
        )}

        {/* Pulsing online status dot top-right */}
        {isOnline && <PulsingOnlineDot />}
      </Pressable>
    );
  }, [onOpenProfile]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
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
          <Ionicons name="diamond" size={64} color="rgba(201, 168, 76, 0.15)" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>The grid is quiet</Text>
          <Text style={styles.emptySubtext}>No elite profiles match your current protocols. Pull down to search again.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    position: 'relative',
  },
  cardImg: { width: '100%', height: '100%' },
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
  },
  cardInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontFamily: theme.typography.fontBody,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardLocation: {
    fontSize: 11,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textSecondary,
  },
  eliteBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    ...theme.shadow.glowGold,
  },
  eliteText: {
    fontSize: 10,
    fontFamily: theme.typography.fontBody,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
  },
  
  dotContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pulseDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.accentGreen,
  },
  solidDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentGreen,
    borderWidth: 1.5,
    borderColor: '#0A0A0F',
  },
  
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 20 },
  emptyIcon: { marginBottom: 20 },
  emptyText: {
    fontSize: 18,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});

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

export default function NearbyFeed({ onOpenProfile }) {
  const [girls, setGirls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await profilesApi.nearby();
      setGirls(res.data.data || []);
    } catch (e) {
      console.warn('Nearby feed error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  const renderCard = useCallback(({ item }) => {
    const isOnline = item.isOnline || (item._id && item._id.charCodeAt(item._id.length - 1) % 2 === 0);
    return (
      <Pressable onPress={() => onOpenProfile(item)} style={styles.card}>
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
          <Text style={styles.cardName} numberOfLines={1}>{item.name}, {item.age}</Text>
          <View style={styles.distRow}>
            <Ionicons name="navigate" size={12} color={theme.colors.accentGreen} />
            <Text style={styles.distText}>
              {item.distanceKm ? `${item.distanceKm} km` : 'Near you'}
            </Text>
          </View>
        </View>

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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={theme.colors.accentMagenta} colors={[theme.colors.accentMagenta]} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="location" size={64} color="rgba(0, 229, 255, 0.15)" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Horizon is empty</Text>
          <Text style={styles.emptySubtext}>No active signals nearby. Pull down to refresh your tracking coordinates.</Text>
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
  cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardName: {
    fontSize: 16,
    fontFamily: theme.typography.fontBody,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  distText: {
    fontSize: 11,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.accentGreen,
    fontWeight: '600',
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

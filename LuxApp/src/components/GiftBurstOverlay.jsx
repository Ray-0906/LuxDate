// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useMemo } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../theme/theme.js';

export default function GiftBurstOverlay({ visible, gift, quantity = 1, mode = 'chat', subtitle = 'Gift sent' }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const scale = useSharedValue(0.85);
  const callTranslateX = useSharedValue(0);
  const callTranslateY = useSharedValue(0);
  const callScale = useSharedValue(0.65);
  const sparkleOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      translateY.value = 24;
      scale.value = 0.85;
      callTranslateX.value = 0;
      callTranslateY.value = 0;
      callScale.value = 0.65;
      sparkleOpacity.value = 0;
      return;
    }

    if (mode === 'call') {
      // Reset values
      opacity.value = 0;
      callTranslateX.value = 0;
      callTranslateY.value = 0;
      callScale.value = 0.65;
      sparkleOpacity.value = 0;

      // Animate call translate and scale
      callTranslateX.value = withTiming(-28, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
      callTranslateY.value = withTiming(-240, {
        duration: 1200,
        easing: Easing.out(Easing.exp),
      });

      callScale.value = withSequence(
        withSpring(1.05, { damping: 12, stiffness: 90 }),
        withTiming(0.92, {
          duration: 720,
          easing: Easing.inOut(Easing.quad),
        })
      );

      // Sparkle opacity
      sparkleOpacity.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) })
      );

      // Overlay opacity (fade in, stay, fade out)
      opacity.value = withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
        withDelay(600, withTiming(0, { duration: 380, easing: Easing.in(Easing.cubic) }))
      );
    } else {
      // Chat mode animation
      opacity.value = 0;
      translateY.value = 24;
      scale.value = 0.85;

      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSpring(1, { damping: 10, stiffness: 90 });
    }
  }, [visible, mode, callScale, callTranslateX, callTranslateY, opacity, scale, sparkleOpacity, translateY]);

  const countLabel = useMemo(() => (quantity > 1 ? `x${quantity}` : ''), [quantity]);

  const fallbackIcon = useMemo(() => {
    const name = String(gift?.name || '').toLowerCase();
    if (name.includes('rose') || name.includes('flower')) return 'flower';
    if (name.includes('heart') || name.includes('love')) return 'heart';
    if (name.includes('ring') || name.includes('diamond')) return 'diamond';
    if (name.includes('beer') || name.includes('drink') || name.includes('wine')) return 'wine';
    if (name.includes('car') || name.includes('sports')) return 'car-sport';
    if (name.includes('crown') || name.includes('king') || name.includes('queen')) return 'crown';
    return 'gift';
  }, [gift]);

  const animatedSparkleStyle = useAnimatedStyle(() => {
    return {
      opacity: sparkleOpacity.value,
      transform: [
        { translateX: callTranslateX.value },
        { translateY: callTranslateY.value },
        { scale: callScale.value },
      ],
    };
  });

  const animatedCallBurstStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: callTranslateX.value },
        { translateY: callTranslateY.value },
        { scale: callScale.value },
      ],
    };
  });

  const animatedChatCardStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  if (!visible || !gift) return null;

  if (mode === 'call') {
    return (
      <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
        <View pointerEvents="none" style={styles.callFxLayer}>
          <Animated.View style={[styles.sparkleContainer, animatedSparkleStyle]}>
            <Ionicons name="sparkles" size={24} color="#F5D27A" style={styles.sparkleIcon1} />
            <Ionicons name="star" size={14} color="#C9A84C" style={styles.sparkleIcon2} />
            <Ionicons name="sparkles" size={18} color="#F5D27A" style={styles.sparkleIcon3} />
          </Animated.View>
          <Animated.View style={[styles.callBurst, animatedCallBurstStyle]}>
            {gift.iconUrl ? (
              <Image source={{ uri: gift.iconUrl }} style={styles.callIconImage} />
            ) : (
              <View style={styles.callFallbackIconContainer}>
                <Ionicons name={fallbackIcon} size={36} color={theme.colors.accentGold} />
              </View>
            )}
            {countLabel ? (
              <View style={styles.callCountPill}>
                <Text style={styles.callCountText}>{countLabel}</Text>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <View pointerEvents="none" style={[styles.overlay, styles.overlayChat]}>
      <Animated.View style={[styles.card, animatedChatCardStyle]}>
        {gift.iconUrl ? (
          <Image source={{ uri: gift.iconUrl }} style={styles.iconImage} />
        ) : (
          <View style={styles.fallbackIconContainer}>
            <Ionicons name={fallbackIcon} size={32} color={theme.colors.accentGold} />
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.title}>
            {gift.name} {countLabel}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayChat: {
    justifyContent: 'center',
  },
  callFxLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingBottom: 132,
    zIndex: 30,
    elevation: 30,
  },
  callBurst: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(22, 22, 37, 0.95)', // Surface 3 Elevated Dark
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Thin border
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accentMagenta,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  sparkleContainer: {
    position: 'absolute',
    right: 24,
    bottom: 132,
    width: 82,
    height: 82,
  },
  sparkleIcon1: {
    position: 'absolute',
    top: -12,
    left: -12,
    textShadowColor: 'rgba(245, 210, 122, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sparkleIcon2: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    textShadowColor: 'rgba(201, 168, 76, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  sparkleIcon3: {
    position: 'absolute',
    top: 4,
    right: -16,
    textShadowColor: 'rgba(245, 210, 122, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Thin border
    backgroundColor: 'rgba(22, 22, 37, 0.95)', // Surface 3 Elevated Dark
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: theme.colors.accentMagenta,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconImage: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
  },
  fallbackIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  callIconImage: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
  },
  callFallbackIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  callCountPill: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 14,
    backgroundColor: theme.colors.accentMagenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  copy: {
    alignItems: 'flex-start',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: theme.typography.fontDisplay,
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
});

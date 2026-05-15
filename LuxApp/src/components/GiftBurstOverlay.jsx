import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import theme from '../theme/theme.js';

export default function GiftBurstOverlay({ visible, gift, quantity = 1, mode = 'chat', subtitle = 'Gift sent' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const callTranslateX = useRef(new Animated.Value(0)).current;
  const callTranslateY = useRef(new Animated.Value(0)).current;
  const callScale = useRef(new Animated.Value(0.65)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(24);
      scale.setValue(0.85);
      callTranslateX.setValue(0);
      callTranslateY.setValue(0);
      callScale.setValue(0.65);
      sparkleOpacity.setValue(0);
      return;
    }

    if (mode === 'call') {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(callTranslateX, {
          toValue: -28,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(callTranslateY, {
          toValue: -240,
          duration: 1200,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(callScale, {
            toValue: 1.05,
            friction: 6,
            tension: 90,
            useNativeDriver: true,
          }),
          Animated.timing(callScale, {
            toValue: 0.92,
            duration: 720,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkleOpacity, {
            toValue: 0,
            duration: 900,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(720),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 380,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [callScale, callTranslateX, callTranslateY, mode, opacity, scale, sparkleOpacity, translateY, visible]);

  const countLabel = useMemo(() => (quantity > 1 ? `x${quantity}` : ''), [quantity]);
  if (!visible || !gift) return null;

  if (mode === 'call') {
    return (
      <Modal transparent visible animationType="none" statusBarTranslucent>
        <View pointerEvents="none" style={styles.callFxLayer}>
          <Animated.View
            style={[
              styles.sparkle,
              {
                opacity: sparkleOpacity,
                transform: [{ translateX: callTranslateX }, { translateY: callTranslateY }, { scale: callScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.callBurst,
              {
                opacity,
                transform: [{ translateX: callTranslateX }, { translateY: callTranslateY }, { scale: callScale }],
              },
            ]}
          >
            {gift.iconUrl ? (
              <Image source={{ uri: gift.iconUrl }} style={styles.callIconImage} />
            ) : (
              <Text style={styles.callEmoji}>{gift.emojiFallback || '🎁'}</Text>
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
    <View pointerEvents="none" style={[styles.overlay, mode === 'call' ? styles.overlayCall : styles.overlayChat]}>
      <Animated.View
        style={[
          styles.card,
          mode === 'call' ? styles.cardCall : styles.cardChat,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        {gift.iconUrl ? (
          <Image source={{ uri: gift.iconUrl }} style={styles.iconImage} />
        ) : (
          <Text style={styles.emoji}>{gift.emojiFallback || '🎁'}</Text>
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
  overlayCall: {
    justifyContent: 'flex-start',
    paddingTop: 120,
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
    backgroundColor: 'rgba(18,18,26,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accentMagenta,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  sparkle: {
    position: 'absolute',
    right: 28,
    bottom: 114,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    backgroundColor: 'rgba(18,18,26,0.94)',
  },
  cardChat: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardCall: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconImage: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
  },
  emoji: {
    fontSize: 42,
  },
  callIconImage: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.bgTertiary,
  },
  callEmoji: {
    fontSize: 40,
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
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

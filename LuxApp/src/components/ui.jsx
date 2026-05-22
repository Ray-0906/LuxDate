import React, { useState, useEffect, useCallback } from 'react';
import { Text, TextInput, StyleSheet, View, Pressable, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming, withDelay } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme/theme.js';

const { width: scrW, height: scrH } = Dimensions.get('window');

export function MeshBackground() {
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.bgPrimary }]} pointerEvents="none">
      {/* Magenta Radial Glow top-right */}
      <View style={{
        position: 'absolute', top: -scrH * 0.1, right: -scrW * 0.2, 
        width: scrW * 1.2, height: scrW * 1.2, borderRadius: (scrW * 1.2)/2,
        backgroundColor: theme.colors.accentMagenta, opacity: 0.08,
      }} />
      {/* Cyan Radial Glow bottom-left */}
      <View style={{
        position: 'absolute', bottom: -scrH * 0.1, left: -scrW * 0.2, 
        width: scrW * 1.0, height: scrW * 1.0, borderRadius: (scrW * 1.0)/2,
        backgroundColor: theme.colors.accentCyan, opacity: 0.05,
      }} />
      {/* Scattered Star Dots */}
      <View style={[styles.star, { top: '15%', left: '20%', opacity: 0.4 }]} />
      <View style={[styles.star, { top: '25%', right: '15%', opacity: 0.3 }]} />
      <View style={[styles.star, { top: '45%', left: '80%', opacity: 0.5 }]} />
      <View style={[styles.star, { bottom: '30%', left: '10%', opacity: 0.3 }]} />
      <View style={[styles.star, { bottom: '15%', right: '25%', opacity: 0.4 }]} />
    </View>
  );
}

function LoadingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, true);
    dot2.value = withRepeat(withSequence(withDelay(150, withTiming(1, { duration: 400 })), withTiming(0.3, { duration: 400 })), -1, true);
    dot3.value = withRepeat(withSequence(withDelay(300, withTiming(1, { duration: 400 })), withTiming(0.3, { duration: 400 })), -1, true);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.loadingWrap}>
      <Animated.View style={[styles.loadingDot, style1]} />
      <Animated.View style={[styles.loadingDot, style2]} />
      <Animated.View style={[styles.loadingDot, style3]} />
    </View>
  );
}

export function GlowingText({ children, style, glowColor = theme.colors.accentMagenta }) {
  return (
    <Text style={[style, { textShadowColor: glowColor, textShadowOffset: {width: 0, height: 0}, textShadowRadius: 8 }]}>
      {children}
    </Text>
  );
}

export function PremiumButton({ title, onPress, disabled, style, textStyle, colors = theme.gradients.primary, glowType = theme.shadow.glowMagenta }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => { scale.value = withSpring(0.97, { damping: 15 }); }, [scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1, { damping: 15 }); }, [scale]);

  const isGradient = Array.isArray(colors);

  return (
    <Animated.View style={[animatedStyle, style, !disabled && glowType]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btnPressable,
          disabled && styles.btnDisabled,
        ]}
      >
        {isGradient && !disabled ? (
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            {disabled ? null : (typeof title === 'string' ? <Text style={[styles.btnText, textStyle]}>{title}</Text> : title)}
          </LinearGradient>
        ) : (
          <View style={[styles.btnGradient, { backgroundColor: disabled ? '#1A1A2E' : (typeof colors === 'string' ? colors : theme.colors.accentMagenta) }]}>
            {disabled && title === 'TRANSMITTING...' ? (
              <LoadingDots />
            ) : disabled && title === 'VERIFYING...' ? (
              <LoadingDots />
            ) : disabled && title === 'Creating Profile...' ? (
              <LoadingDots />
            ) : (
              typeof title === 'string' ? <Text style={[styles.btnText, textStyle]}>{title}</Text> : title
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function GlassCard({ children, style }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

export function CircularIconButton({ icon, onPress, color = theme.colors.accentMagenta, size = 56, style, glowType }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
  const isGradient = Array.isArray(color);

  return (
    <Animated.View style={[animatedStyle, style, glowType]}>
      <Pressable
        style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}
        onPress={onPress}
        onPressIn={() => scale.value = withSpring(0.9, { damping: 15 })}
        onPressOut={() => scale.value = withSpring(1, { damping: 15 })}
      >
        {isGradient ? (
          <LinearGradient
            colors={color}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: size * 0.4, color: '#FFF' }}>{icon}</Text>
          </LinearGradient>
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.4, color: '#FFF' }}>{icon}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function GlassInput({ value, onChangeText, placeholder, style, onFocus, onBlur, ...props }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      onFocus={(e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
      }}
      style={[
        styles.glassInput,
        isFocused && styles.glassInputFocused,
        style
      ]}
      selectionColor={theme.colors.accentMagenta}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 3,
  },
  glassInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 16,
    height: 56,
  },
  glassInputFocused: {
    borderColor: 'rgba(233,30,140,0.6)',
    backgroundColor: 'rgba(233,30,140,0.02)',
  },
  btnPressable: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: theme.typography.fontBody,
    fontWeight: 'bold',
  },
  glassCard: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  }
});
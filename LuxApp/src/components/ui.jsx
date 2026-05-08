import React, { useCallback } from 'react';
import { Text, TextInput, StyleSheet, View, Pressable, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import theme from '../theme/theme.js';

const { width: scrW, height: scrH } = Dimensions.get('window');

export function MeshBackground() {
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.bgPrimary }]} pointerEvents="none">
      <View style={{
        position: 'absolute', top: -scrH * 0.1, left: -scrW * 0.2, 
        width: scrW, height: scrW, borderRadius: scrW/2,
        backgroundColor: theme.colors.accentMagenta, opacity: 0.05,
        transform: [{ scale: 1.5 }]
      }} />
      <View style={{
        position: 'absolute', bottom: -scrH * 0.1, right: -scrW * 0.2, 
        width: scrW, height: scrW, borderRadius: scrW/2,
        backgroundColor: theme.colors.accentViolet, opacity: 0.05,
        transform: [{ scale: 1.5 }]
      }} />
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

export function PremiumButton({ title, onPress, disabled, style, textStyle, color = theme.colors.accentMagenta, glowType = theme.shadow.glowMagenta }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => { scale.value = withSpring(0.96, { damping: 15 }); }, [scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1, { damping: 15 }); }, [scale]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={[
          styles.btn, 
          disabled && styles.btnDisabled,
          { backgroundColor: color },
          glowType
        ]}
        onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}
      >
        <Text style={[styles.btnText, textStyle]}>{title}</Text>
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
  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }, glowType]}
        onPress={onPress} onPressIn={() => scale.value = withSpring(0.9)} onPressOut={() => scale.value = withSpring(1)}
      >
        <Text style={{ fontSize: size * 0.4, color: '#FFF' }}>{icon}</Text>
      </Pressable>
    </Animated.View>
  );
}
export function GlassInput({ value, onChangeText, placeholder, style, ...props }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      style={[styles.glassInput, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
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
  },
  btn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.colors.textPrimary, fontSize: 16, fontFamily: theme.typography.fontBody, fontWeight: 'bold' },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.borderGlass,
  }
});
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../theme/theme.js';

export default function FloatingCheckinButton({ onPress, onDismiss, coins = 0 }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.dismiss} onPress={onDismiss} hitSlop={10}>
        <Ionicons name="close" size={14} color={theme.colors.textPrimary} />
      </Pressable>
      <Pressable onPress={onPress} style={styles.pressable}>
        <LinearGradient
          colors={theme.gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <View style={styles.iconBubble}>
            <Ionicons name="diamond" size={20} color="#3A2E00" />
          </View>
          <Text style={styles.title}>Daily Check-in</Text>
          <Text style={styles.sub}>+{coins} today</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 128,
    zIndex: 30,
  },
  dismiss: {
    position: 'absolute',
    top: -8,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  pressable: {
    borderRadius: 24,
    shadowColor: theme.colors.accentGold,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  button: {
    minHeight: 126,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3A2E00',
    fontFamily: theme.typography.fontDisplay,
  },
  sub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E3D02',
    fontFamily: theme.typography.fontBody,
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, Pressable, Dimensions, Vibration,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { callsApi } from '../../api/services.js';

const { width: W, height: H } = Dimensions.get('window');

export default function IncomingCallScreen({ route, navigation }) {
  const callData = route.params?.callData || route.params || {};
  const { girl, callId, triggerType, videoUrl, callType } = callData;
  const timerRef = useRef(null);

  // Pulse animation for accept button
  const pulseScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.3);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800 }),
        withTiming(0.2, { duration: 800 })
      ), -1, true
    );

    // Vibrate on incoming call
    Vibration.vibrate([0, 500, 200, 500, 200, 500], false);

    // Auto-miss after 30 seconds
    timerRef.current = setTimeout(() => handleMiss(), 30000);

    return () => {
      Vibration.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const handleAccept = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Vibration.cancel();
    
    try {
      let finalCallData = { ...callData };
      if (callId) {
        const response = await callsApi.accept(callId);
        const { coinBalance, costPerMinute } = response?.data?.data || {};
        if (coinBalance !== undefined) finalCallData.coinBalance = coinBalance;
        if (costPerMinute !== undefined) finalCallData.costPerMinute = costPerMinute;
      }
      // Navigate to video call screen on success
      navigation.replace('VideoCall', {
        callData: finalCallData
      });
    } catch (e) {
      // 402 Payment Required or other error
      console.log('Accept call failed:', e?.response?.data || e.message);
      // For now, close the modal. Later hook up to Coin Recharge modal!
      navigation.goBack();
    }
  };

  const handleDecline = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Vibration.cancel();
    try {
      await callsApi.end(callId, { status: 'declined' });
    } catch {}
    navigation.goBack();
  };

  const handleMiss = async () => {
    Vibration.cancel();
    try {
      await callsApi.end(callId, { status: 'missed' });
    } catch {}
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      {/* Background image blur effect */}
      <Image
        source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/400' }}
        style={styles.bgImage}
        blurRadius={25}
      />
      <View style={styles.overlay} />

      {/* Caller info */}
      <View style={styles.callerSection}>
        <Animated.View style={[styles.avatarRing, ringStyle]}>
          <View style={styles.avatarRingInner} />
        </Animated.View>
        <Image
          source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/120' }}
          style={styles.avatar}
        />
        <Text style={styles.callerName}>{girl?.name || 'Unknown'}</Text>
        <Text style={styles.callerStatus}>Incoming Video Call...</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Decline */}
        <Pressable style={[styles.actionBtn, styles.declineBtn]} onPress={handleDecline}>
          <Ionicons name="close" size={32} color="#FFF" />
        </Pressable>

        {/* Accept */}
        <Animated.View style={pulseStyle}>
          <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept}>
            <Ionicons name="videocam" size={32} color="#FFF" />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.labels}>
        <Text style={styles.labelText}>Decline</Text>
        <Text style={styles.labelText}>Accept</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  bgImage: { position: 'absolute', width: W, height: H, opacity: 0.4 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.6)',
  },
  callerSection: { alignItems: 'center', marginBottom: 80 },
  avatarRing: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    borderWidth: 2, borderColor: theme.colors.accentMagenta,
  },
  avatarRingInner: {
    width: '100%', height: '100%', borderRadius: 70,
  },
  avatar: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: theme.colors.accentMagenta,
    marginTop: 10,
  },
  callerName: {
    fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  callerStatus: {
    fontSize: 14, color: theme.colors.textSecondary, marginTop: 6,
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row', gap: 60, alignItems: 'center',
  },
  actionBtn: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: { backgroundColor: theme.colors.accentRed },
  acceptBtn: {
    backgroundColor: theme.colors.accentGreen,
    ...theme.shadow.glowGreen,
  },
  labels: {
    flexDirection: 'row', gap: 60, marginTop: 16,
    width: 200, justifyContent: 'space-between',
  },
  labelText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
});

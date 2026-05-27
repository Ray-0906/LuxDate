// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, Pressable, Dimensions, Vibration, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import { callsApi } from '../../api/services.js';
import CoinPackSheet from '../../components/CoinPackSheet.jsx';
import usePermissionStore from '../../store/permissionStore.js';

const { width: W, height: H } = Dimensions.get('window');

export default function IncomingCallScreen({ route, navigation }) {
  const callData = route.params?.callData || route.params || {};
  const { girl, callId, callType } = callData;
  const timerRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const [showCoinSheet, setShowCoinSheet] = useState(false);
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const openAppSettings = usePermissionStore((s) => s.openAppSettings);

  // Pulse animation for accept button
  const pulseScale = useSharedValue(1);
  
  // Double pulsing rings for caller avatar
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.8);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.8);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    );

    // Start ring 1 immediately
    ring1Scale.value = withRepeat(
      withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Stagger ring 2 by 1000ms
    ringTimeoutRef.current = setTimeout(() => {
      ring2Scale.value = withRepeat(
        withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 1000);

    // Vibrate on incoming call
    Vibration.vibrate([0, 500, 200, 500, 200, 500], false);

    // Auto-miss after 30 seconds
    timerRef.current = setTimeout(() => handleMiss(), 30000);

    return () => {
      Vibration.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ensureCallPermissions = async () => {
    const cameraGranted = await requestPermission('camera');
    if (!cameraGranted) {
      const blocked = usePermissionStore.getState().statuses.camera === 'blocked';
      Alert.alert(
        'Camera permission needed',
        blocked
          ? 'Please enable camera access from Android settings before joining the call.'
          : 'Please allow camera access before joining the call.',
        blocked
          ? [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openAppSettings().catch(() => {}) },
            ]
          : [{ text: 'OK', style: 'default' }]
      );
      return false;
    }

    const microphoneGranted = await requestPermission('microphone');
    if (!microphoneGranted) {
      const blocked = usePermissionStore.getState().statuses.microphone === 'blocked';
      Alert.alert(
        'Microphone permission needed',
        blocked
          ? 'Please enable microphone access from Android settings before joining the call.'
          : 'Please allow microphone access before joining the call.',
        blocked
          ? [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openAppSettings().catch(() => {}) },
            ]
          : [{ text: 'OK', style: 'default' }]
      );
      return false;
    }

    return true;
  };

  const handleAccept = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Vibration.cancel();
    
    try {
      const permissionsReady = await ensureCallPermissions();
      if (!permissionsReady) {
        timerRef.current = setTimeout(() => handleMiss(), 30000);
        return;
      }
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
      console.log('Accept call failed:', e?.response?.data || e.message);
      const st = e?.response?.status;
      const paywall = e?.response?.data?.paywallType;
      if (st === 402 || paywall === 'coins_only' || paywall === 'insufficient_coins') {
        setShowCoinSheet(true);
      } else {
        navigation.goBack();
      }
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
        blurRadius={20}
      />
      {/* Top and Bottom cinematic gradients for vignette effect */}
      <LinearGradient
        colors={['rgba(10,10,15,0.85)', 'rgba(10,10,15,0.45)', 'rgba(10,10,15,0.95)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Caller info */}
      <View style={styles.callerSection}>
        <View style={styles.avatarWrapper}>
          {/* Double pulsing rings */}
          <Animated.View style={[styles.avatarRing, ring1Style]} />
          <Animated.View style={[styles.avatarRing, ring2Style]} />
          
          <Image
            source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.callerName}>{girl?.name || 'Unknown'}</Text>
        <Text style={styles.callerStatus}>
          {callType === 'voice' ? 'Incoming Audio Call...' : 'Incoming Video Call...'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {/* Decline */}
        <View style={styles.actionColumn}>
          <Pressable style={[styles.actionBtn, styles.declineBtn]} onPress={handleDecline}>
            <Ionicons name="close" size={32} color="#FFF" />
          </Pressable>
          <Text style={styles.labelText}>Decline</Text>
        </View>

        {/* Accept */}
        <View style={styles.actionColumn}>
          <Animated.View style={pulseStyle}>
            <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept}>
              <Ionicons name={callType === 'voice' ? 'call' : 'videocam'} size={30} color="#FFF" />
            </Pressable>
          </Animated.View>
          <Text style={styles.labelText}>Accept</Text>
        </View>
      </View>

      <CoinPackSheet
        visible={showCoinSheet}
        onClose={() => setShowCoinSheet(false)}
        context="call"
        onSuccess={() => {
          setShowCoinSheet(false);
          handleAccept();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 100 },
  bgImage: { position: 'absolute', width: W, height: H },
  callerSection: { alignItems: 'center', marginTop: 60 },
  avatarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: theme.colors.accentMagenta,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: '#FFF',
  },
  callerName: {
    fontFamily: theme.typography.fontDisplay,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 4 },
  },
  callerStatus: {
    fontFamily: theme.typography.fontBody,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 8,
    letterSpacing: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  actionColumn: {
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineBtn: {
    backgroundColor: theme.colors.accentRed,
    shadowColor: theme.colors.accentRed,
  },
  acceptBtn: {
    backgroundColor: theme.colors.accentGreen,
    shadowColor: theme.colors.accentGreen,
  },
  labelText: {
    fontFamily: theme.typography.fontBody,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

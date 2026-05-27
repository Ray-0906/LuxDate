// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Pressable, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../theme/theme.js';
import { callsApi } from '../../api/services.js';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import TriggerEngine from '../../engines/TriggerEngine.js';
import CoinPackSheet from '../../components/CoinPackSheet.jsx';
import LinearGradient from 'react-native-linear-gradient';
import usePermissionStore from '../../store/permissionStore.js';

const { width: W, height: H } = Dimensions.get('window');

export default function OutgoingCallScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { girl } = route.params;
  const ringTimeoutRef = useRef(null);

  const [statusText, setStatusText] = useState('Calling...');
  const [showCoinSheet, setShowCoinSheet] = useState(false);
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const openAppSettings = usePermissionStore((s) => s.openAppSettings);

  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.6);

  const ensureCallPermissions = useCallback(async () => {
    const cameraGranted = await requestPermission('camera');
    if (!cameraGranted) {
      const blocked = usePermissionStore.getState().statuses.camera === 'blocked';
      Alert.alert(
        'Camera permission needed',
        blocked
          ? 'Please enable camera access from Android settings before placing the call.'
          : 'Please allow camera access before placing the call.',
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
          ? 'Please enable microphone access from Android settings before placing the call.'
          : 'Please allow microphone access before placing the call.',
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
  }, [openAppSettings, requestPermission]);

  const tryAccept = useCallback(async () => {
    setStatusText('Connecting...');
    try {
      const permissionsReady = await ensureCallPermissions();
      if (!permissionsReady) {
        setStatusText('Camera and mic access needed.');
        return;
      }
      const res = await callsApi.accept(girl._id, { params: { isDirect: true } });
      const data = res.data.data;

      navigation.replace('VideoCall', {
        callData: {
          callId: data.session._id,
          girl,
          videoUrl: girl.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
          callType: data.session.callType,
          coinBalance: data.coinBalance,
          costPerMinute: data.costPerMinute,
        },
      });
    } catch (err) {
      const st = err?.response?.status;
      const paywall = err?.response?.data?.paywallType;
      if (st === 402 || paywall === 'coins_only' || paywall === 'insufficient_coins') {
        setShowCoinSheet(true);
        setStatusText('Need more coins to connect.');
      } else {
        setStatusText('Failed to connect or insufficient coins.');
        setTimeout(() => navigation.goBack(), 2000);
      }
    }
  }, [ensureCallPermissions, girl, navigation]);

  useEffect(() => {
    TriggerEngine.setBlockedContext(true);

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type !== 'REPLACE') {
        TriggerEngine.setBlockedContext(false);
      }
    });

    ring1Scale.value = withRepeat(
      withTiming(2.0, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    ringTimeoutRef.current = setTimeout(() => {
      ring2Scale.value = withRepeat(
        withTiming(2.0, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withTiming(0, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 1250);

    return () => {
      unsubscribe();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, navigation]);

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));

  useEffect(() => {
    const ringDuration = Math.floor(Math.random() * 5000) + 10000;
    const timeout = setTimeout(() => {
      tryAccept();
    }, ringDuration);
    return () => clearTimeout(timeout);
  }, [tryAccept]);

  const handleHangup = () => {
    TriggerEngine.setBlockedContext(false);
    navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Image
        source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/400' }}
        style={styles.bgImage}
        blurRadius={20}
      />
      <LinearGradient
        colors={['rgba(10,10,15,0.85)', 'rgba(10,10,15,0.5)', 'rgba(10,10,15,0.95)']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.callerSection}>
        <View style={styles.avatarWrapper}>
          <Animated.View style={[styles.avatarRing, ring1Style]} />
          <Animated.View style={[styles.avatarRing, ring2Style]} />
          <Image
            source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.callerName}>{girl?.name || 'Unknown'}</Text>
        <Text style={styles.callerStatus}>{statusText}</Text>
      </View>

      {/* Gold Banner for Out of Coins */}
      {showCoinSheet && (
        <Pressable onPress={() => setShowCoinSheet(true)} style={styles.goldBanner}>
          <LinearGradient
            colors={theme.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.goldBannerGradient}
          >
            <Ionicons name="wallet-outline" size={16} color="#4E3B00" />
            <Text style={styles.goldBannerText}>Insufficient Balance. Top Up Coins Now →</Text>
          </LinearGradient>
        </Pressable>
      )}

      <View style={[styles.actions, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={styles.actionBtnContainer} onPress={handleHangup}>
          <View style={[styles.actionBtn, styles.declineBtn]}>
            <Ionicons name="call" size={30} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </View>
        </TouchableOpacity>
      </View>

      <CoinPackSheet
        visible={showCoinSheet}
        onClose={() => setShowCoinSheet(false)}
        context="call"
        onSuccess={() => {
          setShowCoinSheet(false);
          tryAccept();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' },
  bgImage: { position: 'absolute', width: W, height: H },
  callerSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: theme.colors.accentMagenta,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: '#FFF',
    zIndex: 2,
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
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  goldBanner: {
    width: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: theme.colors.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  goldBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  goldBannerText: {
    fontFamily: theme.typography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    color: '#3A2E00',
  },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  actionBtnContainer: { alignItems: 'center' },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accentRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineBtn: { backgroundColor: theme.colors.accentRed },
});

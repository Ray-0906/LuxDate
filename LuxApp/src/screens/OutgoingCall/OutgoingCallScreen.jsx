import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated as RNAnimated, Dimensions, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../theme/theme.js';
import { callsApi } from '../../api/services.js';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import TriggerEngine from '../../engines/TriggerEngine.js';

const { width: W, height: H } = Dimensions.get('window');

export default function OutgoingCallScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { girl } = route.params;

  const [statusText, setStatusText] = useState('Calling...');
  
  const pulseScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    TriggerEngine.setBlockedContext(true);
    
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If we are navigating to VideoCall (replace), keep it blocked
      // Otherwise, if going back or elsewhere, unblock.
      if (e.data.action.type !== 'REPLACE') {
        TriggerEngine.setBlockedContext(false);
      }
    });

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 })
      ),
      -1,
      false
    );

    return () => {
      unsubscribe();
    };
  }, [pulseScale, ringOpacity, navigation]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    // Simulate 10-15 seconds wait
    const ringDuration = Math.floor(Math.random() * 5000) + 10000; // 10k to 15k ms

    const timeout = setTimeout(async () => {
      setStatusText('Connecting...');
      
      try {
        // We simulate a direct pick up by accepting a call for this girl
        const res = await callsApi.accept(girl._id, { params: { isDirect: true } });
        const data = res.data.data;
        
        navigation.replace('VideoCall', {
          callData: {
            callId: data.session._id,
            girl,
            videoUrl: girl.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
            callType: data.session.callType,
            coinBalance: data.coinBalance,
            costPerMinute: data.costPerMinute
          }
        });
      } catch (err) {
        setStatusText('Failed to connect or insufficient coins.');
        setTimeout(() => navigation.goBack(), 2000);
      }
    }, ringDuration);

    return () => clearTimeout(timeout);
  }, [girl, navigation]);

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
      <View style={styles.overlay} />

      <View style={styles.callerSection}>
        <Animated.View style={[styles.avatarRing, ringStyle]}>
          <View style={styles.avatarRingInner} />
        </Animated.View>
        <Image
          source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/120' }}
          style={styles.avatar}
        />
        <Text style={styles.callerName}>{girl?.name || 'Unknown'}</Text>
        <Text style={styles.callerStatus}>{statusText}</Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.actionBtnContainer} onTouchEnd={handleHangup}>
          <View style={[styles.actionBtn, styles.declineBtn]}>
            <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  bgImage: { position: 'absolute', width: W, height: H, opacity: 0.3 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  callerSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    position: 'absolute', width: 220, height: 220,
    borderRadius: 110, backgroundColor: 'transparent',
    borderWidth: 2, borderColor: theme.colors.accentMagenta,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRingInner: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: theme.colors.accentMagenta, opacity: 0.2,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#FFF' },
  callerName: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 24 },
  callerStatus: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  actionBtnContainer: { alignItems: 'center' },
  actionBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  declineBtn: { backgroundColor: theme.colors.accentRed },
});
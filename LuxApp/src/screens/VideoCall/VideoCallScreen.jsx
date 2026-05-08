import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Image, ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { VideoView, useVideoPlayer } from 'react-native-video';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import theme from '../../theme/theme.js';
import { callsApi } from '../../api/services.js';

const { width: W, height: H } = Dimensions.get('window');

/**
 * VideoCallScreen — plays pre-recorded HLS video as "live call".
 */
export default function VideoCallScreen({ route, navigation }) {
  const callData = route.params?.callData || route.params || {};
  const { girl, callId, videoUrl, triggerType, callType } = callData;
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Camera hooks
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null, p => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return;
    const subLoad = player.addEventListener('onLoad', () => setIsVideoReady(true));
    const subReady = player.addEventListener('onReadyToDisplay', () => setIsVideoReady(true));
    const subError = player.addEventListener('onError', e => console.log('Video Error:', e));
    return () => {
      subLoad.remove();
      subReady.remove();
      subError.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  useEffect(() => {
    // Start timer
    timerRef.current = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(currentElapsed);
      
      // Free Call 30s Limit Cutoff
      if (callType?.toUpperCase() === 'FREE' && currentElapsed >= 30) {
        handleEnd(); // End the call exactly at 30s
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callType]);

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const handleEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await callsApi.end(callId, { status: 'accepted' });
    } catch {}
    if (navigation.canGoBack()) {
        navigation.goBack();
    }
  };

  return (
    <View style={styles.root}>
      {/* Video or placeholder */}
      {videoUrl && player && (
        <View style={{ width: W, height: H, position: 'absolute', top: 0, left: 0 }}>
          <VideoView
            player={player}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Loading Overlay */}
      {(!videoUrl || !isVideoReady) && (
        <View style={styles.videoPlaceholder}>
          <Image
            source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/400' }}
            style={styles.placeholderImg}
            blurRadius={15}
            resizeMode="cover"
          />
          <View style={styles.placeholderOverlay}>
            {videoUrl && <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />}
            <Text style={styles.connectingText}>
              {videoUrl ? 'Connecting...' : 'No Video'}
            </Text>
          </View>
        </View>
      )}

      {/* Local User PiP Camera */}
      {hasPermission && device && (
        <View style={styles.pipContainer}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
          />
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.callerInfo}>
          <Image
            source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/40' }}
            style={styles.smallAvatar}
          />
          <View>
            <Text style={styles.callerName}>{girl?.name || 'Unknown'}</Text>
            <Text style={styles.timer}>{formatTime(elapsed)}</Text>
          </View>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#FFF" />
        </Pressable>

        <Pressable style={[styles.controlBtn, styles.endCallBtn]} onPress={handleEnd}>
          <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>

        <Pressable style={styles.controlBtn}>
          <Ionicons name="gift-outline" size={24} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { position: 'absolute', width: W, height: H },
  videoPlaceholder: { position: 'absolute', width: W, height: H },
  placeholderImg: { width: '100%', height: '100%', opacity: 0.6 },
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pipContainer: {
    position: 'absolute', top: 120, right: 20,
    width: 110, height: 160, borderRadius: 16,
    overflow: 'hidden', backgroundColor: '#333',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  callerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallAvatar: { width: 40, height: 40, borderRadius: 20 },
  callerName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  timer: { fontSize: 13, color: theme.colors.accentGreen, fontWeight: '600', marginTop: 1 },
  connectingText: { fontSize: 18, fontWeight: '600', color: '#FFF', letterSpacing: 1 },
  controls: {
    position: 'absolute', bottom: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30,
  },
  controlBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.colors.accentRed,
  },
});

// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { VideoView, useVideoPlayer } from 'react-native-video';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import theme from '../../theme/theme.js';
import { callsApi, coinsApi } from '../../api/services.js';
import useAuthStore from '../../store/authStore.js';
import TriggerEngine from '../../engines/TriggerEngine.js';
import GiftPickerModal from '../../components/GiftPickerModal.jsx';
import GiftBurstOverlay from '../../components/GiftBurstOverlay.jsx';
import InsufficientCoinsModal from '../../components/InsufficientCoinsModal.jsx';
import CoinPackSheet from '../../components/CoinPackSheet.jsx';
import useChatUIStore from '../../store/chatUIStore.js';
import socketService from '../../api/socket.js';
import useAppSettingsStore from '../../store/appSettingsStore.js';

const { width: W, height: H } = Dimensions.get('window');

export default function VideoCallScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const callData = route.params?.callData || route.params || {};
  const user = useAuthStore((state) => state.user);
  const callSettings = useAppSettingsStore((s) => s.settings.calls);
  const defaultCallRate = user?.isVip ? callSettings.vipRate : callSettings.nonVipRate;
  const { girl, callId, videoUrl, callType, coinBalance, costPerMinute = defaultCallRate } = callData;
  const loadProfile = useAuthStore((state) => state.loadProfile);
  const setActiveCallGirlId = useChatUIStore((state) => state.setActiveCallGirlId);

  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isLocalVideoDisabled, setIsLocalVideoDisabled] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [liveCoinBalance, setLiveCoinBalance] = useState(coinBalance || 0);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showCoinPackSheet, setShowCoinPackSheet] = useState(false);
  const [coinsModalBalance, setCoinsModalBalance] = useState(0);
  const [coinsModalRequired, setCoinsModalRequired] = useState(0);
  const [giftBurst, setGiftBurst] = useState(null);
  const [reactionOverlay, setReactionOverlay] = useState(null);
  const [levelToast, setLevelToast] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const giftBurstTimerRef = useRef(null);

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  useEffect(() => {
    TriggerEngine.setBlockedContext(true);
    TriggerEngine.cancelScheduled();
    setActiveCallGirlId(girl?._id);
    return () => {
      TriggerEngine.setBlockedContext(false);
      setActiveCallGirlId(null);
    };
  }, [girl?._id, setActiveCallGirlId]);

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return undefined;
    const subLoad = player.addEventListener('onLoad', () => {
      setIsVideoReady(true);
      startTimeRef.current = Date.now();
    });
    const subReady = player.addEventListener('onReadyToDisplay', () => {
      setIsVideoReady(true);
      startTimeRef.current = Date.now();
    });
    const subError = player.addEventListener('onError', (e) => console.log('Video Error:', e));
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
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const handleNewMessage = (data) => {
      if (String(data?.girlProfileId) !== String(girl?._id)) return;
      if (data?.source === 'auto_reply' && data?.content?.text) {
        setReactionOverlay(data.content.text);
      }
    };

    socketService.onNewMessage(handleNewMessage);
    return () => socketService.offNewMessage(handleNewMessage);
  }, [girl?._id]);

  useEffect(() => {
    if (!giftBurst) return undefined;
    const timeout = setTimeout(() => setGiftBurst(null), 1800);
    return () => clearTimeout(timeout);
  }, [giftBurst]);

  useEffect(() => () => {
    if (giftBurstTimerRef.current) {
      clearTimeout(giftBurstTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!reactionOverlay) return undefined;
    const timeout = setTimeout(() => setReactionOverlay(null), 2600);
    return () => clearTimeout(timeout);
  }, [reactionOverlay]);

  useEffect(() => {
    if (!levelToast) return undefined;
    const timeout = setTimeout(() => setLevelToast(null), 2200);
    return () => clearTimeout(timeout);
  }, [levelToast]);

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const handleEnd = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let finalBalance = liveCoinBalance;
    try {
      const res = await callsApi.end(callId, { status: 'accepted' });
      if (res?.data?.data?.coinBalance !== undefined) {
        finalBalance = res.data.data.coinBalance;
        const authStore = useAuthStore.getState();
        authStore.setUser({ ...authStore.user, coinBalance: res.data.data.coinBalance });
        setLiveCoinBalance(res.data.data.coinBalance);
      }
      await loadProfile();
      const u = useAuthStore.getState().user;
      if (u?.coinBalance != null) finalBalance = u.coinBalance;
    } catch (e) {
      console.log('End call error:', e);
    }

    let costPerMin = costPerMinute;
    try {
      const econ = await coinsApi.economy();
      costPerMin = econ.data?.data?.callCostPerMinute ?? costPerMin;
    } catch { /* use passed cost */ }

    const threshold = (costPerMin || 10) * 2;
    if (finalBalance < threshold) {
      navigation.navigate('MainTabs', {
        screen: 'Me',
        params: { postCallTopUp: { balance: finalBalance } },
      });
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Inbox');
    }
  }, [callId, costPerMinute, liveCoinBalance, loadProfile, navigation]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isVideoReady) return;
      const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(currentElapsed);

      if (callType?.toUpperCase() === 'FREE' && currentElapsed >= 30) {
        handleEnd();
      }

      if (callType?.toUpperCase() === 'PAID') {
        const safeCoinBalance = liveCoinBalance || 0;
        const safeCostPerMinute = costPerMinute || 10;
        const maxTimeInSeconds = Math.floor(safeCoinBalance / safeCostPerMinute) * 60;
        if (currentElapsed >= maxTimeInSeconds) {
          handleEnd();
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callType, costPerMinute, handleEnd, isVideoReady, liveCoinBalance]);

  const handleGiftSent = (result) => {
    setShowGiftPicker(false);
    setLiveCoinBalance(result.coinBalance);
    if (giftBurstTimerRef.current) {
      clearTimeout(giftBurstTimerRef.current);
    }
    giftBurstTimerRef.current = setTimeout(() => {
      setGiftBurst({
        gift: result.selectedGift,
        quantity: result.quantity,
      });
    }, 240);
    if (result.wealthLevelChanged) {
      setLevelToast(`Wealth Level ${result.wealthLevel}!`);
    }
  };

  return (
    <View style={styles.root}>
      {videoUrl && player && (
        <View style={{ width: W, height: H, position: 'absolute', top: 0, left: 0 }}>
          <VideoView
            player={player}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}

      {(!videoUrl || !isVideoReady) && (
        <View style={styles.videoPlaceholder}>
          <Image
            source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/400' }}
            style={styles.placeholderImg}
            blurRadius={15}
            resizeMode="cover"
          />
          <View style={styles.placeholderOverlay}>
            {videoUrl && <ActivityIndicator size="large" color={theme.colors.accentMagenta} style={{ marginBottom: 16 }} />}
            <Text style={styles.connectingText}>
              {videoUrl ? 'Connecting...' : 'No Video'}
            </Text>
          </View>
        </View>
      )}

      {hasPermission && device && !isLocalVideoDisabled && (
        <View style={[styles.pipContainer, { top: insets.top + 80 }]}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
          />
        </View>
      )}

      {levelToast ? (
        <View style={[styles.levelToast, { top: insets.top + 90 }]}>
          <LinearGradient
            colors={theme.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.levelToastGradient}
          >
            <Ionicons name="sparkles" size={14} color="#3A2E00" />
            <Text style={styles.levelToastText}>{levelToast}</Text>
          </LinearGradient>
        </View>
      ) : null}

      {reactionOverlay ? (
        <View style={[styles.reactionOverlay, { top: insets.top + 150 }]}>
          <Text style={styles.reactionOverlayText}>{reactionOverlay}</Text>
        </View>
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
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

        <View style={styles.topBarRight}>
          <Pressable
            style={[styles.miniControlBtn, isMuted && styles.miniControlBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>

      <GiftBurstOverlay
        visible={!!giftBurst}
        gift={giftBurst?.gift}
        quantity={giftBurst?.quantity}
        mode="call"
        subtitle="Sent during call"
      />

      <View style={[styles.controls, { bottom: insets.bottom + 20 }]}>
        <Pressable
          style={[styles.controlBtn, isMicMuted && styles.controlBtnActive]}
          onPress={() => setIsMicMuted(!isMicMuted)}
        >
          <Ionicons name={isMicMuted ? 'mic-off' : 'mic'} size={22} color="#FFF" />
        </Pressable>

        <Pressable
          style={[styles.controlBtn, isLocalVideoDisabled && styles.controlBtnActive]}
          onPress={() => setIsLocalVideoDisabled(!isLocalVideoDisabled)}
        >
          <Ionicons name={isLocalVideoDisabled ? 'videocam-off' : 'videocam'} size={22} color="#FFF" />
        </Pressable>

        <Pressable style={[styles.controlBtn, styles.endCallBtn]} onPress={handleEnd}>
          <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>

        <Pressable style={[styles.controlBtn, styles.giftBtn]} onPress={() => setShowGiftPicker(true)}>
          <Ionicons name="gift" size={22} color={theme.colors.accentGoldLight} />
        </Pressable>
      </View>

      <GiftPickerModal
        visible={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        girlId={girl?._id}
        callSessionId={callId}
        variant="call"
        onGiftSent={handleGiftSent}
        onInsufficientCoins={(result) => {
          setCoinsModalBalance(result.coinBalance || 0);
          setCoinsModalRequired(result.requiredCoins || 0);
          setShowCoinsModal(true);
        }}
      />

      <InsufficientCoinsModal
        visible={showCoinsModal}
        coinBalance={coinsModalBalance}
        requiredCoins={coinsModalRequired}
        onClose={() => setShowCoinsModal(false)}
        onBuyCoins={() => {
          setShowCoinsModal(false);
          setShowCoinPackSheet(true);
        }}
        onGoWallet={() => {
          setShowCoinsModal(false);
          navigation.navigate('Wallet');
        }}
      />

      <CoinPackSheet
        visible={showCoinPackSheet}
        onClose={() => setShowCoinPackSheet(false)}
        context="call"
        requiredCoins={coinsModalRequired}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0F' },
  videoPlaceholder: { position: 'absolute', width: W, height: H },
  placeholderImg: { width: '100%', height: '100%', opacity: 0.6 },
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(22,22,37,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    zIndex: 10,
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  pipContainer: {
    position: 'absolute',
    right: 16,
    width: 96,
    height: 144,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: theme.colors.accentCyan,
    shadowColor: theme.colors.accentCyan,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 9,
  },
  callerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  callerName: { fontFamily: theme.typography.fontDisplay, fontSize: 14, fontWeight: '700', color: '#FFF' },
  timer: { fontFamily: theme.typography.fontBody, fontSize: 12, color: theme.colors.accentGreen, fontWeight: '600', marginTop: 1 },
  connectingText: { fontFamily: theme.typography.fontDisplay, fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 1 },
  controls: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'rgba(22,22,37,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30,
    paddingVertical: 12,
    zIndex: 10,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  miniControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  controlBtnActive: { backgroundColor: theme.colors.accentMagenta, borderColor: theme.colors.accentMagenta },
  miniControlBtnActive: { backgroundColor: theme.colors.accentMagenta, borderColor: theme.colors.accentMagenta },
  endCallBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.accentRed,
    borderColor: theme.colors.accentRed,
  },
  giftBtn: {
    borderColor: theme.colors.accentGold,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  reactionOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(10,10,15,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  reactionOverlayText: {
    fontFamily: theme.typography.fontBody,
    color: theme.colors.accentMagenta,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  levelToast: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 12,
    shadowColor: theme.colors.accentGold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  levelToastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  levelToastText: {
    color: '#3A2E00',
    fontFamily: theme.typography.fontBody,
    fontWeight: '800',
    fontSize: 12,
  },
});

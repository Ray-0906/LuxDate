import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  PermissionsAndroid,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import theme from '../../theme/theme.js';
import TriggerEngine from '../../engines/TriggerEngine.js';
import { chatApi, mediaApi } from '../../api/services.js';
import socketService from '../../api/socket.js';
import useChatUIStore from '../../store/chatUIStore.js';
import useChatBadgeStore from '../../store/chatBadgeStore.js';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import GiftPickerModal from '../../components/GiftPickerModal.jsx';
import GiftBurstOverlay from '../../components/GiftBurstOverlay.jsx';
import InsufficientCoinsModal from '../../components/InsufficientCoinsModal.jsx';
import CoinPackSheet from '../../components/CoinPackSheet.jsx';

export default function ConversationScreen({ route, navigation }) {
  const { girl } = route.params || {};
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showCoinPackSheet, setShowCoinPackSheet] = useState(false);
  const [coinsModalBalance, setCoinsModalBalance] = useState(0);
  const [coinsModalRequired, setCoinsModalRequired] = useState(0);
  const [giftBurst, setGiftBurst] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const setActiveConversationGirlId = useChatUIStore((s) => s.setActiveConversationGirlId);
  const refreshUnreadCount = useChatBadgeStore((s) => s.refreshUnreadCount);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await chatApi.messages(girl._id);
      setMessages([...(res.data.data || [])].reverse());
    } catch (e) {
      console.warn('Fetch msg error:', e.message);
    } finally {
      refreshUnreadCount();
      setLoading(false);
    }
  }, [girl._id, refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      setActiveConversationGirlId(girl?._id);
      return () => {
        setActiveConversationGirlId(null);
      };
    }, [girl?._id, setActiveConversationGirlId])
  );

  useEffect(() => {
    TriggerEngine.cancelScheduled();
    fetchMessages();

    const socket = socketService.getSocket();
    if (!socket) return undefined;

    const handleNewMessage = (msg) => {
      if (String(msg?.girlProfileId) !== String(girl._id)) return;
      setMessages((prev) => (
        prev.some((item) => String(item._id) === String(msg._id)) ? prev : [msg, ...prev]
      ));
    };

    const handleTyping = (data) => {
      if (String(data?.girlId || data?.girlProfileId) === String(girl._id)) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socketService.joinConversation(girl._id);
    socketService.onNewMessage(handleNewMessage);
    socketService.onTyping(handleTyping);

    return () => {
      socketService.offNewMessage(handleNewMessage);
      socketService.offTyping(handleTyping);
      socketService.leaveConversation(girl._id);
    };
  }, [fetchMessages, girl._id]);

  useEffect(() => {
    if (!giftBurst) return undefined;
    const timeout = setTimeout(() => setGiftBurst(null), 1800);
    return () => clearTimeout(timeout);
  }, [giftBurst]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    const tempId = Date.now().toString();
    const newMsg = {
      _id: tempId,
      content: { text, type: 'text' },
      senderType: 'user',
      sentAt: new Date().toISOString(),
    };

    setMessages((prev) => [newMsg, ...prev]);

    try {
      const res = await chatApi.send(girl._id, { text, type: 'text' });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data.data : m)));
      socketService.emitTyping(girl._id);
    } catch (e) {
      console.warn('Send error:', e.message);
    }
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const loadRecentPhotos = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;
    try {
      const photos = await CameraRoll.getPhotos({ first: 20, assetType: 'Photos' });
      setRecentPhotos(photos.edges);
    } catch (e) {
      console.warn('CameraRoll error: ', e);
    }
  };

  const toggleAttachment = () => {
    if (isAttachmentOpen) {
      setIsAttachmentOpen(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    Keyboard.dismiss();
    setIsEmojiOpen(false);
    loadRecentPhotos();
    setTimeout(() => setIsAttachmentOpen(true), 50);
  };

  const openCamera = async () => {
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: true });
      if (!result.didCancel && result.assets?.length) {
        setIsAttachmentOpen(false);
        processAndSendImage(result.assets[0]);
      }
    } catch (e) {
      console.warn('Camera error:', e.message);
    }
  };

  const openFullGallery = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, selectionLimit: 1 });
      if (!result.didCancel && result.assets?.length) {
        setIsAttachmentOpen(false);
        processAndSendImage(result.assets[0]);
      }
    } catch (e) {
      console.warn('Image picker error:', e.message);
    }
  };

  const processAndSendImage = async (asset) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
        uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
      });

      const tempId = Date.now().toString();
      setMessages((prev) => [{
        _id: tempId,
        content: { type: 'photo', mediaUrl: asset.uri },
        senderType: 'user',
        sentAt: new Date().toISOString(),
        pending: true,
      }, ...prev]);

      const uploadRes = await mediaApi.uploadImage(formData);
      const mediaUrl = uploadRes.data.data.url;

      const msgRes = await chatApi.send(girl._id, { type: 'photo', mediaUrl });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? msgRes.data.data : m)));
    } catch (e) {
      console.warn('Image upload error:', e.message);
    }
  };

  const handleVideoCall = () => {
    TriggerEngine.cancelScheduled();
    navigation.navigate('OutgoingCall', { girl });
  };

  const handleGiftSent = (result) => {
    setShowGiftPicker(false);
    setMessages((prev) => (
      prev.some((item) => String(item._id) === String(result.chatMessage?._id))
        ? prev
        : [result.chatMessage, ...prev]
    ));
    setGiftBurst({
      gift: result.selectedGift,
      quantity: result.quantity,
    });
    if (result.wealthLevelChanged) {
      setLevelUp(result.wealthLevel);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderType === 'user';
    const type = item.content?.type || 'text';
    const text = item.content?.text || '';
    const url = item.content?.mediaUrl || null;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperGirl]}>
        {!isMe && (
          <Image
            source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/40' }}
            style={styles.avatarTiny}
          />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleGirl, type === 'gift' && styles.giftBubble]}>
          {type === 'photo' && url ? (
            <Image source={{ uri: url }} style={styles.chatImage} />
          ) : type === 'gift' ? (
            <View style={styles.giftBubbleInner}>
              {item.content?.giftIconUrl ? (
                <Image source={{ uri: item.content.giftIconUrl }} style={styles.giftBubbleImage} />
              ) : (
                <Text style={styles.giftBubbleEmoji}>{item.content?.emojiFallback || '🎁'}</Text>
              )}
              <View style={styles.giftBubbleCopy}>
                <Text style={[styles.giftBubbleTitle, isMe ? styles.messageTextMe : styles.messageTextGirl]}>
                  {item.content?.giftName} x{item.content?.quantity || 1}
                </Text>
                <Text style={[styles.giftBubbleSub, isMe ? styles.messageTextMe : styles.messageTextGirl]}>
                  {item.content?.totalCoinsSpent || 0} coins
                </Text>
                {item.content?.sentDuringCallSessionId ? (
                  <Text style={[styles.giftBubbleTag, isMe ? styles.messageTextMe : styles.messageTextGirl]}>
                    Sent during call
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextGirl]}>
              {text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
            </Pressable>
            <View style={styles.headerProfile}>
              <Image source={{ uri: girl?.photos?.[0] || 'https://via.placeholder.com/40' }} style={styles.headerAvatar} />
              <View>
                <Text style={styles.headerName}>{girl?.name || 'Girl'}</Text>
                <Text style={styles.headerStatus}>Active now</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerBtn}>
                <Ionicons name="call-outline" size={24} color={theme.colors.textPrimary} />
              </Pressable>
              <Pressable onPress={handleVideoCall} style={styles.headerBtn}>
                <Ionicons name="videocam-outline" size={26} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item._id)}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              inverted
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {isTyping && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>{girl?.name || 'Girl'} is typing...</Text>
            </View>
          )}

          <View style={[styles.inputBar, { paddingBottom: (isEmojiOpen || isAttachmentOpen) ? 12 : Math.max(insets.bottom, 12) }]}>
            <View style={styles.inputRounded}>
              <Pressable
                style={styles.emojiBtn}
                onPress={() => {
                  if (isEmojiOpen) {
                    setIsEmojiOpen(false);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  } else {
                    Keyboard.dismiss();
                    setIsAttachmentOpen(false);
                    setTimeout(() => setIsEmojiOpen(true), 50);
                  }
                }}
              >
                <Ionicons name={isEmojiOpen ? 'keyboard-outline' : 'happy-outline'} size={24} color={theme.colors.textSecondary} />
              </Pressable>

              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Message..."
                placeholderTextColor={theme.colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                onFocus={() => {
                  setIsEmojiOpen(false);
                  setIsAttachmentOpen(false);
                }}
                multiline
                maxLength={250}
              />

              {!inputText ? (
                <View style={styles.inputAccessories}>
                  <Pressable style={styles.iconBtn} onPress={() => setShowGiftPicker(true)}>
                    <Ionicons name="gift-outline" size={22} color={theme.colors.accentCyan} />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={toggleAttachment}>
                    <Ionicons name={isAttachmentOpen ? 'close-circle-outline' : 'image-outline'} size={22} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.sendBtn} onPress={handleSend}>
                  <Ionicons name="send" size={20} color="#FFF" />
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isEmojiOpen && (
        <View style={{ height: 320, backgroundColor: theme.colors.bgPrimary, paddingBottom: insets.bottom }}>
          <EmojiKeyboard
            onEmojiSelected={(emoji) => setInputText((prev) => prev + emoji.emoji)}
            theme={{
              container: theme.colors.bgPrimary,
              header: theme.colors.textPrimary,
              knob: theme.colors.accentMagenta,
              search: {
                background: theme.colors.bgSecondary,
                text: theme.colors.textPrimary,
                placeholder: theme.colors.textMuted,
              },
            }}
          />
        </View>
      )}
      {isAttachmentOpen && (
        <View style={{ height: 320, backgroundColor: theme.colors.bgPrimary, paddingBottom: insets.bottom, paddingTop: 10 }}>
          <View style={styles.attachmentHeader}>
            <Pressable style={styles.attachmentCameraBtn} onPress={openCamera}>
              <Ionicons name="camera" size={24} color="#FFF" />
            </Pressable>
            <Pressable style={styles.attachmentGalleryBtn} onPress={openFullGallery}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>All Media</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
          <FlatList
            data={recentPhotos}
            numColumns={3}
            keyExtractor={(item) => item.node.image.uri}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 2 }}
            renderItem={({ item }) => (
              <Pressable
                style={{ flex: 1 / 3, aspectRatio: 1, padding: 2 }}
                onPress={() => {
                  setIsAttachmentOpen(false);
                  processAndSendImage({ uri: item.node.image.uri, fileName: 'local.jpg', type: item.node.type });
                }}
              >
                <Image source={{ uri: item.node.image.uri }} style={{ flex: 1, borderRadius: 4, backgroundColor: theme.colors.bgTertiary }} />
              </Pressable>
            )}
            ListEmptyComponent={<Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginTop: 40 }}>Loading recent photos...</Text>}
          />
        </View>
      )}

      <GiftPickerModal
        visible={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        girlId={girl?._id}
        variant="chat"
        onGiftSent={handleGiftSent}
        onInsufficientCoins={(result) => {
          setCoinsModalBalance(result.coinBalance || 0);
          setCoinsModalRequired(result.requiredCoins || 0);
          setShowCoinsModal(true);
        }}
      />

      <GiftBurstOverlay
        visible={!!giftBurst}
        gift={giftBurst?.gift}
        quantity={giftBurst?.quantity}
        mode="chat"
        subtitle="Gift sent"
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
        context="gift"
        requiredCoins={coinsModalRequired}
      />

      <Modal visible={levelUp !== null} transparent animationType="fade" onRequestClose={() => setLevelUp(null)}>
        <View style={styles.levelUpBackdrop}>
          <View style={styles.levelUpCard}>
            <Text style={styles.levelUpEyebrow}>Wealth level up</Text>
            <Text style={styles.levelUpTitle}>Level {levelUp}</Text>
            <Text style={styles.levelUpBody}>Your gift boosted your status.</Text>
            <Pressable style={styles.levelUpBtn} onPress={() => setLevelUp(null)}>
              <Text style={styles.levelUpBtnText}>Nice</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  attachmentCameraBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  attachmentGalleryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 4 },
  safeContainer: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderGlass },
  headerBtn: { padding: 6 },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  headerStatus: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10, paddingRight: 4 },
  listContent: { padding: 16, gap: 12, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperGirl: { justifyContent: 'flex-start' },
  avatarTiny: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
  bubbleMe: { backgroundColor: theme.colors.accentMagenta, borderBottomRightRadius: 4 },
  bubbleGirl: { backgroundColor: theme.colors.bgTertiary, borderBottomLeftRadius: 4 },
  giftBubble: { paddingHorizontal: 14, paddingVertical: 12 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMe: { color: '#FFF' },
  messageTextGirl: { color: theme.colors.textPrimary },
  chatImage: { width: 180, height: 180, borderRadius: 8, margin: -6 },
  typingContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  typingText: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
  inputBar: { paddingHorizontal: 12, paddingTop: 10, backgroundColor: theme.colors.bgPrimary },
  inputRounded: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: theme.colors.bgSecondary, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8 },
  emojiBtn: { paddingBottom: 4, marginRight: 8 },
  textInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, maxHeight: 100, paddingTop: 6, paddingBottom: 6 },
  inputAccessories: { flexDirection: 'row', gap: 12, paddingBottom: 4, paddingLeft: 8 },
  iconBtn: { padding: 4 },
  sendBtn: { backgroundColor: theme.colors.accentMagenta, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8, alignSelf: 'flex-end', marginBottom: 2 },
  giftBubbleInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  giftBubbleImage: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.bgSecondary },
  giftBubbleEmoji: { fontSize: 30 },
  giftBubbleCopy: { flexShrink: 1 },
  giftBubbleTitle: { fontSize: 15, fontWeight: '800' },
  giftBubbleSub: { marginTop: 3, fontSize: 12, opacity: 0.9 },
  giftBubbleTag: { marginTop: 5, fontSize: 11, opacity: 0.8 },
  levelUpBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  levelUpCard: {
    width: '100%',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  levelUpEyebrow: {
    color: theme.colors.accentCyan,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  levelUpTitle: {
    marginTop: 12,
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
  },
  levelUpBody: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  levelUpBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.accentMagenta,
    borderRadius: 18,
    paddingHorizontal: 26,
    paddingVertical: 14,
  },
  levelUpBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
});

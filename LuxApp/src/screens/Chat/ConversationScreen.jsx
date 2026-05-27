// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
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
  ActivityIndicator,
  Keyboard,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
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
import usePermissionStore from '../../store/permissionStore.js';

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
  const setActiveConversationGirlId = useChatUIStore(
    s => s.setActiveConversationGirlId,
  );
  const refreshUnreadCount = useChatBadgeStore(s => s.refreshUnreadCount);
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const openAppSettings = usePermissionStore((s) => s.openAppSettings);

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
    }, [girl?._id, setActiveConversationGirlId]),
  );

  useEffect(() => {
    TriggerEngine.cancelScheduled();
    fetchMessages();

    const socket = socketService.getSocket();
    if (!socket) return undefined;

    const handleNewMessage = msg => {
      if (String(msg?.girlProfileId) !== String(girl._id)) return;
      setMessages(prev =>
        prev.some(item => String(item._id) === String(msg._id))
          ? prev
          : [msg, ...prev],
      );
    };

    const handleTyping = data => {
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

    setMessages(prev => [newMsg, ...prev]);

    try {
      const res = await chatApi.send(girl._id, { text, type: 'text' });
      setMessages(prev =>
        prev.map(m => (m._id === tempId ? res.data.data : m)),
      );
      socketService.emitTyping(girl._id);
    } catch (e) {
      console.warn('Send error:', e.message);
    }
  };

  const showPermissionAlert = (permissionKey, featureName) => {
    const blocked = usePermissionStore.getState().statuses[permissionKey] === 'blocked';
    Alert.alert(
      `${featureName} needs permission`,
      blocked
        ? `Please enable ${featureName.toLowerCase()} access from Android settings.`
        : `Please allow ${featureName.toLowerCase()} access to continue.`,
      blocked
        ? [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => openAppSettings().catch(() => {}) },
          ]
        : [{ text: 'OK', style: 'default' }]
    );
  };

  const loadRecentPhotos = async () => {
    const hasPermission = await requestPermission('photos');
    if (!hasPermission) {
      showPermissionAlert('photos', 'Photo library');
      return false;
    }
    try {
      const photos = await CameraRoll.getPhotos({
        first: 20,
        assetType: 'Photos',
      });
      setRecentPhotos(photos.edges);
    } catch (e) {
      console.warn('CameraRoll error: ', e);
    }
    return true;
  };

  const toggleAttachment = async () => {
    if (isAttachmentOpen) {
      setIsAttachmentOpen(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    Keyboard.dismiss();
    setIsEmojiOpen(false);
    const loaded = await loadRecentPhotos();
    if (!loaded) return;
    setTimeout(() => setIsAttachmentOpen(true), 50);
  };

  const openCamera = async () => {
    try {
      const cameraGranted = await requestPermission('camera');
      if (!cameraGranted) {
        showPermissionAlert('camera', 'Camera');
        return;
      }
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        saveToPhotos: true,
      });
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
      const photosGranted = await requestPermission('photos');
      if (!photosGranted) {
        showPermissionAlert('photos', 'Photo library');
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        selectionLimit: 1,
      });
      if (!result.didCancel && result.assets?.length) {
        setIsAttachmentOpen(false);
        processAndSendImage(result.assets[0]);
      }
    } catch (e) {
      console.warn('Image picker error:', e.message);
    }
  };

  const processAndSendImage = async asset => {
    try {
      const formData = new FormData();
      formData.append('image', {
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
        uri:
          Platform.OS === 'android'
            ? asset.uri
            : asset.uri.replace('file://', ''),
      });

      const tempId = Date.now().toString();
      setMessages(prev => [
        {
          _id: tempId,
          content: { type: 'photo', mediaUrl: asset.uri },
          senderType: 'user',
          sentAt: new Date().toISOString(),
          pending: true,
        },
        ...prev,
      ]);

      const uploadRes = await mediaApi.uploadImage(formData);
      const mediaUrl = uploadRes.data.data.url;

      const msgRes = await chatApi.send(girl._id, { type: 'photo', mediaUrl });
      setMessages(prev =>
        prev.map(m => (m._id === tempId ? msgRes.data.data : m)),
      );
    } catch (e) {
      console.warn('Image upload error:', e.message);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const confirmDeleteConversation = async () => {
    try {
      setShowDeleteModal(false);
      await chatApi.clearConversation(girl._id);
      navigation.goBack();
    } catch (e) {
      console.warn('Failed to delete conversation', e);
    }
  };

  const handleVideoCall = () => {
    TriggerEngine.cancelScheduled();
    navigation.navigate('OutgoingCall', { girl });
  };

  const handleGiftSent = result => {
    setShowGiftPicker(false);
    setMessages(prev =>
      prev.some(item => String(item._id) === String(result.chatMessage?._id))
        ? prev
        : [result.chatMessage, ...prev],
    );
    setGiftBurst({
      gift: result.selectedGift,
      quantity: result.quantity,
    });
    if (result.wealthLevelChanged) {
      setLevelUp(result.wealthLevel);
    }
  };

  const showTimestamp = (item, nextItem) => {
    if (!nextItem) return true;
    const diff = new Date(item.sentAt) - new Date(nextItem.sentAt);
    return diff > 5 * 60 * 1000;
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderType === 'user';
    const type = item.content?.type || 'text';
    const text = item.content?.text || '';
    const url = item.content?.mediaUrl || null;
    const relationshipEventType =
      item.content?.relationshipEvent?.eventType || '';

    const nextItem = messages[index + 1];
    const timeStr = new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayTime = showTimestamp(item, nextItem);

    if (type === 'relationship_event') {
      const isBreak = relationshipEventType === 'ended';
      return (
        <View style={styles.relationshipCardWrap}>
          {displayTime && <Text style={styles.timestampText}>{timeStr}</Text>}
          <View
            style={[
              styles.relationshipCard,
              isBreak
                ? styles.relationshipCardBreak
                : styles.relationshipCardAccept,
            ]}
          >
            <Text style={styles.relationshipCardTitle}>
              {isBreak ? '💔 Bond Ended' : '✦ Relationship Update'}
            </Text>
            <Text style={styles.relationshipCardBody}>{text}</Text>
            {item.content?.relationshipEvent?.quote ? (
              <Text style={styles.relationshipCardQuote}>
                “{item.content.relationshipEvent.quote}”
              </Text>
            ) : null}
          </View>
        </View>
      );
    }

    if (type === 'gift') {
      const senderName = isMe ? 'You' : (girl?.name || 'Girl');
      return (
        <View style={styles.messageOuterWrap}>
          {displayTime && <Text style={styles.timestampText}>{timeStr}</Text>}
          <View
            style={[
              styles.messageWrapper,
              isMe ? styles.messageWrapperMe : styles.messageWrapperGirl,
            ]}
          >
            {!isMe && (
              <Image
                source={{
                  uri: girl?.photos?.[0] || 'https://via.placeholder.com/40',
                }}
                style={styles.avatarTiny}
              />
            )}
            <View style={styles.giftCard}>
              <Text style={styles.giftCardCaption}>{senderName} sent a gift</Text>
              <View style={styles.giftCardContent}>
                {item.content?.giftIconUrl ? (
                  <Image
                    source={{ uri: item.content.giftIconUrl }}
                    style={styles.giftCardImage}
                  />
                ) : (
                  <Text style={styles.giftCardEmoji}>
                    {item.content?.emojiFallback || '🎁'}
                  </Text>
                )}
                <View style={styles.giftCardDetails}>
                  <Text style={styles.giftCardTitle}>
                    {item.content?.giftName} x{item.content?.quantity || 1}
                  </Text>
                  <Text style={styles.giftCardSub}>
                    {item.content?.totalCoinsSpent || 0} coins
                  </Text>
                  {item.content?.relationshipGiftHeadline ? (
                    <Text style={styles.giftCardHeadline}>
                      {item.content.relationshipGiftHeadline}
                    </Text>
                  ) : null}
                  {item.content?.sentDuringCallSessionId ? (
                    <Text style={styles.giftCardTag}>
                      Sent during call
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageOuterWrap}>
        {displayTime && <Text style={styles.timestampText}>{timeStr}</Text>}
        <View
          style={[
            styles.messageWrapper,
            isMe ? styles.messageWrapperMe : styles.messageWrapperGirl,
          ]}
        >
          {!isMe && (
            <Image
              source={{
                uri: girl?.photos?.[0] || 'https://via.placeholder.com/40',
              }}
              style={styles.avatarTiny}
            />
          )}
          {isMe && type !== 'photo' ? (
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleMe]}
            >
              <Text style={[styles.messageText, styles.messageTextMe]}>
                {text}
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleGirl,
              ]}
            >
              {type === 'photo' && url ? (
                <Image source={{ uri: url }} style={styles.chatImage} />
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isMe ? styles.messageTextMe : styles.messageTextGirl,
                  ]}
                >
                  {text}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
      <SafeAreaView style={styles.safeContainer} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.headerBackBtn}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.textPrimary}
              />
            </Pressable>
            <View style={styles.headerProfile}>
              <View style={styles.headerAvatarContainer}>
                <Image
                  source={{
                    uri: girl?.photos?.[0] || 'https://via.placeholder.com/40',
                  }}
                  style={styles.headerAvatar}
                />
              </View>
              <View>
                <Text style={styles.headerName}>{girl?.name || 'Girl'}</Text>
                <View style={styles.onlineStatusContainer}>
                  <View style={styles.headerOnlineDot} />
                  <Text style={styles.headerStatus}>Online</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerBtn}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={() => setShowDeleteModal(true)}
                style={styles.headerBtn}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={theme.colors.accentRed}
                />
              </Pressable>
              <Pressable onPress={handleVideoCall} style={styles.headerBtn}>
                <Ionicons
                  name="videocam-outline"
                  size={16}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ActivityIndicator
                size="large"
                color={theme.colors.accentMagenta}
              />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => String(item._id)}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              inverted
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {isTyping && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>
                {girl?.name || 'Girl'} is typing...
              </Text>
            </View>
          )}

          <View
            style={[
              styles.inputBar,
              {
                paddingBottom:
                  isEmojiOpen || isAttachmentOpen
                    ? 12
                    : Math.max(insets.bottom, 12),
              },
            ]}
          >
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
                <Ionicons
                  name={isEmojiOpen ? 'keyboard-outline' : 'happy-outline'}
                  size={24}
                  color={isEmojiOpen ? theme.colors.accentMagenta : theme.colors.textSecondary}
                />
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
                  <Pressable
                    style={styles.composerIconBtn}
                    onPress={() => setShowGiftPicker(true)}
                  >
                    <Ionicons
                      name="gift-outline"
                      size={22}
                      color={theme.colors.accentCyan}
                    />
                  </Pressable>
                  <Pressable style={styles.composerIconBtn} onPress={toggleAttachment}>
                    <Ionicons
                      name={
                        isAttachmentOpen
                          ? 'close-circle-outline'
                          : 'image-outline'
                      }
                      size={22}
                      color={isAttachmentOpen ? theme.colors.accentMagenta : theme.colors.textSecondary}
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.sendBtn} onPress={handleSend}>
                  <Ionicons name="send" size={16} color="#FFF" />
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isEmojiOpen && (
        <View
          style={{
            height: 320,
            backgroundColor: theme.colors.bgPrimary,
            paddingBottom: insets.bottom,
          }}
        >
          <EmojiKeyboard
            onEmojiSelected={emoji => setInputText(prev => prev + emoji.emoji)}
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
        <View
          style={{
            height: 320,
            backgroundColor: theme.colors.bgPrimary,
            paddingBottom: insets.bottom,
            paddingTop: 10,
          }}
        >
          <View style={styles.attachmentHeader}>
            <Pressable style={styles.attachmentCameraBtn} onPress={openCamera}>
              <Ionicons name="camera" size={24} color="#FFF" />
            </Pressable>
            <Pressable
              style={styles.attachmentGalleryBtn}
              onPress={openFullGallery}
            >
              <Text style={{ color: '#FFF', fontWeight: '600', fontFamily: theme.typography.fontBody }}>
                All Media
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
          <FlatList
            data={recentPhotos}
            numColumns={3}
            keyExtractor={item => item.node.image.uri}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 2 }}
            renderItem={({ item }) => (
              <Pressable
                style={{ flex: 1 / 3, aspectRatio: 1, padding: 2 }}
                onPress={() => {
                  setIsAttachmentOpen(false);
                  processAndSendImage({
                    uri: item.node.image.uri,
                    fileName: 'local.jpg',
                    type: item.node.type,
                  });
                }}
              >
                <Image
                  source={{ uri: item.node.image.uri }}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    backgroundColor: theme.colors.bgTertiary,
                  }}
                />
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  color: theme.colors.textMuted,
                  textAlign: 'center',
                  marginTop: 40,
                  fontFamily: theme.typography.fontBody,
                }}
              >
                Loading recent photos...
              </Text>
            }
          />
        </View>
      )}

      <GiftPickerModal
        visible={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        girlId={girl?._id}
        variant="chat"
        onGiftSent={handleGiftSent}
        onInsufficientCoins={result => {
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

      <Modal
        visible={levelUp !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelUp(null)}
      >
        <View style={styles.levelUpBackdrop}>
          <View style={styles.levelUpCard}>
            <Text style={styles.levelUpEyebrow}>Wealth level up</Text>
            <Text style={styles.levelUpTitle}>Level {levelUp}</Text>
            <Text style={styles.levelUpBody}>
              Your gift boosted your status.
            </Text>
            <Pressable
              style={styles.levelUpBtn}
              onPress={() => setLevelUp(null)}
            >
              <LinearGradient
                colors={theme.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.levelUpBtnGradient}
              >
                <Text style={styles.levelUpBtnText}>Nice</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Conversation?</Text>
            <Text style={styles.modalSubText}>
              All messages in this conversation will be permanently deleted. This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable onPress={confirmDeleteConversation} style={styles.modalDeleteBtn}>
                <Text style={styles.modalDeleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  attachmentCameraBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  safeContainer: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBackBtn: { paddingVertical: 6, paddingRight: 6 },
  headerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  headerAvatarContainer: {
    borderWidth: 2,
    borderColor: 'rgba(233,30,140,0.4)',
    borderRadius: 20,
    padding: 1.5,
    marginRight: 10,
  },
  headerAvatar: { width: 32, height: 32, borderRadius: 16 },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: theme.typography.fontDisplay,
    color: theme.colors.textPrimary,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentGreen,
  },
  headerStatus: { fontSize: 11, fontFamily: theme.typography.fontBody, color: theme.colors.accentCyan, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  listContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  messageOuterWrap: {
    width: '100%',
    marginBottom: 4,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperGirl: { justifyContent: 'flex-start' },
  avatarTiny: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleGirl: {
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 20, fontFamily: theme.typography.fontBody },
  messageTextMe: { color: '#FFF' },
  messageTextGirl: { color: theme.colors.textPrimary },
  chatImage: { width: 180, height: 180, borderRadius: 12, margin: -6 },
  typingContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  typingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    fontFamily: theme.typography.fontBody,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: theme.colors.bgPrimary,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  inputRounded: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emojiBtn: { paddingBottom: 4, marginRight: 8 },
  textInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontBody,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 6,
    paddingBottom: 6,
  },
  inputAccessories: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
    paddingLeft: 8,
  },
  composerIconBtn: { padding: 4 },
  sendBtn: {
    backgroundColor: theme.colors.accentMagenta,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  giftCard: {
    backgroundColor: '#0E0E1A',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 16,
    padding: 12,
    maxWidth: '75%',
  },
  giftCardCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accentGold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: theme.typography.fontBody,
  },
  giftCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftCardImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  giftCardEmoji: {
    fontSize: 32,
  },
  giftCardDetails: {
    flexShrink: 1,
  },
  giftCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: theme.typography.fontBody,
  },
  giftCardSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontFamily: theme.typography.fontBody,
  },
  giftCardHeadline: {
    fontSize: 11,
    color: theme.colors.accentCyan,
    marginTop: 4,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  giftCardTag: {
    fontSize: 10,
    color: theme.colors.accentMagenta,
    marginTop: 4,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  relationshipCardWrap: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  relationshipCard: {
    width: '92%',
    borderRadius: 8,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  relationshipCardAccept: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: theme.colors.accentCyan,
    borderLeftWidth: 4,
  },
  relationshipCardBreak: {
    backgroundColor: 'rgba(255, 59, 107, 0.08)',
    borderColor: theme.colors.accentRed,
    borderLeftWidth: 4,
  },
  relationshipCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: theme.typography.fontBody,
  },
  relationshipCardBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  relationshipCardQuote: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: theme.typography.fontBody,
  },
  timestampText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: theme.typography.fontBody,
  },
  levelUpBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    borderColor: 'rgba(255,255,255,0.06)',
  },
  levelUpEyebrow: {
    color: theme.colors.accentCyan,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: theme.typography.fontBody,
  },
  levelUpTitle: {
    marginTop: 12,
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    fontFamily: theme.typography.fontDisplay,
  },
  levelUpBody: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
  },
  levelUpBtn: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    width: '60%',
  },
  levelUpBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpBtnText: {
    color: '#0A0A0F',
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '80%',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubText: {
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCancelBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.accentRed,
  },
  modalDeleteBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
  },
});

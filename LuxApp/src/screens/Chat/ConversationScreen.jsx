import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Pressable, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import theme from '../../theme/theme.js';
import TriggerEngine from '../../engines/TriggerEngine.js';
import { chatApi, userApi } from '../../api/services.js';
import socketService from '../../api/socket.js';
import { EmojiKeyboard } from 'rn-emoji-keyboard';

export default function ConversationScreen({ route, navigation }) {
  const { girl } = route.params || {};
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await chatApi.messages(girl._id);
      // Backend returns oldest-first. We need newest-first for inverted FlatList.
      setMessages([...(res.data.data || [])].reverse());
    } catch (e) {
      console.warn('Fetch msg error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [girl._id]);

  useEffect(() => {
    TriggerEngine.cancelScheduled();
    fetchMessages();

    const socket = socketService.getSocket();
    if (socket) {
      socketService.joinConversation(girl._id);

      socketService.onNewMessage((msg) => {
        if (msg.girlProfileId === girl._id) {
          setMessages((prev) => [msg, ...prev]);
        }
      });
      socketService.onTyping((data) => {
        if (data.girlProfileId === girl._id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      });
    }

    return () => {
      socketService.leaveConversation(girl._id);
    };
  }, [fetchMessages, girl._id]);

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
      setMessages((prev) => prev.map(m => m._id === tempId ? res.data.data : m));
      socketService.emitTyping(girl._id);
    } catch (e) {
      console.warn('Send error:', e.message);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
      if (result.didCancel || !result.assets?.length) return;
      
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('photo', {
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
        pending: true
      }, ...prev]);

      const uploadRes = await userApi.uploadPhoto(formData);
      const mediaUrl = uploadRes.data.data.url;

      const msgRes = await chatApi.send(girl._id, { type: 'photo', mediaUrl });
      setMessages((prev) => prev.map(m => m._id === tempId ? msgRes.data.data : m));
    } catch (e) {
      console.warn('Image picker error:', e.message);
    }
  };

  const handleVideoCall = () => {
    TriggerEngine.cancelScheduled();
    navigation.navigate('OutgoingCall', { girl });
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
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleGirl]}>
          {type === 'photo' && url ? (
             <Image source={{ uri: url }} style={styles.chatImage} />
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
           <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color={theme.colors.accentMagenta} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
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

        <View style={[styles.inputBar, { paddingBottom: isEmojiOpen ? 12 : Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputRounded}>
            <Pressable style={styles.emojiBtn} onPress={() => { 
                if (isEmojiOpen) {
                  setIsEmojiOpen(false);
                  setTimeout(() => inputRef.current?.focus(), 100);
                } else {
                  Keyboard.dismiss(); 
                  setTimeout(() => setIsEmojiOpen(true), 50);
                }
              }}>
              <Ionicons name={isEmojiOpen ? "keyboard-outline" : "happy-outline"} size={24} color={theme.colors.textSecondary} />
            </Pressable>
            
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor={theme.colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setIsEmojiOpen(false)}
              multiline
              maxLength={250}
            />
            
            {!inputText ? (
              <View style={styles.inputAccessories}>
                <Pressable style={styles.iconBtn} onPress={handleImagePick}>
                  <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
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
  </View>
  );
}

const styles = StyleSheet.create({
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
  sendBtn: { backgroundColor: theme.colors.accentMagenta, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8, alignSelf: 'flex-end', marginBottom: 2 }
});
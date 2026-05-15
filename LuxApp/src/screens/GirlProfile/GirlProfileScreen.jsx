import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import theme from '../../theme/theme.js';
import { profilesApi } from '../../api/services.js';
import useProfileCallTrigger from '../../hooks/useProfileCallTrigger.js';
import TriggerEngine from '../../engines/TriggerEngine.js';
import GiftPickerModal from '../../components/GiftPickerModal.jsx';
import GiftBurstOverlay from '../../components/GiftBurstOverlay.jsx';
import InsufficientCoinsModal from '../../components/InsufficientCoinsModal.jsx';

const { width: W } = Dimensions.get('window');

export default function GirlProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const girlParam = route.params?.girl;
  const [girl, setGirl] = useState(girlParam || null);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [loading, setLoading] = useState(!girlParam);
  const [showBioMore, setShowBioMore] = useState(false);
  const [activeRel, setActiveRel] = useState(null);
  const [relationships, setRelationships] = useState({});
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [coinsModalBalance, setCoinsModalBalance] = useState(0);
  const [coinsModalRequired, setCoinsModalRequired] = useState(0);
  const [giftBurst, setGiftBurst] = useState(null);

  useProfileCallTrigger(girl?._id, !!girl && isFocused);

  const loadGirlProfile = useCallback(async () => {
    if (!girlParam?._id) return;
    try {
      const res = await profilesApi.getById(girlParam._id);
      setGirl(res.data.data?.girl || girlParam);
    } catch {
      setGirl(girlParam);
    } finally {
      setLoading(false);
    }
  }, [girlParam]);

  useEffect(() => {
    if (isFocused) {
      TriggerEngine.setBlockedContext(false);
    }
  }, [isFocused]);

  useEffect(() => {
    loadGirlProfile();
  }, [loadGirlProfile]);

  useEffect(() => {
    if (!giftBurst) return undefined;
    const timeout = setTimeout(() => setGiftBurst(null), 1800);
    return () => clearTimeout(timeout);
  }, [giftBurst]);

  if (loading || !girl) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
      </View>
    );
  }

  const photos = girl.photos?.length ? girl.photos : ['https://via.placeholder.com/400'];

  const handleVideoCall = () => {
    TriggerEngine.cancelScheduled();
    if (girl?._id) {
      navigation.navigate('OutgoingCall', { girl });
    }
  };

  const confirmRelationship = () => {
    if (activeRel) {
      setRelationships((prev) => ({ ...prev, [activeRel]: true }));
      setActiveRel(null);
    }
  };

  const renderGiftShowcase = () => {
    if (!girl.gifts?.length) {
      return (
        <Text style={styles.emptyGiftText}>No gifts yet. Be first one.</Text>
      );
    }

    return (
      <View style={styles.giftGrid}>
        {girl.gifts.slice(0, 9).map((gift, index) => (
          <View key={`${gift.giftId || gift.giftName}-${index}`} style={styles.giftCell}>
            {gift.giftIconUrl ? (
              <Image source={{ uri: gift.giftIconUrl }} style={styles.giftCellImage} />
            ) : (
              <Text style={styles.giftCellEmoji}>{gift.emojiFallback || '🎁'}</Text>
            )}
            <Text style={styles.giftCellName} numberOfLines={1}>{gift.giftName || 'Gift'}</Text>
            <Text style={styles.giftCellCount}>x{gift.count || 0}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.imageSection}>
          <Image source={{ uri: photos[currentPhoto] }} style={styles.mainPhoto} resizeMode="cover" />
          <LinearGradient colors={['rgba(10,10,15,0.4)', 'transparent', 'rgba(10,10,15,0.8)']} style={StyleSheet.absoluteFillObject} />

          <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>

          {photos.length > 1 && (
            <Pressable
              style={styles.thumbnailOverlay}
              onPress={() => setCurrentPhoto((currentPhoto + 1) % photos.length)}
            >
              <Ionicons name="images-outline" size={14} color="#FFF" />
              <Text style={styles.photoCount}>{currentPhoto + 1}/{photos.length}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.name}>{girl.name}</Text>
          <Text style={styles.idText}>ID: {girl._id?.slice(-8).toUpperCase() || '10864564'}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: '#10b981' }]}>
              <View style={styles.activeDot} />
              <Text style={styles.badgeText}>Active</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.accentViolet }]}>
              <Text style={styles.badgeText}>Lv{girl.level || 5}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.bgTertiary }]}>
              <Text style={[styles.badgeText, { color: theme.colors.textPrimary }]}>{girl.location || 'Global'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.bgTertiary }]}>
              <Text style={[styles.badgeText, { color: theme.colors.textPrimary }]}>{girl.language || 'English'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.bgTertiary }]}>
              <Text style={[styles.badgeText, { color: theme.colors.textPrimary }]}>{girl.age || 21}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Self-introduction</Text>
          <Text style={styles.bioText} numberOfLines={showBioMore ? undefined : 3}>
            {girl.bio || 'I hope I can know a better you here. I am waiting for you here.'}
          </Text>
          {!showBioMore && (girl.bio?.length > 100 || !girl.bio) && (
            <Pressable onPress={() => setShowBioMore(true)}>
              <Text style={styles.readMore}>Read more</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Close Friends</Text>
          <View style={styles.relationsRow}>
            {['Soulmate', 'Lover', 'Best Friend'].map((rel, idx) => {
              const isFilled = relationships[rel];
              return (
                <Pressable key={idx} style={styles.relationSlot} onPress={() => !isFilled && setActiveRel(rel)}>
                  <View style={[styles.relationIconBox, isFilled && styles.relationIconBoxFilled]}>
                    {isFilled ? (
                      <Ionicons name="person" size={24} color="#FFF" />
                    ) : (
                      <Ionicons name="add" size={24} color={theme.colors.textSecondary} />
                    )}
                  </View>
                  <Text style={styles.relLabel}>{rel}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Speaking Language</Text>
          <View style={styles.langRow}>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{girl.language || 'English'}</Text>
            </View>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>Hindi</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Honor / Charm</Text>
          <View style={styles.charmCard}>
            <Text style={styles.charmTitle}>Charm Level: {girl.charmLevel || 'Rising'}</Text>
            <View style={styles.charmIcons}>
              <Text style={styles.charmIconEmoji}>*</Text>
              <Text style={styles.charmIconEmoji}>*</Text>
              <Text style={styles.charmIconEmoji}>*</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.giftsHeader}>
            <Text style={styles.sectionTitle}>Gifts</Text>
            <Pressable style={styles.giftCtaInline} onPress={() => setShowGiftPicker(true)}>
              <Ionicons name="gift-outline" size={16} color={theme.colors.accentCyan} />
              <Text style={styles.giftCtaText}>Send Gift</Text>
            </Pressable>
          </View>
          {renderGiftShowcase()}
        </View>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom || 20 }]}>
        <Pressable
          style={[styles.actionBtn, styles.msgBtn]}
          onPress={() => navigation.navigate('Conversation', { girl })}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
          <Text style={styles.actionText}>Message</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, styles.giftBtn]}
          onPress={() => setShowGiftPicker(true)}
        >
          <Ionicons name="gift" size={20} color="#FFF" />
          <Text style={styles.actionText}>Gift</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, styles.callBtn]}
          onPress={handleVideoCall}
        >
          <Ionicons name="videocam" size={22} color="#FFF" />
          <Text style={styles.actionText}>Video Call</Text>
        </Pressable>
      </View>

      <GiftPickerModal
        visible={showGiftPicker}
        onClose={() => setShowGiftPicker(false)}
        girlId={girl?._id}
        variant="chat"
        onGiftSent={(result) => {
          setShowGiftPicker(false);
          setGiftBurst({
            gift: result.selectedGift || { name: 'Gift', emojiFallback: '🎁' },
            quantity: result.quantity || 1,
          });
          loadGirlProfile();
        }}
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
        onGoWallet={() => {
          setShowCoinsModal(false);
          navigation.navigate('MainTabs', { screen: 'Me' });
        }}
      />

      <Modal visible={!!activeRel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Relationship</Text>
            <Text style={styles.modalSub}>{activeRel}</Text>
            <Text style={styles.modalCost}>Cost: 50 coins</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setActiveRel(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmRelationship}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  center: { alignItems: 'center', justifyContent: 'center' },
  imageSection: { width: W, height: W * 1.1, position: 'relative' },
  mainPhoto: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    zIndex: 10,
  },
  photoCount: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  infoBlock: { padding: 20, paddingBottom: 10 },
  name: { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary },
  idText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  divider: { height: 1, backgroundColor: theme.colors.borderGlass, marginHorizontal: 20, marginVertical: 10 },
  section: { paddingHorizontal: 20, paddingVertical: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  bioText: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22 },
  readMore: { fontSize: 14, color: theme.colors.accentCyan, marginTop: 4, fontWeight: '600' },
  relationsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  relationSlot: { alignItems: 'center', gap: 8, maxWidth: 92 },
  relationIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    borderStyle: 'dashed',
  },
  relationIconBoxFilled: {
    backgroundColor: theme.colors.accentMagenta,
    borderColor: theme.colors.accentMagenta,
    borderStyle: 'solid',
  },
  relLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  langRow: { flexDirection: 'row', gap: 10 },
  langBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  langBadgeText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  charmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bgSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  charmTitle: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600' },
  charmIcons: { flexDirection: 'row', gap: 6 },
  charmIconEmoji: { fontSize: 20, color: theme.colors.accentCyan },
  giftsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  giftCtaInline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: theme.colors.bgSecondary },
  giftCtaText: { color: theme.colors.accentCyan, fontSize: 12, fontWeight: '800' },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  giftCell: {
    width: (W - 40 - 20) / 3,
    backgroundColor: theme.colors.bgSecondary,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  giftCellImage: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.bgTertiary },
  giftCellEmoji: { fontSize: 30 },
  giftCellName: { marginTop: 8, fontSize: 12, color: theme.colors.textPrimary, fontWeight: '700' },
  giftCellCount: { marginTop: 4, fontSize: 12, color: theme.colors.accentCyan, fontWeight: '800' },
  emptyGiftText: { color: theme.colors.textMuted, fontSize: 14 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,15,0.95)',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    gap: 8,
  },
  msgBtn: { backgroundColor: theme.colors.bgTertiary },
  giftBtn: { backgroundColor: theme.colors.bgSecondary },
  callBtn: { backgroundColor: theme.colors.accentMagenta },
  actionText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '80%',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  modalSub: { fontSize: 24, marginBottom: 12, color: theme.colors.textPrimary },
  modalCost: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 24, backgroundColor: theme.colors.bgTertiary },
  modalCancelText: { color: theme.colors.textPrimary, fontWeight: '600' },
  modalConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 24, backgroundColor: theme.colors.accentViolet },
  modalConfirmText: { color: '#FFF', fontWeight: '600' },
});

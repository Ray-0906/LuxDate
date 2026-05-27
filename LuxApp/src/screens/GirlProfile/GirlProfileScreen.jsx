// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
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
  Alert,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import theme from '../../theme/theme.js';
import { profilesApi, relationshipsApi } from '../../api/services.js';
import useProfileCallTrigger from '../../hooks/useProfileCallTrigger.js';
import TriggerEngine from '../../engines/TriggerEngine.js';
import RelationshipEngine from '../../engines/RelationshipEngine.js';
import GiftPickerModal from '../../components/GiftPickerModal.jsx';
import GiftBurstOverlay from '../../components/GiftBurstOverlay.jsx';
import InsufficientCoinsModal from '../../components/InsufficientCoinsModal.jsx';
import CoinPackSheet from '../../components/CoinPackSheet.jsx';
import useAuthStore from '../../store/authStore.js';
import usePermissionStore from '../../store/permissionStore.js';

const { width: W } = Dimensions.get('window');

export default function GirlProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const girlParam = route.params?.girl;
  const [girl, setGirl] = useState(girlParam || null);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [loading, setLoading] = useState(!girlParam);
  const [showBioMore, setShowBioMore] = useState(false);
  const [relationshipInfo, setRelationshipInfo] = useState({ slots: [], relationshipTypes: [] });
  const [activeRel, setActiveRel] = useState(null);
  const [switchPrompt, setSwitchPrompt] = useState(null);
  const [breakPrompt, setBreakPrompt] = useState(null);
  const [relLoading, setRelLoading] = useState(false);
  const [pendingInviteIntent, setPendingInviteIntent] = useState(null);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showCoinsModal, setShowCoinsModal] = useState(false);
  const [showCoinPackSheet, setShowCoinPackSheet] = useState(false);
  const [coinsModalBalance, setCoinsModalBalance] = useState(0);
  const [coinsModalRequired, setCoinsModalRequired] = useState(0);
  const [giftBurst, setGiftBurst] = useState(null);
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const openAppSettings = usePermissionStore((s) => s.openAppSettings);

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

  const loadRelationshipOptions = useCallback(async () => {
    if (!girlParam?._id) return;
    try {
      const res = await relationshipsApi.options(girlParam._id);
      const data = res.data?.data || {};
      setRelationshipInfo({
        slots: Array.isArray(data.slots) ? data.slots : [],
        relationshipTypes: Array.isArray(data.relationshipTypes) ? data.relationshipTypes : [],
      });
    } catch {
      setRelationshipInfo({ slots: [], relationshipTypes: [] });
    }
  }, [girlParam?._id]);

  useEffect(() => {
    if (isFocused) {
      TriggerEngine.setBlockedContext(false);
    }
  }, [isFocused]);

  useEffect(() => {
    loadGirlProfile();
    loadRelationshipOptions();
  }, [loadGirlProfile, loadRelationshipOptions]);

  useEffect(() => {
    if (!giftBurst) return undefined;
    const timeout = setTimeout(() => setGiftBurst(null), 1800);
    return () => clearTimeout(timeout);
  }, [giftBurst]);

  const findSlotByType = useCallback((type) => (
    relationshipInfo.slots.find((slot) => slot.type === type)
  ), [relationshipInfo.slots]);

  const openInviteForType = useCallback((slotType) => {
    const slot = findSlotByType(slotType);
    if (!slot) return;
    if (slot.state === 'empty') {
      setActiveRel(slot);
      return;
    }
    if (slot.state === 'occupied' && slot.occupiedBy) {
      setSwitchPrompt({ targetSlot: slot, occupiedBy: slot.occupiedBy });
      return;
    }
    if ((slot.state === 'pending' || slot.state === 'accepted') && slot.relationship) {
      setBreakPrompt({ relationship: slot.relationship, source: 'slot' });
    }
  }, [findSlotByType]);

  const refreshRelationshipUI = useCallback(async () => {
    await Promise.all([loadGirlProfile(), loadRelationshipOptions(), loadProfile()]);
  }, [loadGirlProfile, loadRelationshipOptions, loadProfile]);

  const handleInvite = useCallback(async (slot) => {
    if (!slot?.type || !girl?._id) return;
    setRelLoading(true);
    try {
      const res = await relationshipsApi.invite({
        girlId: girl._id,
        type: slot.type,
      });
      const data = res.data?.data || {};
      if (data?.relationship?._id) {
        RelationshipEngine.schedulePendingAcceptance(data.relationship);
      }
      setActiveRel(null);
      await refreshRelationshipUI();
    } catch (error) {
      const status = error?.response?.status;
      const payload = error?.response?.data?.data || {};
      if (status === 402) {
        setPendingInviteIntent({ type: slot.type, girlId: girl._id });
        setCoinsModalBalance(payload.coinBalance || user?.coinBalance || 0);
        setCoinsModalRequired(payload.requiredCoins || slot.cost || 0);
        setShowCoinsModal(true);
      } else {
        Alert.alert('Relationship', error?.response?.data?.message || 'Unable to send request');
      }
    } finally {
      setRelLoading(false);
    }
  }, [girl?._id, refreshRelationshipUI, user?.coinBalance]);

  const handleBreakRelationship = useCallback(async (relationship, reason = 'manual_break') => {
    if (!relationship?._id) return false;
    setRelLoading(true);
    try {
      await relationshipsApi.break(relationship._id, { reason });
      RelationshipEngine.cancelPendingAcceptance(relationship._id);
      await refreshRelationshipUI();
      return true;
    } catch (error) {
      Alert.alert('Relationship', error?.response?.data?.message || 'Unable to end bond');
      return false;
    } finally {
      setRelLoading(false);
    }
  }, [refreshRelationshipUI]);

  if (loading || !girl) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
      </View>
    );
  }

  const photos = girl.photos?.length ? girl.photos : ['https://via.placeholder.com/400'];

  const handleVideoCall = async () => {
    TriggerEngine.cancelScheduled();
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
      return;
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
      return;
    }

    if (girl?._id) {
      navigation.navigate('OutgoingCall', { girl });
    }
  };

  const getStatusPillStyle = (slot) => {
    if (slot.state === 'accepted') {
      return { bg: 'rgba(233,30,140,0.12)', text: theme.colors.accentMagenta, label: 'Connected' };
    } else if (slot.state === 'occupied') {
      return { bg: 'rgba(201,168,76,0.12)', text: theme.colors.accentGold, label: 'In use' };
    } else {
      return { bg: 'rgba(0,229,255,0.12)', text: theme.colors.accentCyan, label: slot.state === 'pending' ? 'Pending' : 'Available' };
    }
  };

  const renderGiftShowcase = () => {
    if (!girl.gifts?.length) {
      return (
        <Text style={styles.emptyGiftText}>No gifts yet — be the first to impress.</Text>
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
          <LinearGradient colors={['rgba(10,10,15,0.3)', 'transparent', 'rgba(10,10,15,0.95)']} style={StyleSheet.absoluteFillObject} />

          <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>

          {photos.length > 1 && (
            <Pressable
              style={[styles.thumbnailOverlay, { top: insets.top + 8 }]}
              onPress={() => setCurrentPhoto((currentPhoto + 1) % photos.length)}
            >
              <Ionicons name="images-outline" size={14} color="#FFF" />
              <Text style={styles.photoCount}>{currentPhoto + 1}/{photos.length}</Text>
            </Pressable>
          )}

          <View style={styles.overlaidInfo}>
            <View style={styles.nameAgeRow}>
              <Text style={styles.nameText}>{girl.name}</Text>
              <Text style={styles.ageText}>, {girl.age || 21}</Text>
            </View>
            <View style={styles.idChip}>
              <Text style={styles.idChipText}>#ID · {girl._id?.slice(-8).toUpperCase() || '10864564'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.badgeRow}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineBadgeDot} />
              <Text style={styles.onlineBadgeText}>Online Now</Text>
            </View>
            <LinearGradient
              colors={theme.gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.levelBadge}
            >
              <Text style={styles.levelBadgeText}>Lv{girl.level || 5}</Text>
            </LinearGradient>
            <Text style={styles.secondaryInfoText}>
              {girl.location || 'Global'}  ·  {girl.language || 'English'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✦ SELF-INTRODUCTION</Text>
          </View>
          <Text style={styles.bioText} numberOfLines={showBioMore ? undefined : 3}>
            {girl.bio || 'I hope I can know a better you here. I am waiting for you here.'}
          </Text>
          {!showBioMore && (girl.bio?.length > 100 || !girl.bio) && (
            <Pressable onPress={() => setShowBioMore(true)}>
              <Text style={styles.readMore}>Read more</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✦ CONNECTIONS</Text>
          </View>
          <View style={styles.relationshipCardGrid}>
            {relationshipInfo.slots.map((slot) => {
              const state = slot.state;
              const isAccepted = state === 'accepted';
              const isPending = state === 'pending';
              const isEmpty = state === 'empty';
              const cardPhoto = isAccepted
                ? (user?.profilePhotoUrl || 'https://via.placeholder.com/120x120.png?text=You')
                : '';
              
              const statusInfo = getStatusPillStyle(slot);

              return (
                <Pressable
                  key={slot.type}
                  style={styles.relationshipCard}
                  disabled={relLoading}
                  onPress={() => openInviteForType(slot.type)}
                >
                  <View style={styles.relationshipCardMedia}>
                    {isAccepted && !!cardPhoto ? (
                      <Image source={{ uri: cardPhoto }} style={styles.relationshipCardPhoto} />
                    ) : (
                      <View style={styles.relationshipCardPlaceholder}>
                        <Ionicons
                          name={isPending ? 'hourglass-outline' : isEmpty ? 'person-add-outline' : 'swap-horizontal-outline'}
                          size={20}
                          color={theme.colors.textMuted}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.relationshipCardBody}>
                    <Text style={styles.relationshipCardTitle}>{slot.typeIcon} {slot.typeLabel}</Text>
                    
                    <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusInfo.text }]} numberOfLines={1}>
                        {statusInfo.label}
                      </Text>
                    </View>

                    <View style={styles.relationshipCardFooter}>
                      {isEmpty ? (
                        <View style={styles.costBadge}>
                          <Ionicons name="logo-bitcoin" size={10} color={theme.colors.accentMagenta} />
                          <Text style={styles.costBadgeText}>{slot.cost}</Text>
                        </View>
                      ) : (
                        <Text style={styles.manageText}>
                          {state === 'occupied' ? 'Switch' : 'Manage'}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {!relationshipInfo.slots.length ? (
              <Text style={styles.emptyGiftText}>Connections unavailable right now.</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✦ SPEAKING LANGUAGE</Text>
          </View>
          <View style={styles.langRow}>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{girl.language || 'English'}</Text>
            </View>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>Hindi</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✦ HONOR / CHARM</Text>
          </View>
          <View style={styles.charmCard}>
            <Text style={styles.charmTitle}>Charm Level: {girl.charmLevel || 'Rising'}</Text>
            <View style={styles.charmIcons}>
              <Ionicons name="star" size={16} color={theme.colors.accentCyan} />
              <Ionicons name="star" size={16} color={theme.colors.accentCyan} />
              <Ionicons name="star" size={16} color={theme.colors.accentCyan} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.giftsHeader}>
              <Text style={styles.sectionTitle}>✦ GIFTS</Text>
              <Pressable style={styles.giftCtaInline} onPress={() => setShowGiftPicker(true)}>
                <Ionicons name="gift-outline" size={14} color={theme.colors.accentCyan} />
                <Text style={styles.giftCtaText}>Send Gift</Text>
              </Pressable>
            </View>
          </View>
          {renderGiftShowcase()}
        </View>
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom || 20 }]}>
        <Pressable
          style={styles.outlineActionBtn}
          onPress={() => navigation.navigate('Conversation', { girl })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" />
          <Text style={styles.outlineActionText}>Message</Text>
        </Pressable>

        <Pressable
          style={styles.giftCircleBtn}
          onPress={() => setShowGiftPicker(true)}
        >
          <LinearGradient
            colors={theme.gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.giftCircleGradient}
          >
            <Ionicons name="gift-outline" size={22} color="#0A0A0F" />
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.gradientActionBtn}
          onPress={handleVideoCall}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtnBg}
          >
            <Ionicons name="videocam-outline" size={22} color="#FFF" />
            <Text style={styles.gradientActionText}>Video Call</Text>
          </LinearGradient>
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
        onClose={async () => {
          setShowCoinPackSheet(false);
          if (pendingInviteIntent) {
            const slot = findSlotByType(pendingInviteIntent.type);
            if (slot) await handleInvite(slot);
            setPendingInviteIntent(null);
          }
        }}
        context="wallet"
        requiredCoins={coinsModalRequired}
      />

      <Modal visible={!!activeRel} transparent animationType="fade" onRequestClose={() => setActiveRel(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{activeRel?.typeIcon} Send {activeRel?.typeLabel} Request</Text>
            <Text style={styles.modalSub}>{girl?.name}</Text>
            <Text style={styles.modalCost}>Cost: {activeRel?.cost || 0} coins</Text>
            <Text style={styles.modalCost}>Balance: {user?.coinBalance || 0} coins</Text>
            <Text style={styles.modalCost}>After: {Math.max(0, (user?.coinBalance || 0) - (activeRel?.cost || 0))} coins</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setActiveRel(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} disabled={relLoading} onPress={() => handleInvite(activeRel)}>
                <Text style={styles.modalConfirmText}>{relLoading ? 'Sending...' : 'Send Request'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!switchPrompt} transparent animationType="fade" onRequestClose={() => setSwitchPrompt(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{switchPrompt?.targetSlot?.typeIcon} You already have a {switchPrompt?.targetSlot?.typeLabel}</Text>
            <Text style={styles.modalSub}>{switchPrompt?.occupiedBy?.girl?.name || 'Current connection'}</Text>
            <Text style={styles.modalCost}>End existing bond and start new request?</Text>
            <Text style={styles.modalCost}>No refund on spent coins.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSwitchPrompt(null)}>
                <Text style={styles.modalCancelText}>Keep Current</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                disabled={relLoading}
                onPress={async () => {
                  const occupied = switchPrompt?.occupiedBy;
                  const target = switchPrompt?.targetSlot;
                  if (!occupied || !target) return;
                  const ok = await handleBreakRelationship(occupied, 'switch');
                  if (ok) {
                    setSwitchPrompt(null);
                    await handleInvite(target);
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>{relLoading ? 'Working...' : 'End & Switch'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!breakPrompt} transparent animationType="fade" onRequestClose={() => setBreakPrompt(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💔 End this bond?</Text>
            <Text style={styles.modalSub}>{breakPrompt?.relationship?.girl?.name || girl?.name}</Text>
            <Text style={styles.modalCost}>This cannot be undone. Coins will not be refunded.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setBreakPrompt(null)}>
                <Text style={styles.modalCancelText}>Keep Bond</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                disabled={relLoading}
                onPress={async () => {
                  const rel = breakPrompt?.relationship;
                  const ok = await handleBreakRelationship(rel, 'manual_break');
                  if (ok) setBreakPrompt(null);
                }}
              >
                <Text style={styles.modalConfirmText}>{relLoading ? 'Ending...' : 'End Bond'}</Text>
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
  imageSection: { width: W, height: W * 1.15, position: 'relative' },
  mainPhoto: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10,10,15,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  thumbnailOverlay: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(10,10,15,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    zIndex: 10,
  },
  photoCount: { color: '#FFF', fontSize: 12, fontWeight: '700', fontFamily: theme.typography.fontBody },
  overlaidInfo: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  nameAgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nameText: {
    fontSize: 28,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '800',
    color: '#FFF',
  },
  ageText: {
    fontSize: 28,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '500',
    color: '#FFF',
    opacity: 0.7,
  },
  idChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  idChipText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  infoBlock: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45,255,147,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,255,147,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  onlineBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accentGreen },
  onlineBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.accentGreen, fontFamily: theme.typography.fontBody },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '800', color: '#0A0A0F', fontFamily: theme.typography.fontBody },
  secondaryInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
    marginLeft: 4,
  },
  section: { paddingHorizontal: 20, paddingVertical: 14 },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 1.3,
    fontFamily: theme.typography.fontBody,
  },
  bioText: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22, fontFamily: theme.typography.fontBody },
  readMore: { fontSize: 14, color: theme.colors.accentMagenta, marginTop: 6, fontWeight: '700', fontFamily: theme.typography.fontBody },
  relationshipCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  relationshipCard: {
    width: '31.5%',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    minHeight: 165,
    alignItems: 'center',
  },
  relationshipCardMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  relationshipCardPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.accentMagenta,
  },
  relationshipCardPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relationshipCardBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  relationshipCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: theme.typography.fontBody,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  relationshipCardFooter: {
    marginTop: 'auto',
    paddingTop: 8,
    alignItems: 'center',
    width: '100%',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233,30,140,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(233,30,140,0.25)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  costBadgeText: {
    color: theme.colors.accentMagenta,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  manageText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
  langRow: { flexDirection: 'row', gap: 10 },
  langBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  langBadgeText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500', fontFamily: theme.typography.fontBody },
  charmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bgSecondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  charmTitle: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600', fontFamily: theme.typography.fontBody },
  charmIcons: { flexDirection: 'row', gap: 6 },
  giftsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  giftCtaInline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: theme.colors.bgSecondary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  giftCtaText: { color: theme.colors.accentCyan, fontSize: 12, fontWeight: '700', fontFamily: theme.typography.fontBody },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  giftCell: {
    width: (W - 40 - 20) / 3,
    backgroundColor: theme.colors.bgSecondary,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  giftCellImage: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.bgTertiary },
  giftCellEmoji: { fontSize: 26 },
  giftCellName: { marginTop: 8, fontSize: 12, color: theme.colors.textPrimary, fontWeight: '700', fontFamily: theme.typography.fontBody },
  giftCellCount: { marginTop: 4, fontSize: 12, color: theme.colors.accentCyan, fontWeight: '800', fontFamily: theme.typography.fontBody },
  emptyGiftText: { color: theme.colors.textSecondary, fontSize: 14, fontFamily: theme.typography.fontBody, textAlign: 'center', width: '100%', paddingVertical: 10 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,15,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  outlineActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 8,
  },
  outlineActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: theme.typography.fontBody,
  },
  giftCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  giftCircleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientActionBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientBtnBg: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gradientActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
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
  modalSub: {
    fontSize: 22,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalCost: {
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.accentMagenta,
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

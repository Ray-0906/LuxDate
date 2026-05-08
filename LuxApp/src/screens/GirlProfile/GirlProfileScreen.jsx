import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  Dimensions, ActivityIndicator, Modal, TouchableOpacity
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import theme from '../../theme/theme.js';
import { profilesApi } from '../../api/services.js';
import useProfileCallTrigger from '../../hooks/useProfileCallTrigger.js';
import TriggerEngine from '../../engines/TriggerEngine.js';

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

  // 10. A. Call Trigger Hook
  // Fires auto incoming call after 10-15 seconds
  useProfileCallTrigger(girl?._id, !!girl && isFocused);

  useEffect(() => {
    if (isFocused) {
      TriggerEngine.setBlockedContext(false);
    }
  }, [isFocused]);

  useEffect(() => {
    if (girlParam?._id) {
      profilesApi.getById(girlParam._id)
        .then(res => setGirl(res.data.data?.girl || girlParam))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [girlParam]);

  if (loading || !girl) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.accentMagenta} />
      </View>
    );
  }

  const photos = girl.photos?.length ? girl.photos : ['https://via.placeholder.com/400'];

  const handleVideoCall = () => {
    // Navigate to outoing calling ring screen
    TriggerEngine.cancelScheduled();
    if (girl?._id) {
      navigation.navigate('OutgoingCall', { girl });
    }
  };

  const confirmRelationship = () => {
    if (activeRel) {
      setRelationships(prev => ({ ...prev, [activeRel]: true }));
      setActiveRel(null);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* 🔶 2. IMAGE SECTION */}
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

        {/* 🔶 3. BASIC INFO BLOCK */}
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

        {/* 🔶 4. SELF INTRODUCTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Self-introduction</Text>
          <Text 
            style={styles.bioText} 
            numberOfLines={showBioMore ? undefined : 3}
          >
            {girl.bio || "I hope I can know a better you here~ I'm waiting for you here~"}
          </Text>
          {!showBioMore && (girl.bio?.length > 100 || !girl.bio) && (
            <Pressable onPress={() => setShowBioMore(true)}>
              <Text style={styles.readMore}>Read more</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* 🔶 5. CLOSE FRIEND / RELATIONSHIP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Close Friends</Text>
          <View style={styles.relationsRow}>
            {['Soulmate 💖', 'Lover ❤️', 'Best Friend 🤝'].map((rel, idx) => {
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
                  <Text style={styles.relLabel}>{rel.split(' ')[0]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 🔶 6. LANGUAGE SECTION */}
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

        {/* 🔶 7. HONOR / CHARM SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Honor / Charm</Text>
          <View style={styles.charmCard}>
            <Text style={styles.charmTitle}>Charm Level: {girl.charmLevel || 'Lv5'}</Text>
            <View style={styles.charmIcons}>
              <Text style={styles.charmIconEmoji}>🌟</Text>
              <Text style={styles.charmIconEmoji}>🔥</Text>
              <Text style={styles.charmIconEmoji}>👑</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 🔶 8. GIFTS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gifts</Text>
          <View style={styles.giftGrid}>
            {['🎁 x3', '🌹 x5', '💍 x1', '🍫 x2', '🧸 x4', '💎 x7', '👗 x1', '👠 x2', '🍹 x3'].map((g, i) => (
              <View key={i} style={styles.giftCell}>
                <Text style={styles.giftCellText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* 🔶 9. STICKY ACTION BUTTONS */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom || 20 }]}>
        <Pressable 
          style={[styles.actionBtn, styles.msgBtn]} 
          onPress={() => navigation.navigate('Conversation', { girl })}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
          <Text style={styles.actionText}>Message</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionBtn, styles.callBtn]} 
          onPress={handleVideoCall}
        >
          <Ionicons name="videocam" size={22} color="#FFF" />
          <Text style={styles.actionText}>Video Call</Text>
        </Pressable>
      </View>

      {/* Relationship Fake Modal */}
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
  
  // Image Section
  imageSection: { width: W, height: W * 1.1, position: 'relative' },
  mainPhoto: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute', left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    zIndex: 10
  },
  thumbnailOverlay: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 6,
    zIndex: 10
  },
  photoCount: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  
  // Info Block
  infoBlock: { padding: 20, paddingBottom: 10 },
  name: { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary },
  idText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, 
    borderRadius: 12, gap: 6 
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  
  divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 20, marginVertical: 10 },
  
  // Sections
  section: { paddingHorizontal: 20, paddingVertical: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  
  // Bio
  bioText: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22 },
  readMore: { fontSize: 14, color: theme.colors.accentCyan, marginTop: 4, fontWeight: '600' },
  
  // Close Friends
  relationsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  relationSlot: { alignItems: 'center', gap: 8 },
  relationIconBox: { 
    width: 60, height: 60, borderRadius: 30, backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed'
  },
  relationIconBoxFilled: {
    backgroundColor: theme.colors.accentMagenta, borderColor: theme.colors.accentMagenta, borderStyle: 'solid'
  },
  relLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  
  // Language
  langRow: { flexDirection: 'row', gap: 10 },
  langBadge: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgSecondary, borderWidth: 1, borderColor: theme.colors.border
  },
  langBadgeText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  
  // Charm
  charmCard: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.bgSecondary, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.border
  },
  charmTitle: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '600' },
  charmIcons: { flexDirection: 'row', gap: 6 },
  charmIconEmoji: { fontSize: 20 },
  
  // Gifts
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  giftCell: { 
    width: (W - 40 - 20) / 3, backgroundColor: theme.colors.bgSecondary, 
    paddingVertical: 16, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.border
  },
  giftCellText: { fontSize: 16 },
  
  // Sticky Footer
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(10,10,15,0.95)',
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.border
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: theme.radius.pill, gap: 8
  },
  msgBtn: { backgroundColor: theme.colors.bgTertiary },
  callBtn: { backgroundColor: theme.colors.accentMagenta },
  actionText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    width: '80%', backgroundColor: theme.colors.bgSecondary, borderRadius: 16, padding: 24,
    alignItems: 'center'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  modalSub: { fontSize: 24, marginBottom: 12 },
  modalCost: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 24, backgroundColor: theme.colors.bgTertiary },
  modalCancelText: { color: theme.colors.textPrimary, fontWeight: '600' },
  modalConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 24, backgroundColor: theme.colors.accentViolet },
  modalConfirmText: { color: '#FFF', fontWeight: '600' }
});

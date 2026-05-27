// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../theme/theme.js';
import useAuthStore from '../../store/authStore.js';
import { userApi } from '../../api/services.js';
import usePermissionStore from '../../store/permissionStore.js';

const { width: W } = Dimensions.get('window');

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Bengali'];

const buildDraft = (user) => ({
  name: user?.name || '',
  username: user?.username || '',
  age: user?.age ? String(user.age) : '',
  gender: user?.gender || 'male',
  bio: user?.bio || '',
  language: user?.language || 'English',
  location: user?.location || '',
  profilePhotoUrl: user?.profilePhotoUrl || '',
});

const normalizeDraft = (draft) => ({
  name: String(draft?.name || '').trim(),
  username: String(draft?.username || '').trim(),
  age: String(draft?.age || '').trim(),
  gender: String(draft?.gender || 'male').trim(),
  bio: String(draft?.bio || '').trim(),
  language: String(draft?.language || 'English').trim(),
  location: String(draft?.location || '').trim(),
  profilePhotoUrl: String(draft?.profilePhotoUrl || '').trim(),
});

export default function EditProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const initialEditMode = !!route.params?.startInEditMode;

  const [draft, setDraft] = useState(() => buildDraft(user));
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPhotoAsset, setSelectedPhotoAsset] = useState(null);
  const [screenError, setScreenError] = useState('');
  const baselineRef = useRef(normalizeDraft(buildDraft(user)));
  const requestPermission = usePermissionStore((s) => s.requestPermission);
  const openAppSettings = usePermissionStore((s) => s.openAppSettings);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsRefreshing(true);
      try {
        const res = await userApi.me();
        const freshUser = res.data?.data || null;
        if (!mounted || !freshUser) return;
        setUser(freshUser);
        const freshDraft = buildDraft(freshUser);
        setDraft(freshDraft);
        baselineRef.current = normalizeDraft(freshDraft);
      } catch (error) {
        if (mounted) {
          setScreenError(error?.response?.data?.message || 'Could not refresh profile.');
        }
      } finally {
        if (mounted) setIsRefreshing(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setUser]);

  const normalizedCurrentDraft = useMemo(() => normalizeDraft(draft), [draft]);
  const isDirty = useMemo(
    () => JSON.stringify(normalizedCurrentDraft) !== JSON.stringify(baselineRef.current) || !!selectedPhotoAsset,
    [normalizedCurrentDraft, selectedPhotoAsset]
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty || isSaving) return;
      event.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved profile changes.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(event.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [isDirty, isSaving, navigation]);

  const previewPhotoUri = selectedPhotoAsset?.uri || draft.profilePhotoUrl || 'https://via.placeholder.com/900x1200';
  const displayName = draft.name || draft.username || 'Your Profile';
  const displayAge = draft.age ? `, ${draft.age}` : '';
  const idLabel = user?._id ? user._id.slice(-8).toUpperCase() : 'PROFILE';

  const setField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const validateDraft = () => {
    const trimmedName = normalizedCurrentDraft.name;
    const trimmedUsername = normalizedCurrentDraft.username;
    const trimmedAge = normalizedCurrentDraft.age;

    if (!trimmedName) return 'Name is required.';
    if (!trimmedUsername || trimmedUsername.length < 3) return 'Username must be at least 3 characters.';
    if (!trimmedAge) return 'Age is required.';

    const ageNumber = Number(trimmedAge);
    if (!Number.isInteger(ageNumber) || ageNumber < 18 || ageNumber > 100) {
      return 'Age must be between 18 and 100.';
    }
    if (normalizedCurrentDraft.bio.length > 500) return 'Bio must be 500 characters or fewer.';
    if (normalizedCurrentDraft.location.length > 100) return 'City/location must be 100 characters or fewer.';
    return '';
  };

  const handlePickPhoto = async () => {
    if (!isEditing || isSaving) return;
    try {
      const granted = await requestPermission('photos');
      if (!granted) {
        const blocked = usePermissionStore.getState().statuses.photos === 'blocked';
        Alert.alert(
          'Photo permission needed',
          blocked
            ? 'Please enable photo access from Android settings to update your profile image.'
            : 'Please allow photo access to choose a profile image.',
          blocked
            ? [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => openAppSettings().catch(() => {}) },
              ]
            : [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.85,
        selectionLimit: 1,
      });
      if (!result.didCancel && result.assets?.length) {
        setSelectedPhotoAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Photo', error?.message || 'Could not select photo.');
    }
  };

  const handleCancelEdit = () => {
    if (!isEditing) return;
    if (!isDirty) {
      setDraft(buildDraft(user));
      setSelectedPhotoAsset(null);
      setScreenError('');
      setIsEditing(false);
      return;
    }
    Alert.alert(
      'Discard changes?',
      'Your unsaved profile changes will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            const resetDraft = buildDraft(user);
            setDraft(resetDraft);
            baselineRef.current = normalizeDraft(resetDraft);
            setSelectedPhotoAsset(null);
            setScreenError('');
            setIsEditing(false);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const validationMessage = validateDraft();
    if (validationMessage) {
      setScreenError(validationMessage);
      return;
    }

    setScreenError('');
    setIsSaving(true);
    try {
      if (selectedPhotoAsset) {
        const formData = new FormData();
        formData.append('image', {
          name: selectedPhotoAsset.fileName || 'profile-photo.jpg',
          type: selectedPhotoAsset.type || 'image/jpeg',
          uri:
            Platform.OS === 'android'
              ? selectedPhotoAsset.uri
              : selectedPhotoAsset.uri.replace('file://', ''),
        });
        await userApi.uploadPhoto(formData);
      }

      const payload = {
        name: normalizedCurrentDraft.name,
        username: normalizedCurrentDraft.username,
        age: Number(normalizedCurrentDraft.age),
        gender: normalizedCurrentDraft.gender,
        bio: normalizedCurrentDraft.bio,
        language: normalizedCurrentDraft.language,
        location: normalizedCurrentDraft.location,
      };

      await userApi.update(payload);
      await loadProfile();

      const latestUser = useAuthStore.getState().user;
      const latestDraft = buildDraft(latestUser);
      setDraft(latestDraft);
      baselineRef.current = normalizeDraft(latestDraft);
      setSelectedPhotoAsset(null);
      setIsEditing(false);
    } catch (error) {
      setScreenError(error?.response?.data?.message || error?.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          <View style={styles.imageSection}>
            <Image source={{ uri: previewPhotoUri }} style={styles.mainPhoto} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(10,10,15,0.2)', 'transparent', 'rgba(10,10,15,0.95)']}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={[styles.topControls, { top: insets.top + 8 }]}>
              <Pressable onPress={() => navigation.goBack()} style={styles.circleAction}>
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>

              <View style={styles.headerActions}>
                {isEditing ? (
                  <>
                    <Pressable style={styles.headerPillMuted} onPress={handleCancelEdit} disabled={isSaving}>
                      <Text style={styles.headerPillMutedText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.headerPillPrimary} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#3A2E00" />
                      ) : (
                        <Text style={styles.headerPillPrimaryText}>Save</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={styles.circleAction} onPress={() => setIsEditing(true)}>
                    <Ionicons name="create-outline" size={18} color="#FFF" />
                  </Pressable>
                )}
              </View>
            </View>

            {isEditing ? (
              <Pressable style={styles.photoCta} onPress={handlePickPhoto} disabled={isSaving}>
                <Ionicons name="image-outline" size={16} color="#FFF" />
                <Text style={styles.photoCtaText}>{draft.profilePhotoUrl || selectedPhotoAsset ? 'Change photo' : 'Add photo'}</Text>
              </Pressable>
            ) : null}

            <View style={styles.overlaidInfo}>
              <View style={styles.nameAgeRow}>
                <Text style={styles.nameText}>{displayName}</Text>
                <Text style={styles.ageText}>{displayAge}</Text>
              </View>
              <View style={styles.idChip}>
                <Text style={styles.idChipText}>#ID · {idLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.badgeRow}>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineBadgeDot} />
                <Text style={styles.onlineBadgeText}>Your Profile</Text>
              </View>
              <LinearGradient colors={theme.gradients.gold} style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv{user?.wealthLevel || 0}</Text>
              </LinearGradient>
              <Text style={styles.secondaryInfoText}>
                {draft.location || 'Add your city'}  ·  {draft.language || 'English'}
              </Text>
            </View>
          </View>

          {screenError ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.accentRed} />
              <Text style={styles.errorText}>{screenError}</Text>
            </View>
          ) : null}

          {isRefreshing ? (
            <View style={styles.refreshCard}>
              <ActivityIndicator size="small" color={theme.colors.accentMagenta} />
              <Text style={styles.refreshText}>Refreshing profile...</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✦ IDENTITY</Text>
            </View>

            {isEditing ? (
              <View style={styles.formGrid}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={draft.name}
                    onChangeText={(value) => setField('name', value)}
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Username</Text>
                  <TextInput
                    value={draft.username}
                    onChangeText={(value) => setField('username', value.replace(/\s/g, ''))}
                    autoCapitalize="none"
                    style={styles.input}
                    placeholder="username"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.inlineFields}>
                  <View style={[styles.fieldWrap, styles.inlineField]}>
                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      value={draft.age}
                      onChangeText={(value) => setField('age', value.replace(/[^\d]/g, '').slice(0, 3))}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="18+"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>

                  <View style={[styles.fieldWrap, styles.inlineField]}>
                    <Text style={styles.fieldLabel}>City / Location</Text>
                    <TextInput
                      value={draft.location}
                      onChangeText={(value) => setField('location', value)}
                      style={styles.input}
                      placeholder="Your city"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.choiceRow}>
                    {GENDER_OPTIONS.map((option) => {
                      const active = draft.gender === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => setField('gender', option.value)}
                          style={[styles.choiceChip, active && styles.choiceChipActive]}
                        >
                          <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.detailGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{draft.name || 'Not added yet'}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>{draft.username || 'Not added yet'}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{draft.age || 'Not added yet'}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>{draft.gender || 'Not added yet'}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✦ SELF-INTRODUCTION</Text>
            </View>
            {isEditing ? (
              <TextInput
                value={draft.bio}
                onChangeText={(value) => setField('bio', value)}
                multiline
                textAlignVertical="top"
                style={styles.bioInput}
                placeholder="Tell people a little about yourself."
                placeholderTextColor={theme.colors.textMuted}
                maxLength={500}
              />
            ) : (
              <Text style={styles.bioText}>
                {draft.bio || 'Add your self-introduction so your profile feels as polished as the profiles you browse.'}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✦ SPOKEN LANGUAGE</Text>
            </View>
            {isEditing ? (
              <View style={styles.choiceRow}>
                {LANGUAGE_OPTIONS.map((language) => {
                  const active = draft.language === language;
                  return (
                    <Pressable
                      key={language}
                      onPress={() => setField('language', language)}
                      style={[styles.choiceChip, active && styles.choiceChipActive]}
                    >
                      <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
                        {language}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.languageRow}>
                <View style={styles.languageBadge}>
                  <Text style={styles.languageBadgeText}>{draft.language || 'English'}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✦ LOCATION</Text>
            </View>
            {isEditing ? (
              <TextInput
                value={draft.location}
                onChangeText={(value) => setField('location', value)}
                style={styles.input}
                placeholder="City or area"
                placeholderTextColor={theme.colors.textMuted}
              />
            ) : (
              <Text style={styles.bioText}>{draft.location || 'Add your city to complete your profile.'}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  imageSection: { width: W, height: W * 1.08, position: 'relative' },
  mainPhoto: { width: '100%', height: '100%' },
  topControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,15,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerPillMuted: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(10,10,15,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerPillMutedText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  headerPillPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.accentGoldLight,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPillPrimaryText: {
    color: '#3A2E00',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  photoCta: {
    position: 'absolute',
    right: 18,
    bottom: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(10,10,15,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  photoCtaText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: theme.typography.fontBody,
  },
  overlaidInfo: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
  },
  nameAgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    fontFamily: theme.typography.fontDisplay,
    letterSpacing: -0.8,
  },
  ageText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    opacity: 0.76,
    fontFamily: theme.typography.fontBody,
  },
  idChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(10,10,15,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  idChipText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: theme.typography.fontBody,
  },
  infoBlock: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(45,255,147,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,255,147,0.22)',
  },
  onlineBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.accentGreen,
    marginRight: 8,
  },
  onlineBadgeText: {
    color: theme.colors.accentGreen,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  levelBadgeText: {
    color: '#3A2E00',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  secondaryInfoText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
  errorCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,59,107,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,107,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: theme.colors.accentRed,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
  refreshCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
  section: {
    marginTop: 18,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: theme.typography.fontBody,
  },
  formGrid: {
    gap: 14,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: theme.typography.fontBody,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineField: {
    flex: 1,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: theme.typography.fontBody,
  },
  bioInput: {
    minHeight: 130,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: theme.typography.fontBody,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  choiceChipActive: {
    backgroundColor: 'rgba(233,30,140,0.14)',
    borderColor: 'rgba(233,30,140,0.4)',
  },
  choiceChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  choiceChipTextActive: {
    color: theme.colors.textPrimary,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: theme.typography.fontBody,
  },
  detailValue: {
    marginTop: 8,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  languageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.bgTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  languageBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
});

// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Image, Alert } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import useAuthStore from '../../store/authStore.js';
import theme from '../../theme/theme.js';
import { userApi } from '../../api/services.js';
import { MeshBackground, GlassInput, PremiumButton } from '../../components/ui.jsx';
import useAppSettingsStore from '../../store/appSettingsStore.js';

function GenderCard({ label, iconName, isActive, onPress }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1, { damping: 12 });
  }, [isActive, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[
      styles.genderBtn,
      isActive && styles.genderActive,
      animatedStyle
    ]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.genderBtnPressable}
      >
        <Icon 
          name={iconName} 
          size={24} 
          color={isActive ? theme.colors.accentMagenta : theme.colors.textSecondary} 
        />
        <Text style={[styles.genderText, isActive && styles.genderActiveText]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function OnboardScreen() {
  const appName = useAppSettingsStore((s) => s.settings.branding.appName);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [photoAsset, setPhotoAsset] = useState(null);
  const onboard = useAuthStore((s) => s.onboard);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.85,
        selectionLimit: 1,
      });
      if (!result.didCancel && result.assets?.length) {
        setPhotoAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Photo', error?.message || 'Could not select photo.');
    }
  };

  const handleSubmit = async () => {
    if (!name || !age || !gender || !location) return;
    const success = await onboard({ name, age: parseInt(age, 10), gender, location });
    if (!success) return;

    if (photoAsset?.uri) {
      try {
        const formData = new FormData();
        formData.append('image', {
          name: photoAsset.fileName || 'profile-photo.jpg',
          type: photoAsset.type || 'image/jpeg',
          uri:
            Platform.OS === 'android'
              ? photoAsset.uri
              : photoAsset.uri.replace('file://', ''),
        });
        await userApi.uploadPhoto(formData);
        await loadProfile();
      } catch (error) {
        Alert.alert('Photo', error?.response?.data?.message || 'Profile created, but photo upload failed.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <MeshBackground />
      
      <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <Animated.View style={[styles.progressBar, pulseStyle]}>
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>

        <View style={styles.headerWrap}>
          <Text style={styles.title}>Welcome to {appName}</Text>
          <Text style={styles.subtitle}>Curated matching for the elite.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Profile Photo</Text>
          <TouchableOpacity style={styles.photoPicker} activeOpacity={0.9} onPress={handlePickPhoto}>
            {photoAsset?.uri ? (
              <Image source={{ uri: photoAsset.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Icon name="camera-outline" size={26} color={theme.colors.accentCyan} />
                <Text style={styles.photoPlaceholderText}>Add profile photo</Text>
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Icon name="create-outline" size={14} color={theme.colors.textPrimary} />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Your Name</Text>
          <GlassInput 
            value={name} 
            onChangeText={setName} 
            placeholder="e.g. Alexander" 
            autoCapitalize="words"
          />

          <Text style={styles.label}>Age</Text>
          <GlassInput 
            value={age} 
            onChangeText={setAge} 
            placeholder="Must be 18+" 
            keyboardType="number-pad" 
            maxLength={2}
          />

          <Text style={styles.label}>City</Text>
          <GlassInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Mumbai"
            autoCapitalize="words"
          />

          <Text style={styles.label}>I identify as</Text>
          <View style={styles.genderRow}>
            <GenderCard 
              label="Male" 
              iconName="male-outline" 
              isActive={gender === 'male'} 
              onPress={() => setGender('male')} 
            />
            <GenderCard 
              label="Female" 
              iconName="female-outline" 
              isActive={gender === 'female'} 
              onPress={() => setGender('female')} 
            />
            <GenderCard 
              label="Other" 
              iconName="transgender-outline" 
              isActive={gender === 'other'} 
              onPress={() => setGender('other')} 
            />
          </View>
        </View>

        <PremiumButton 
          title={isLoading ? 'Creating Profile...' : 'Enter the Club'} 
          onPress={handleSubmit} 
          disabled={isLoading || !name || !age || !gender || !location} 
          colors={theme.gradients.primary}
          glowType={theme.shadow.glowMagenta}
          style={styles.submitBtn}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  
  headerWrap: { marginBottom: 48 },
  title: {
    fontSize: 36,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textSecondary,
  },
  
  form: { marginBottom: 40 },
  photoPicker: {
    height: 120,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontBody,
    fontWeight: '600',
  },
  photoEditBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,15,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: theme.typography.fontBody,
  },
  
  genderRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  genderBtn: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  genderBtnPressable: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  genderActive: { 
    borderColor: theme.colors.accentMagenta, 
    backgroundColor: 'rgba(233, 30, 140, 0.08)',
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  genderText: { fontSize: 14, color: theme.colors.textSecondary, fontFamily: theme.typography.fontBody, fontWeight: '600' },
  genderActiveText: { color: theme.colors.accentMagenta, fontWeight: '700' },
  
  submitBtn: {
    marginTop: 10,
    height: 56,
  },
});

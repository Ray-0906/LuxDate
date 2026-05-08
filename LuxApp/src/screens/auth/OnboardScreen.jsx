import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useAuthStore from '../../store/authStore.js';
import theme from '../../theme/theme.js';
import { MeshBackground, GlassInput, PremiumButton } from '../../components/ui.jsx';

export default function OnboardScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const onboard = useAuthStore((s) => s.onboard);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleSubmit = () => {
    if (!name || !age || !gender) return;
    onboard({ name, age: parseInt(age, 10), gender });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <MeshBackground />
      
      <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.content}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Welcome to LuxDate</Text>
          <Text style={styles.subtitle}>Curated matching for the elite.</Text>
        </View>

        <View style={styles.form}>
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

          <Text style={styles.label}>I identify as</Text>
          <View style={styles.genderRow}>
            {['male', 'female', 'other'].map((g, idx) => {
              const isActive = gender === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, isActive && styles.genderActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderText, isActive && styles.genderActiveText]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <PremiumButton 
          title={isLoading ? 'Creating Profile...' : 'Enter the Club'} 
          icon="→"
          onPress={handleSubmit} 
          disabled={isLoading || !name || !age || !gender} 
          style={styles.submitBtn}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  
  headerWrap: { marginBottom: 48 },
  title: { fontSize: 36, fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 16, color: theme.colors.textMuted, fontWeight: '500' },
  
  form: { marginBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  
  genderRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  genderBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  genderActive: { 
    borderColor: theme.colors.accentMagenta, 
    backgroundColor: 'rgba(255, 42, 95, 0.1)',
    ...theme.shadow.glowMagenta,
  },
  genderText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
  genderActiveText: { color: theme.colors.accentMagenta, fontWeight: '800' },
  
  submitBtn: {
    marginTop: 10,
    height: 60,
  },
});

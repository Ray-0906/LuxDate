import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import useAuthStore from '../../store/authStore.js';
import theme from '../../theme/theme.js';
import { MeshBackground, GlowingText, PremiumButton } from '../../components/ui.jsx';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    const success = await sendOtp(phone);
    if (success) navigation.navigate('Otp', { phone });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <MeshBackground />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={[styles.logo, theme.shadow.glowCyan]}>
            <GlowingText style={styles.logoText} glowColor={theme.colors.accentCyan}>LX</GlowingText>
          </View>
          <GlowingText style={styles.title} glowColor={theme.colors.textPrimary}>LuxDate</GlowingText>
          <Text style={styles.subtitle}>Enter the neon grid.</Text>
        </Animated.View>

        {error && (
          <Animated.View entering={FadeInDown} style={styles.errorContainer}>
            <Text style={styles.error}>{error}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.formContainer}>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>+91</Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="000 000 0000"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              selectionColor={theme.colors.accentMagenta}
            />
          </View>

          <PremiumButton 
            title={isLoading ? 'TRANSMITTING...' : 'INITIALIZE LINK'} 
            onPress={handleSendOtp} 
            disabled={isLoading || phone.length < 10}
            color={theme.colors.accentMagenta}
            glowType={theme.shadow.glowMagenta}
            style={styles.btnSpacing}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)}>
          <Text style={styles.terms}>
            BY CONTINUING, YOU AGREE TO OUR TERMS OF SERVICE AND PRIVACY PROTOCOLS.
          </Text>
        </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 60 },
  logo: {
    width: 80, height: 80, borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.bgTertiary, alignItems: 'center',
    justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: theme.colors.accentCyan,
  },
  logoText: { fontSize: 36, fontFamily: theme.typography.fontDisplay, fontWeight: '900', color: theme.colors.accentCyan },
  title: { fontSize: 42, fontFamily: theme.typography.fontDisplay, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: theme.typography.fontMono, color: theme.colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' },
  
  errorContainer: { backgroundColor: 'rgba(255, 48, 64, 0.1)', padding: 12, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.accentRed, marginBottom: 24, alignItems: 'center' },
  error: { color: theme.colors.accentRed, fontSize: 12, fontFamily: theme.typography.fontMono, fontWeight: '600' },
  
  formContainer: { marginBottom: 40 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderGlass,
    marginBottom: 32, paddingHorizontal: 20, height: 64,
  },
  prefix: { fontSize: 18, fontFamily: theme.typography.fontMono, color: theme.colors.accentCyan, fontWeight: '700' },
  divider: { width: 1, height: 30, backgroundColor: theme.colors.borderGlass, marginHorizontal: 16 },
  input: { flex: 1, fontSize: 20, fontFamily: theme.typography.fontMono, color: theme.colors.textPrimary, fontWeight: '600', height: '100%' },
  
  btnSpacing: { marginTop: 10 },
  terms: { fontSize: 10, fontFamily: theme.typography.fontMono, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18, letterSpacing: 1 },
});

// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import useAuthStore from '../../store/authStore.js';
import theme from '../../theme/theme.js';
import { MeshBackground, PremiumButton } from '../../components/ui.jsx';

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
            <View style={[styles.logoBorder, theme.shadow.glowGold]}>
              <LinearGradient
                colors={theme.gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <View style={styles.logoInner}>
                  <Text style={styles.logoText}>LX</Text>
                </View>
              </LinearGradient>
            </View>
            
            <Text style={styles.title}>
              Lux<Text style={{ color: theme.colors.accentMagenta }}>Date</Text>
            </Text>
            <Text style={styles.subtitle}>Where exclusivity meets desire.</Text>
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
              title={isLoading ? 'TRANSMITTING...' : 'Continue'} 
              onPress={handleSendOtp} 
              disabled={isLoading || phone.length < 10}
              colors={theme.gradients.primary}
              glowType={theme.shadow.glowMagenta}
              style={styles.btnSpacing}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300)}>
            <Text style={styles.terms}>
              By continuing, you agree to our{' '}
              <Text style={styles.link} onPress={() => {}}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={() => {}}>Privacy Protocols</Text>.
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
  logoBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    marginBottom: 24,
  },
  logoGradient: {
    flex: 1,
    padding: 1.5,
    borderRadius: 36,
  },
  logoInner: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 26,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '900',
    color: theme.colors.accentGoldLight,
    letterSpacing: -1,
  },
  title: {
    fontSize: 42,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  errorContainer: {
    backgroundColor: 'rgba(255, 48, 64, 0.1)',
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentRed,
    marginBottom: 24,
    alignItems: 'center'
  },
  error: { color: theme.colors.accentRed, fontSize: 12, fontFamily: theme.typography.fontMono, fontWeight: '600' },
  
  formContainer: { marginBottom: 40 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    marginBottom: 32,
    paddingHorizontal: 20,
    height: 64,
  },
  prefix: { fontSize: 18, fontFamily: theme.typography.fontMono, color: theme.colors.accentCyan, fontWeight: '700' },
  divider: { width: 1, height: 30, backgroundColor: theme.colors.borderGlass, marginHorizontal: 16 },
  input: { flex: 1, fontSize: 20, fontFamily: theme.typography.fontMono, color: theme.colors.textPrimary, fontWeight: '600', height: '100%' },
  
  btnSpacing: { marginTop: 10 },
  terms: {
    fontSize: 11,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: theme.colors.accentCyan,
    fontWeight: '600',
  },
});

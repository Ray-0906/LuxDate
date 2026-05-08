import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import useAuthStore from '../../store/authStore.js';
import theme from '../../theme/theme.js';
import { MeshBackground, GlowingText, PremiumButton } from '../../components/ui.jsx';

const { width } = Dimensions.get('window');

export default function OtpScreen({ route, navigation }) {
  const { phone } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    await verifyOtp(phone, code);
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
          <GlowingText style={styles.title} glowColor={theme.colors.textPrimary}>SECURITY CHECK</GlowingText>
          <Text style={styles.subtitle}>Enter transmission code sent to +91 {phone}</Text>
        </Animated.View>

        {error && (
          <Animated.View entering={FadeInDown} style={styles.errorContainer}>
            <Text style={styles.error}>{error}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.formContainer}>
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => (inputs.current[i] = r)}
                style={[
                  styles.otpInput, 
                  digit && styles.otpFilled,
                  i === 2 && { marginRight: 16 } // Gap in the middle for aesthetic
                ]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectionColor={theme.colors.accentCyan}
              />
            ))}
          </View>

          <PremiumButton 
            title={isLoading ? 'VERIFYING...' : 'CONFIRM ACCESS'} 
            onPress={handleVerify} 
            disabled={isLoading || otp.join('').length < 6}
            color={theme.colors.accentCyan}
            glowType={theme.shadow.glowCyan}
            textStyle={{ color: '#000' }}
            style={styles.btnSpacing}
          />
        </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 60 },
  title: { fontSize: 36, fontFamily: theme.typography.fontDisplay, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: 1, marginBottom: 12 },
  subtitle: { fontSize: 13, fontFamily: theme.typography.fontMono, color: theme.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  
  errorContainer: { backgroundColor: 'rgba(255, 48, 64, 0.1)', padding: 12, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.accentRed, marginBottom: 24, alignItems: 'center' },
  error: { color: theme.colors.accentRed, fontSize: 12, fontFamily: theme.typography.fontMono, fontWeight: '600' },
  
  formContainer: { marginBottom: 40 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
  otpInput: {
    width: (width - 48 - 40 - 16) / 6, // dynamic sizing to fit screen safely
    height: 64, 
    borderRadius: theme.radius.md, 
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1, 
    borderColor: theme.colors.borderGlass, 
    textAlign: 'center',
    fontSize: 28, 
    fontFamily: theme.typography.fontMono, 
    fontWeight: '700', 
    color: theme.colors.accentCyan,
  },
  otpFilled: { 
    borderColor: theme.colors.accentCyan,
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  btnSpacing: { marginTop: 10 },
});

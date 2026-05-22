// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, StatusBar, KeyboardAvoidingView, Platform, Dimensions, TouchableOpacity, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import useAuthStore from '../../store/authStore.js';
import theme from '../../theme/theme.js';
import { MeshBackground, PremiumButton } from '../../components/ui.jsx';

const { width } = Dimensions.get('window');

export default function OtpScreen({ route, navigation }) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(30);
  const hiddenInputRef = useRef(null);
  
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const cursorOpacity = useSharedValue(1);
  const activeGlow = useSharedValue(0.2);

  useEffect(() => {
    // Autofocus input on mount
    setTimeout(() => hiddenInputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, [cursorOpacity]);

  useEffect(() => {
    activeGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.2, { duration: 800 })
      ),
      -1,
      true
    );
  }, [activeGlow]);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (code.length < 6) return;
    await verifyOtp(phone, code);
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(30);
    await sendOtp(phone);
  };

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const activeGlowStyle = useAnimatedStyle(() => ({
    borderColor: theme.colors.accentMagenta,
    shadowColor: theme.colors.accentMagenta,
    shadowOpacity: activeGlow.value,
    shadowRadius: 10,
    elevation: 6,
  }));

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
            <Text style={styles.title}>One Last Step</Text>
            <Text style={styles.subtitle}>Enter transmission code sent to +91 {phone}</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.changeLinkWrap}>
              <Text style={styles.changeLink}>Change number</Text>
            </TouchableOpacity>
          </Animated.View>

          {error && (
            <Animated.View entering={FadeInDown} style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.formContainer}>
            <Pressable style={styles.otpRow} onPress={() => hiddenInputRef.current?.focus()}>
              {Array(6).fill(0).map((_, i) => {
                const isFocused = code.length === i;
                const isFilled = code.length > i;
                const char = code[i] || '';
                
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpFilled,
                      isFocused && styles.otpActive,
                      isFocused && activeGlowStyle,
                      i === 2 && { marginRight: 16 }
                    ]}
                  >
                    <Text style={styles.otpChar}>{char}</Text>
                    {isFocused && (
                      <Animated.View style={[styles.cursor, cursorStyle]} />
                    )}
                  </Animated.View>
                );
              })}
            </Pressable>

            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setCode(cleaned);
              }}
              keyboardType="number-pad"
              maxLength={6}
            />

            <PremiumButton 
              title={isLoading ? 'VERIFYING...' : 'Verify'} 
              onPress={handleVerify} 
              disabled={isLoading || code.length < 6}
              colors={theme.gradients.primary}
              glowType={theme.shadow.glowMagenta}
              style={styles.btnSpacing}
            />

            <View style={styles.timerContainer}>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend code in 0:{timer < 10 ? `0${timer}` : timer}</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>
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
  changeLinkWrap: { marginTop: 8 },
  changeLink: {
    color: theme.colors.accentCyan,
    fontFamily: theme.typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
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
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
  otpBox: {
    width: (width - 48 - 40 - 16) / 6,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bgSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpFilled: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  otpActive: {
    borderColor: theme.colors.accentMagenta,
  },
  otpChar: {
    fontSize: 24,
    fontFamily: theme.typography.fontBody,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: theme.colors.accentMagenta,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  btnSpacing: { marginTop: 10 },
  timerContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  timerText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontBody,
    fontSize: 14,
  },
  resendLink: {
    color: theme.colors.accentMagenta,
    fontFamily: theme.typography.fontBody,
    fontSize: 14,
    fontWeight: '600',
  },
});

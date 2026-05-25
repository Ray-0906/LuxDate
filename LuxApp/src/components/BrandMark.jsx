import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme/theme.js';
import useAppSettingsStore from '../store/appSettingsStore.js';

function getInitials(appName) {
  const parts = String(appName || 'LuxDate')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  return String(parts[0] || 'LX').slice(0, 2).toUpperCase();
}

export default function BrandMark({
  size = 72,
  showName = true,
  titleStyle,
  subtitle,
  subtitleStyle,
  iconOnly = false,
}) {
  const branding = useAppSettingsStore((s) => s.settings.branding);
  const appName = branding?.appName || 'LuxDate';
  const initials = getInitials(appName);
  const hasLogo = !!branding?.appLogoUrl;

  return (
    <View style={[styles.wrapper, iconOnly && styles.iconOnlyWrapper]}>
      <View style={[styles.logoBorder, { width: size, height: size, borderRadius: size / 2 }, theme.shadow.glowGold]}>
        <LinearGradient
          colors={theme.gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.logoGradient, { borderRadius: size / 2 }]}
        >
          <View style={[styles.logoInner, { borderRadius: (size / 2) - 1 }]}>
            {hasLogo ? (
              <Image source={{ uri: branding.appLogoUrl }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.logoText, { fontSize: Math.max(20, size * 0.36) }]}>{initials}</Text>
            )}
          </View>
        </LinearGradient>
      </View>

      {!iconOnly && showName ? (
        <View style={styles.wordmarkWrap}>
          <Text style={[styles.title, titleStyle]}>{appName}</Text>
          {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  iconOnlyWrapper: {
    justifyContent: 'center',
  },
  logoBorder: {
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    padding: 1.5,
  },
  logoInner: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '900',
    color: theme.colors.accentGoldLight,
    letterSpacing: -1,
  },
  wordmarkWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 40,
    fontFamily: theme.typography.fontDisplay,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: theme.typography.fontBody,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

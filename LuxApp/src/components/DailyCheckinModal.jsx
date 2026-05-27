import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SURFACE = '#1a1d27';
const BACKGROUND = '#0f1117';
const GOLD = '#c4a14b';
const GOLD_BORDER = 'rgba(196,161,75,0.58)';
const GOLD_SOFT = 'rgba(196,161,75,0.14)';
const GREEN = 'rgba(76, 175, 80, 0.95)';
const GREEN_SOFT = 'rgba(76, 175, 80, 0.12)';
const LOCKED = 'rgba(255,255,255,0.18)';
const TEXT_PRIMARY = '#f6f3ea';
const TEXT_SECONDARY = 'rgba(246,243,234,0.65)';
const TEXT_MUTED = 'rgba(246,243,234,0.42)';
const BORDER = 'rgba(255,255,255,0.06)';

const STATUS_META = {
  claimed: { label: 'Claimed', icon: 'checkmark-circle', color: GREEN },
  claimable: { label: 'Tap to claim', icon: 'sparkles', color: GOLD },
  locked: { label: 'Locked', icon: 'lock-closed', color: TEXT_MUTED },
  expired: { label: 'Expired', icon: 'time', color: 'rgba(255,99,132,0.9)' },
};

function ProgressPip({ status }) {
  const stylesByStatus = {
    claimed: progressStyles.claimed,
    claimable: progressStyles.claimable,
    locked: progressStyles.locked,
    expired: progressStyles.expired,
  };
  return <View style={[progressStyles.base, stylesByStatus[status] || progressStyles.locked]} />;
}

export default function DailyCheckinModal({
  visible,
  status,
  onClose,
  onClaim,
}) {
  const [claimingDay, setClaimingDay] = useState(null);
  const [successDay, setSuccessDay] = useState(null);
  const pulse = useRef(new Animated.Value(0.7)).current;

  const claimableDays = useMemo(
    () => (status?.days || []).filter((day) => day.status === 'claimable'),
    [status]
  );

  useEffect(() => {
    if (!visible) {
      setClaimingDay(null);
      setSuccessDay(null);
      pulse.stopAnimation();
      pulse.setValue(0.7);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulse.stopAnimation();
    };
  }, [visible, pulse]);

  const handleDayPress = async (day) => {
    if (day.status !== 'claimable' || claimingDay) return;
    setClaimingDay(day.day);
    const result = await onClaim?.(day.day);
    setClaimingDay(null);
    if (result?.success) {
      setSuccessDay(result.dayNumber || day.day);
    }
  };

  const headlineText = !status?.isEligible
    ? 'Your 7-day welcome rewards have expired.'
    : status?.claimedToday
      ? 'Today’s reward is already claimed. Check back tomorrow.'
      : claimableDays.length > 1
        ? `${claimableDays.length} days are unlocked. You can claim one today.`
        : claimableDays.length === 1
          ? `Day ${claimableDays[0].day} is ready to claim now.`
          : 'More rewards will unlock on upcoming days.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>WELCOME REWARDS</Text>
              <Text style={styles.title}>Daily Check-in</Text>
              <Text style={styles.subtitle}>{headlineText}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={TEXT_PRIMARY} />
            </Pressable>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressRow}>
              {(status?.days || []).map((day) => (
                <ProgressPip key={`pip-${day.day}`} status={day.status} />
              ))}
            </View>
            <Text style={styles.progressCaption}>
              Day {Math.min(status?.currentDayNumber || 1, 7)} of 7
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.grid}>
              {(status?.days || []).map((day) => {
                const meta = STATUS_META[day.status] || STATUS_META.locked;
                const isClaimable = day.status === 'claimable';
                const isClaimed = day.status === 'claimed';
                const isLocked = day.status === 'locked';
                const isJackpot = day.day === 7;
                const isBusy = claimingDay === day.day;

                return (
                  <Pressable
                    key={`day-${day.day}`}
                    onPress={() => handleDayPress(day)}
                    disabled={!isClaimable || !!claimingDay}
                    style={[
                      styles.dayCard,
                      isClaimable && styles.claimableCard,
                      isClaimed && styles.claimedCard,
                      isLocked && styles.lockedCard,
                      day.status === 'expired' && styles.expiredCard,
                      isJackpot && styles.jackpotCard,
                    ]}
                  >
                    {isClaimable ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.claimablePulse,
                          {
                            opacity: pulse,
                            transform: [{ scale: pulse.interpolate({
                              inputRange: [0.7, 1],
                              outputRange: [0.98, 1.05],
                            }) }],
                          },
                        ]}
                      />
                    ) : null}

                    <View style={styles.dayTopRow}>
                      <Text style={styles.dayLabel}>Day {day.day}</Text>
                      <View style={styles.badgeIconWrap}>
                        {isBusy ? (
                          <ActivityIndicator size="small" color={GOLD} />
                        ) : isClaimed ? (
                          <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                        ) : isLocked ? (
                          <Ionicons name="lock-closed" size={14} color={TEXT_MUTED} />
                        ) : isJackpot ? (
                          <Ionicons name="star" size={14} color={GOLD} />
                        ) : (
                          <Ionicons name={meta.icon} size={14} color={meta.color} />
                        )}
                      </View>
                    </View>

                    <View style={styles.coinWrap}>
                      <Ionicons
                        name={isJackpot ? 'star' : 'diamond'}
                        size={14}
                        color={isClaimed ? GREEN : isClaimable || isJackpot ? GOLD : TEXT_MUTED}
                      />
                      <Text
                        style={[
                          styles.coinAmount,
                          isClaimed && styles.coinClaimed,
                          (isClaimable || isJackpot) && styles.coinClaimable,
                          isLocked && styles.coinLocked,
                        ]}
                      >
                        {day.coins}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.statusText,
                        isClaimed && styles.statusClaimed,
                        isClaimable && styles.statusClaimable,
                        isLocked && styles.statusLocked,
                      ]}
                    >
                      {isBusy ? 'Claiming...' : meta.label}
                    </Text>

                    {isJackpot ? (
                      <View style={styles.jackpotBadge}>
                        <Ionicons name="star" size={10} color={BACKGROUND} />
                        <Text style={styles.jackpotBadgeText}>50</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {successDay ? (
              <View style={styles.infoCardSuccess}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                <Text style={styles.infoCardSuccessText}>
                  Day {successDay} claimed. Come back tomorrow for the next reward.
                </Text>
              </View>
            ) : null}

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoBody}>
                Missed days stay claimable while the 7-day signup window is active. You can collect one unlocked day per IST day.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.closeAction}>
              <Text style={styles.closeActionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,8,12,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: BACKGROUND,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    maxHeight: '84%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: GOLD,
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_SECONDARY,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressCaption: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayCard: {
    width: '31%',
    minHeight: 110,
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  claimableCard: {
    borderColor: GOLD_BORDER,
    backgroundColor: GOLD_SOFT,
  },
  claimedCard: {
    borderColor: 'rgba(76,175,80,0.45)',
    backgroundColor: GREEN_SOFT,
  },
  lockedCard: {
    opacity: 0.58,
  },
  expiredCard: {
    opacity: 0.72,
  },
  jackpotCard: {
    borderWidth: 1.4,
  },
  claimablePulse: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(196,161,75,0.65)',
  },
  dayTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  badgeIconWrap: {
    minWidth: 16,
    minHeight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coinAmount: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  coinClaimable: {
    color: GOLD,
  },
  coinClaimed: {
    color: GREEN,
  },
  coinLocked: {
    color: TEXT_MUTED,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
  },
  statusClaimable: {
    color: GOLD,
  },
  statusClaimed: {
    color: GREEN,
  },
  statusLocked: {
    color: TEXT_MUTED,
  },
  jackpotBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  jackpotBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: BACKGROUND,
  },
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_SECONDARY,
  },
  infoCardSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GREEN_SOFT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.35)',
    padding: 14,
  },
  infoCardSuccessText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_PRIMARY,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  closeAction: {
    height: 48,
    borderRadius: 15,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
});

const progressStyles = StyleSheet.create({
  base: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: LOCKED,
  },
  claimed: {
    backgroundColor: GREEN,
  },
  claimable: {
    backgroundColor: GOLD,
  },
  locked: {
    backgroundColor: LOCKED,
  },
  expired: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

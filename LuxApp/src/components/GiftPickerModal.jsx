// IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=pass mutation=open
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../theme/theme.js';
import useGiftStore from '../store/giftStore.js';
import useAuthStore from '../store/authStore.js';
import useGiftActions from '../hooks/useGiftActions.js';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

export default function GiftPickerModal({
  visible,
  onClose,
  girlId,
  callSessionId = null,
  variant = 'chat',
  onGiftSent,
  onInsufficientCoins,
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const gifts = useGiftStore((s) => s.gifts);
  const isLoading = useGiftStore((s) => s.isLoading);
  const loadCatalog = useGiftStore((s) => s.loadCatalog);
  const user = useAuthStore((s) => s.user);
  const { isSending, sendGift } = useGiftActions();

  const [selectedGiftId, setSelectedGiftId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!visible) return;
    loadCatalog().catch(() => {});
  }, [loadCatalog, visible]);

  useEffect(() => {
    if (!visible) {
      setQuantity(1);
      return;
    }

    const selectedStillVisible = gifts.some((gift) => String(gift._id) === String(selectedGiftId));

    if ((!selectedGiftId || !selectedStillVisible) && gifts.length) {
      const initial = gifts[0];
      setSelectedGiftId(initial?._id || null);
    }
  }, [gifts, selectedGiftId, visible]);

  const filteredGifts = useMemo(() => gifts, [gifts]);

  const selectedGift = useMemo(() => (
    gifts.find((gift) => String(gift._id) === String(selectedGiftId)) || null
  ), [gifts, selectedGiftId]);

  const totalCost = (selectedGift?.coinCost || 0) * quantity;
  const canDecreaseQuantity = quantity > MIN_QUANTITY;
  const canIncreaseQuantity = quantity < MAX_QUANTITY;
  
  const sheetHeight = useMemo(() => {
    if (variant === 'call') {
      const preferred = Math.round(windowHeight * 0.42);
      return Math.max(340, Math.min(preferred, 400));
    }
    const preferred = Math.round(windowHeight * 0.48);
    return Math.max(380, Math.min(preferred, 450));
  }, [variant, windowHeight]);

  const changeQuantity = (delta) => {
    setQuantity((current) => (
      Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, current + delta))
    ));
  };

  const handleSend = async () => {
    if (!selectedGift || !girlId || isSending) return;
    const currentBalance = user?.coinBalance || 0;

    if (currentBalance < totalCost) {
      onClose?.();
      onInsufficientCoins?.({
        type: 'insufficient_coins',
        coinBalance: currentBalance,
        requiredCoins: totalCost,
        paywallType: 'insufficient_coins',
      });
      return;
    }

    const result = await sendGift({
      girlId,
      giftId: selectedGift._id,
      quantity,
      callSessionId,
    });

    if (!result.ok) {
      if (result.type === 'insufficient_coins') {
        onClose?.();
        onInsufficientCoins?.(result);
      }
      return;
    }

    onGiftSent?.({
      ...result.data,
      selectedGift,
      quantity,
    });
  };

  const renderGiftCard = ({ item }) => {
    const isSelected = String(item._id) === String(selectedGiftId);
    return (
      <View style={styles.giftCell}>
        <Pressable
          onPress={() => setSelectedGiftId(item._id)}
          style={[
            styles.giftCard,
            isSelected && styles.giftCardSelected,
          ]}
        >
          {item.iconUrl ? (
            <Image source={{ uri: item.iconUrl }} style={styles.giftImage} />
          ) : (
            <Text style={styles.giftEmoji}>{item.emojiFallback || '🎁'}</Text>
          )}
          <Text style={styles.giftName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.giftCost}>{item.coinCost} coins</Text>
        </Pressable>
      </View>
    );
  };

  const pickerContent = (
    <View style={[styles.sheet, variant === 'call' ? styles.sheetCall : styles.sheetChat, { height: sheetHeight }]}>
      <View style={styles.handle} />
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>✦ EXCLUSIVE GIFTS</Text>
          <Text style={styles.balance}>Balance: {user?.coinBalance || 0} coins</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.catalogRail}>
        <FlatList
          data={filteredGifts}
          numColumns={4}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderGiftCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        />
      </View>

      {selectedGift && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, variant === 'call' ? 12 : 16) }]}>
          <View style={styles.selectionBar}>
            <View style={styles.selectionIconWrap}>
              {selectedGift.iconUrl ? (
                <Image source={{ uri: selectedGift.iconUrl }} style={styles.selectionIcon} />
              ) : (
                <Text style={styles.selectionEmoji}>{selectedGift.emojiFallback || '🎁'}</Text>
              )}
            </View>
            <View style={styles.selectionCopy}>
              <Text style={styles.selectedLabel}>{selectedGift.name}</Text>
              <Text style={styles.singleCost}>{selectedGift.coinCost} coins each</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            {/* Quantity Controls */}
            <View style={styles.quantityControl}>
              <Pressable
                onPress={() => changeQuantity(-1)}
                disabled={!canDecreaseQuantity}
                style={[styles.stepBtn, !canDecreaseQuantity && styles.stepBtnDisabled]}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </Pressable>
              <View style={styles.quantityValueWrap}>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <Text style={styles.quantityCaption}>qty</Text>
              </View>
              <Pressable
                onPress={() => changeQuantity(1)}
                disabled={!canIncreaseQuantity}
                style={[styles.stepBtn, !canIncreaseQuantity && styles.stepBtnDisabled]}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>

            {/* Gradient CTA Send Button */}
            <Pressable 
              style={[styles.sendBtnPressable, isSending && styles.sendBtnDisabled]} 
              onPress={handleSend}
              disabled={isSending}
            >
              <LinearGradient
                colors={theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendBtn}
              >
                <Text style={styles.sendBtnText}>
                  {isSending ? 'Sending...' : `Send Gift · ${totalCost} coins`}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      {isLoading && !gifts.length ? (
        <Text style={styles.loading}>Loading gifts...</Text>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, variant === 'call' && styles.backdropCall]}>
        {variant === 'call' ? (
          <View style={styles.callDock}>
            {pickerContent}
          </View>
        ) : (
          <Pressable style={styles.tapAway} onPress={onClose}>
            <Pressable onPress={() => {}} style={{ width: '100%' }}>
              {pickerContent}
            </Pressable>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
    justifyContent: 'flex-end',
  },
  backdropCall: {
    backgroundColor: 'rgba(5, 5, 8, 0.35)',
  },
  tapAway: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(14, 14, 26, 0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    overflow: 'hidden',
  },
  sheetChat: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sheetCall: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginHorizontal: 12,
    marginBottom: 110,
  },
  callDock: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 10,
    marginBottom: 8,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: theme.typography.fontDisplay,
    letterSpacing: 1.2,
  },
  balance: {
    marginTop: 4,
    color: theme.colors.accentGoldLight,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  close: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.typography.fontBody,
  },
  catalogRail: {
    flex: 1,
    minHeight: 0,
  },
  gridContent: {
    paddingBottom: 16,
  },
  gridRow: {
    justifyContent: 'flex-start',
  },
  giftCell: {
    width: '23%',
    marginHorizontal: '1%',
    marginBottom: 10,
  },
  giftCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    backgroundColor: '#161625',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  giftCardSelected: {
    borderColor: theme.colors.accentMagenta,
    backgroundColor: 'rgba(233, 30, 140, 0.12)',
    shadowColor: theme.colors.accentMagenta,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  giftImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.bgPrimary,
  },
  giftEmoji: {
    fontSize: 24,
  },
  giftName: {
    marginTop: 6,
    color: theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: theme.typography.fontBody,
  },
  giftCost: {
    marginTop: 3,
    color: theme.colors.accentGold,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  footer: {
    marginTop: 8,
    paddingTop: 12,
    backgroundColor: 'rgba(14, 14, 26, 0.98)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.colors.bgPrimary,
  },
  selectionEmoji: {
    fontSize: 24,
  },
  selectionCopy: {
    flex: 1,
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: theme.typography.fontDisplay,
  },
  singleCost: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.typography.fontBody,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.25,
  },
  stepBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  quantityValueWrap: {
    minWidth: 36,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  quantityValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  quantityCaption: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sendBtnPressable: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: theme.typography.fontBody,
  },
  loading: {
    marginTop: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: theme.typography.fontBody,
  },
});

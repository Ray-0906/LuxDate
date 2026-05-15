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
      return Math.max(332, Math.min(preferred, 392));
    }
    const preferred = Math.round(windowHeight * 0.46);
    return Math.max(372, Math.min(preferred, 436));
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
            variant === 'call' ? styles.giftCardCall : styles.giftCardChat,
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
        <View>
          <Text style={styles.title}>Send Gift</Text>
          <Text style={styles.balance}>Balance: {user?.coinBalance || 0} coins</Text>
          <Text style={styles.subcopy}>Sorted by coin value, low to high.</Text>
        </View>
        <Pressable onPress={onClose}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.catalogRail}>
        <FlatList
          data={filteredGifts}
          numColumns={3}
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
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, variant === 'call' ? 6 : 10) }]}>
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

            <View style={styles.totalWrap}>
              <Text style={styles.totalCaption}>Total</Text>
              <Text style={styles.totalCost}>{totalCost} coins</Text>
            </View>

            <Pressable style={[styles.sendBtn, isSending && styles.sendBtnDisabled]} onPress={handleSend}>
              <Text style={styles.sendBtnText}>{isSending ? 'Sending...' : 'Send'}</Text>
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
            <Pressable onPress={() => {}}>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropCall: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  tapAway: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(18,18,26,0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    overflow: 'hidden',
  },
  sheetChat: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sheetCall: {
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginHorizontal: 12,
    marginBottom: 132,
  },
  callDock: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  balance: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  subcopy: {
    marginTop: 4,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  close: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  catalogRail: {
    flex: 1,
    minHeight: 0,
    marginTop: 12,
  },
  gridContent: {
    paddingBottom: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  giftCell: {
    flex: 1,
    maxWidth: '31.5%',
    marginBottom: 8,
  },
  giftCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    backgroundColor: 'rgba(24,24,34,0.98)',
    alignItems: 'center',
  },
  giftCardChat: {
    width: '100%',
    paddingHorizontal: 7,
    paddingVertical: 9,
  },
  giftCardCall: {
    width: '100%',
    paddingHorizontal: 7,
    paddingVertical: 9,
  },
  giftCardSelected: {
    borderColor: theme.colors.accentMagenta,
    backgroundColor: 'rgba(255,45,120,0.16)',
    shadowColor: theme.colors.accentMagenta,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  giftImage: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: theme.colors.bgTertiary,
  },
  giftEmoji: {
    fontSize: 22,
  },
  giftName: {
    marginTop: 6,
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  giftCost: {
    marginTop: 2,
    color: theme.colors.accentMagenta,
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    marginTop: 8,
    paddingTop: 10,
    backgroundColor: 'rgba(18,18,26,0.98)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGlass,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.bgTertiary,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  selectedLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  singleCost: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.38,
  },
  stepBtnText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 20,
  },
  quantityValueWrap: {
    minWidth: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  quantityValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  quantityCaption: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalWrap: {
    flex: 0.8,
    minWidth: 0,
  },
  totalCaption: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalCost: {
    marginTop: 3,
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  sendBtn: {
    backgroundColor: theme.colors.accentMagenta,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minWidth: 78,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loading: {
    marginTop: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

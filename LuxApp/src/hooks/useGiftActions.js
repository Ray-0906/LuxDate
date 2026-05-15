import { useState, useCallback } from 'react';
import { giftsApi } from '../api/services.js';
import useAuthStore from '../store/authStore.js';

export default function useGiftActions() {
  const [isSending, setIsSending] = useState(false);

  const sendGift = useCallback(async ({ girlId, giftId, quantity = 1, callSessionId = null }) => {
    setIsSending(true);
    try {
      const res = await giftsApi.send({ girlId, giftId, quantity, callSessionId });
      const data = res.data?.data;
      const authStore = useAuthStore.getState();
      if (authStore.user && data) {
        authStore.setUser({
          ...authStore.user,
          coinBalance: data.coinBalance,
          wealthLevel: data.wealthLevel,
        });
      }

      return {
        ok: true,
        data,
      };
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data?.data || {};
      if (status === 402 && data.paywallType === 'insufficient_coins') {
        return {
          ok: false,
          type: 'insufficient_coins',
          paywallType: data.paywallType,
          coinBalance: data.coinBalance ?? 0,
        };
      }

      if (status === 400 && data.code === 'invalid_quantity') {
        return {
          ok: false,
          type: 'invalid_quantity',
        };
      }

      return {
        ok: false,
        type: 'unknown',
        error,
      };
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    isSending,
    sendGift,
  };
}

import { useEffect, useRef } from 'react';
import useTriggerEngine from '../store/triggerEngine.store';

/**
 * Hook to be used inside Profile screen or Feed card.
 * Triggers a fake call if the user stares at a specific profile > 10-15s.
 */
export const useProfileTrigger = (girlData, isViewing) => {
  const triggerIncomingCall = useTriggerEngine(state => state.triggerIncomingCall);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isViewing && girlData) {
      // Random trigger time between 10s and 15s
      const triggerTimeMs = Math.floor(Math.random() * (15000 - 10000 + 1) + 10000);
      
      timerRef.current = setTimeout(() => {
        triggerIncomingCall(girlData, 'ProfileTrigger');
      }, triggerTimeMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isViewing, girlData, triggerIncomingCall]);
};
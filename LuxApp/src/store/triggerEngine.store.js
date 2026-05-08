import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTriggerEngine = create(
  persist(
    (set, get) => ({
      // Session Limits
      callsInitiatedThisSession: 0,
      maxCallsPerSession: 8, // Between 5 - 10 usually
      
      // Cooldowns & Tracking
      lastCallTriggeredAt: null,
      lastInteractionAt: Date.now(),
      
      // State
      isActiveCallOverlay: false,
      currentFakeCallResource: null,
      triggerType: null,

      // Actions
      recordInteraction: () => set({ lastInteractionAt: Date.now() }),

      triggerIncomingCall: (girlData, triggerContext = 'IdleTrigger') => {
        const { callsInitiatedThisSession, maxCallsPerSession, lastCallTriggeredAt } = get();
        
        // Block if we hit session limit
        if (callsInitiatedThisSession >= maxCallsPerSession) return false;

        // Block if in cooldown (1 minute between calls)
        if (lastCallTriggeredAt && Date.now() - lastCallTriggeredAt < 60000) return false;

        set({
          isActiveCallOverlay: true,
          currentFakeCallResource: girlData,
          triggerType: triggerContext,
          callsInitiatedThisSession: callsInitiatedThisSession + 1,
          lastCallTriggeredAt: Date.now(),
          lastInteractionAt: Date.now(),
        });
        
        return true;
      },

      endCall: () => set({
        isActiveCallOverlay: false,
        currentFakeCallResource: null,
        triggerType: null,
        lastInteractionAt: Date.now()
      }),

      resetSession: () => set({
        callsInitiatedThisSession: 0,
        lastCallTriggeredAt: null,
        lastInteractionAt: Date.now(),
      })
    }),
    {
      name: 'luxdate-trigger-engine',
    }
  )
);

export default useTriggerEngine;
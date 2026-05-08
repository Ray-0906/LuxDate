import { useCallback } from 'react';
import TriggerEngine from '../engines/TriggerEngine.js';
import SessionBehaviorTracker from '../engines/SessionBehaviorTracker.js';

/**
 * Hook for event-based triggers.
 * Fires on: payment page exit, repeated call declines.
 * Returns functions to record events and check triggers.
 */
export default function useEventTrigger() {
  const onPaymentExit = useCallback(() => {
    SessionBehaviorTracker.recordPaymentExit();
    if (SessionBehaviorTracker.shouldEventTrigger()) {
      TriggerEngine.fireEventTrigger();
      SessionBehaviorTracker.resetEventCounters();
    }
  }, []);

  const onCallDecline = useCallback(() => {
    SessionBehaviorTracker.recordCallDecline();
    if (SessionBehaviorTracker.shouldEventTrigger()) {
      TriggerEngine.fireEventTrigger();
      SessionBehaviorTracker.resetEventCounters();
    }
  }, []);

  return { onPaymentExit, onCallDecline };
}

import { useEffect, useRef } from 'react';
import TriggerEngine from '../engines/TriggerEngine.js';
import SessionBehaviorTracker from '../engines/SessionBehaviorTracker.js';

/**
 * Hook for girl profile screen.
 * Fires a call trigger after 10-15s of viewing a profile.
 */
export default function useProfileCallTrigger(girlId, isViewing) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (isViewing && girlId) {
      SessionBehaviorTracker.startProfileView(girlId);

      // Dwell time: Random delay between 10-15 seconds
      const dwellDelayMs = Math.floor(Math.random() * 5000) + 10000;

      timerRef.current = setTimeout(() => {
        // After dwelling, wait ANOTHER 5-10 seconds before the call actually fires.
        // Because this is dispatched to the global TriggerEngine, it will survive 
        // the user navigating away from the profile, making it feel highly organic!
        const organicDelayMs = Math.floor(Math.random() * 5000) + 5000;
        TriggerEngine.scheduleProfileTrigger(girlId, organicDelayMs);
      }, dwellDelayMs);
    } else {
      SessionBehaviorTracker.endProfileView();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isViewing, girlId]);
}

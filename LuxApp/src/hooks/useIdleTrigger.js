import { useEffect, useRef } from 'react';
import TriggerEngine from '../engines/TriggerEngine.js';
import SessionBehaviorTracker from '../engines/SessionBehaviorTracker.js';

/**
 * Hook for app-level idle detection.
 * Fires a call trigger every 3-10 min of inactivity.
 */
export default function useIdleTrigger() {
  const intervalRef = useRef(null);

  useEffect(() => {
    // Random interval between 3-10 minutes
    const getRandomInterval = () => Math.floor(Math.random() * 420000) + 180000;

    const scheduleNext = () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      intervalRef.current = setTimeout(() => {
        if (SessionBehaviorTracker.isIdle()) {
          TriggerEngine.fireIdleTrigger();
        }
        scheduleNext();
      }, getRandomInterval());
    };

    scheduleNext();

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);
}

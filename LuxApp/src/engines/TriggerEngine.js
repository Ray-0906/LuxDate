import { callsApi, profilesApi } from '../api/services.js';
import CooldownManager from './CooldownManager.js';
import SessionBehaviorTracker from './SessionBehaviorTracker.js';

/**
 * TriggerEngine — manages all fake call triggers.
 * 
 * Trigger types:
 * - ProfileTrigger: fires after 10-15s on a girl profile
 * - IdleTrigger: fires every 3-10 min of app inactivity
 * - EventTrigger: fires on payment exit, repeated declines
 * 
 * Session limits: max 5-10 calls per session, resets on app restart.
 */
class TriggerEngine {
  constructor() {
    this.sessionCallCount = 0;
    this.maxSessionCalls = 8;
    this.onIncomingCall = null; // callback: (callData) => void
    this.isActive = true;
  }

  /**
   * Register the callback that shows IncomingCallScreen
   */
  setCallHandler(handler) {
    this.onIncomingCall = handler;
  }

  /**
   * Check if engine can fire a call
   */
  canFire() {
    return (
      this.isActive &&
      this.sessionCallCount < this.maxSessionCalls &&
      CooldownManager.canFire()
    );
  }

  /**
   * Fire an incoming call trigger
   * @param {string} triggerType - profile_visit | idle | event | background
   * @param {string|null} girlId - specific girl, or null for random
   */
  async fire(triggerType, girlId = null) {
    if (!this.canFire()) return false;

    try {
      // Get call data from server
      const res = await callsApi.trigger(girlId);
      const callData = res.data.data;

      if (!callData || !callData.girl) return false;

      this.sessionCallCount++;
      CooldownManager.recordCall();
      SessionBehaviorTracker.recordCallReceived();

      // Fire the callback to show IncomingCallScreen
      if (this.onIncomingCall) {
        this.onIncomingCall({
          ...callData,
          triggerType,
        });
      }

      return true;
    } catch (e) {
      console.warn('TriggerEngine.fire error:', e.message);
      return false;
    }
  }

  /**
   * Profile trigger — called after dwell time on profile
   */
  fireProfileTrigger(girlId) {
    return this.fire('profile_visit', girlId);
  }

  /**
   * Schedule a profile trigger to fire after a delay.
   * This allows the user to navigate away from the profile before the call arrives,
   * making it feel much more organic.
   */
  scheduleProfileTrigger(girlId, delayMs = 5000) {
    setTimeout(() => {
      this.fire('profile_visit', girlId);
    }, delayMs);
  }

  /**
   * Idle trigger — called when user is inactive
   */
  fireIdleTrigger() {
    return this.fire('idle', null);
  }

  /**
   * Event trigger — called on payment exit, repeated declines
   */
  fireEventTrigger() {
    return this.fire('event', null);
  }

  /**
   * Pause/resume engine
   */
  pause() { this.isActive = false; }
  resume() { this.isActive = true; }

  /**
   * Reset session (on app restart)
   */
  resetSession() {
    this.sessionCallCount = 0;
    CooldownManager.reset();
    SessionBehaviorTracker.resetSession();
  }
}

export default new TriggerEngine();

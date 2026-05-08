import { AppState } from 'react-native';

/**
 * SessionBehaviorTracker — tracks user behavior to feed TriggerEngine.
 * 
 * Monitors:
 * - Time on profile screen (dwell time)
 * - Idle state (no touch events)
 * - Actions (payment exit, call declines)
 * - Calls received this session
 */
class SessionBehaviorTracker {
  constructor() {
    this.profileDwellStart = null;
    this.currentProfileId = null;
    this.lastTouchAt = Date.now();
    this.callDeclineCount = 0;
    this.paymentExitCount = 0;
    this.sessionCallCount = 0;
    this.idleThresholdMs = 180000; // 3 minutes
    this.onIdleCallback = null;
    this.idleTimer = null;
  }

  /**
   * Called when user starts viewing a profile
   */
  startProfileView(girlId) {
    this.profileDwellStart = Date.now();
    this.currentProfileId = girlId;
  }

  /**
   * Called when user leaves a profile
   * Returns dwell time in ms
   */
  endProfileView() {
    const dwellMs = this.profileDwellStart ? Date.now() - this.profileDwellStart : 0;
    this.profileDwellStart = null;
    this.currentProfileId = null;
    return dwellMs;
  }

  /**
   * Record a touch/interaction event
   */
  recordInteraction() {
    this.lastTouchAt = Date.now();
    this.resetIdleTimer();
  }

  /**
   * Record call decline
   */
  recordCallDecline() {
    this.callDeclineCount++;
  }

  /**
   * Record payment page exit
   */
  recordPaymentExit() {
    this.paymentExitCount++;
  }

  /**
   * Record a call received
   */
  recordCallReceived() {
    this.sessionCallCount++;
  }

  /**
   * Check if user is idle
   */
  isIdle() {
    return Date.now() - this.lastTouchAt > this.idleThresholdMs;
  }

  /**
   * Get time since last interaction
   */
  getIdleDurationMs() {
    return Date.now() - this.lastTouchAt;
  }

  /**
   * Start monitoring idle state
   */
  startIdleMonitoring(onIdle) {
    this.onIdleCallback = onIdle;
    this.resetIdleTimer();
  }

  resetIdleTimer() {
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.idleTimer = setInterval(() => {
      if (this.isIdle() && this.onIdleCallback) {
        this.onIdleCallback();
        // Don't stop — keep checking
      }
    }, 30000); // Check every 30s
  }

  stopIdleMonitoring() {
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.onIdleCallback = null;
  }

  /**
   * Check for event trigger conditions
   */
  shouldEventTrigger() {
    // Trigger after repeated declines or payment exits
    return this.callDeclineCount >= 2 || this.paymentExitCount >= 1;
  }

  resetEventCounters() {
    this.callDeclineCount = 0;
    this.paymentExitCount = 0;
  }

  /**
   * Reset entire session
   */
  resetSession() {
    this.profileDwellStart = null;
    this.currentProfileId = null;
    this.lastTouchAt = Date.now();
    this.callDeclineCount = 0;
    this.paymentExitCount = 0;
    this.sessionCallCount = 0;
    this.stopIdleMonitoring();
  }
}

export default new SessionBehaviorTracker();

import { profilesApi, callsApi } from '../api/services.js';

/**
 * CooldownManager — prevents call spam within a session.
 * Burst: max N calls within interval → cooldown period.
 */
class CooldownManager {
  constructor() {
    this.burstCount = 0;
    this.maxBurst = 5;
    this.burstIntervalMs = 30000;
    this.cooldownMs = 120000;
    this.inCooldown = false;
    this.burstTimer = null;
  }

  configure({ maxBurst = 5, burstIntervalMs = 30000, cooldownMs = 120000 } = {}) {
    this.maxBurst = maxBurst;
    this.burstIntervalMs = burstIntervalMs;
    this.cooldownMs = cooldownMs;
  }

  canFire() {
    return !this.inCooldown;
  }

  recordCall() {
    this.burstCount++;
    if (this.burstTimer) clearTimeout(this.burstTimer);

    if (this.burstCount >= this.maxBurst) {
      this.startCooldown();
      return;
    }

    // Reset burst counter after interval
    this.burstTimer = setTimeout(() => {
      this.burstCount = 0;
    }, this.burstIntervalMs);
  }

  startCooldown() {
    this.inCooldown = true;
    this.burstCount = 0;
    setTimeout(() => {
      this.inCooldown = false;
    }, this.cooldownMs);
  }

  reset() {
    this.burstCount = 0;
    this.inCooldown = false;
    if (this.burstTimer) clearTimeout(this.burstTimer);
  }
}

export default new CooldownManager();

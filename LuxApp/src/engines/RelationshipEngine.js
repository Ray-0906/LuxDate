import notifee, { TriggerType, AndroidImportance, EventType } from '@notifee/react-native';
import { relationshipsApi } from '../api/services.js';
import mmkvStorage from '../utils/storage.js';
import { navigationRef } from '../navigation/AppNavigator.jsx';

const RELATIONSHIP_CHANNEL_ID = 'relationship-updates';
const PENDING_ACCEPT_KEY = 'relationship_pending_accepts';
const PENDING_NAV_KEY = 'relationship_pending_nav';

const toId = (value) => String(value?._id || value || '');

function toTimestamp(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

class RelationshipEngine {
  constructor() {
    this.started = false;
    this.acceptTimers = new Map();
  }

  getStoredPending() {
    try {
      return JSON.parse(mmkvStorage.getItem(PENDING_ACCEPT_KEY) || '{}');
    } catch {
      return {};
    }
  }

  setStoredPending(payload) {
    mmkvStorage.setItem(PENDING_ACCEPT_KEY, JSON.stringify(payload || {}));
  }

  async ensureChannel() {
    return notifee.createChannel({
      id: RELATIONSHIP_CHANNEL_ID,
      name: 'Relationship Updates',
      importance: AndroidImportance.HIGH,
    });
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.rehydratePendingTimers();
    this.catchUpPendingAccepts().catch(() => {});
    this.consumePendingNavigation();
  }

  stop() {
    this.started = false;
    for (const timer of this.acceptTimers.values()) clearTimeout(timer);
    this.acceptTimers.clear();
  }

  schedulePendingAcceptance(relationship) {
    const relationshipId = toId(relationship?._id);
    if (!relationshipId) return;
    const dueAtMs = toTimestamp(relationship.acceptanceDueAt);
    if (!dueAtMs) return;

    const pending = this.getStoredPending();
    pending[relationshipId] = {
      relationshipId,
      acceptanceDueAt: new Date(dueAtMs).toISOString(),
      girl: relationship.girl || null,
      type: relationship.type || '',
      typeLabel: relationship.typeLabel || '',
    };
    this.setStoredPending(pending);
    this.scheduleTimer(relationshipId, dueAtMs);
  }

  cancelPendingAcceptance(relationshipId) {
    const key = toId(relationshipId);
    const timer = this.acceptTimers.get(key);
    if (timer) clearTimeout(timer);
    this.acceptTimers.delete(key);
    const pending = this.getStoredPending();
    if (pending[key]) {
      delete pending[key];
      this.setStoredPending(pending);
    }
  }

  scheduleTimer(relationshipId, dueAtMs) {
    const key = toId(relationshipId);
    const prev = this.acceptTimers.get(key);
    if (prev) clearTimeout(prev);

    const delay = Math.max(0, dueAtMs - Date.now());
    const timer = setTimeout(() => {
      this.acceptPendingRelationship(key).catch(() => {});
    }, delay);
    this.acceptTimers.set(key, timer);
  }

  rehydratePendingTimers() {
    const pending = this.getStoredPending();
    Object.values(pending).forEach((entry) => {
      this.scheduleTimer(entry.relationshipId, toTimestamp(entry.acceptanceDueAt));
    });
  }

  async catchUpPendingAccepts() {
    const res = await relationshipsApi.my();
    const data = res.data?.data || {};
    const pendingRelationships = [];

    const slots = Array.isArray(data.slots) ? data.slots : [];
    for (const slot of slots) {
      if (slot?.state === 'pending' && slot?.relationship?._id) {
        pendingRelationships.push(slot.relationship);
      }
    }

    const overdue = Array.isArray(data.pendingOverdue) ? data.pendingOverdue : [];
    for (const rel of overdue) {
      pendingRelationships.push(rel);
    }

    const deduped = new Map();
    for (const rel of pendingRelationships) deduped.set(toId(rel._id), rel);

    for (const rel of deduped.values()) {
      const dueAtMs = toTimestamp(rel.acceptanceDueAt);
      if (!dueAtMs) continue;
      if (dueAtMs <= Date.now()) {
        await this.acceptPendingRelationship(rel._id, rel);
      } else {
        this.schedulePendingAcceptance(rel);
      }
    }
  }

  async acceptPendingRelationship(relationshipId, fallbackRelationship = null) {
    const key = toId(relationshipId);
    if (!key) return;

    try {
      const res = await relationshipsApi.accept(key);
      const data = res.data?.data || {};
      if (data?.ok === false && data?.error === 'acceptance_not_due') {
        const wait = Math.max(1000, Number(data.waitMs) || 1000);
        this.scheduleTimer(key, Date.now() + wait);
        return;
      }
      if (!data?.ok) return;

      this.cancelPendingAcceptance(key);
      const relationship = data.relationship || fallbackRelationship;
      if (!relationship) return;
      if (!data.alreadyAccepted) {
        await this.showAcceptanceNotification(relationship);
      }
      this.scheduleAnniversaryNudge(relationship).catch(() => {});
    } catch {
      // Keep pending entry and retry on next app open.
    }
  }

  async showAcceptanceNotification(relationship) {
    const girl = relationship?.girl || {};
    const channelId = await this.ensureChannel();
    await notifee.displayNotification({
      title: `${relationship.typeIcon || '💫'} ${girl.name || 'She'} accepted your request!`,
      body: `${girl.name || 'She'} accepted your ${relationship.typeLabel || 'relationship'} request`,
      data: {
        type: 'relationship_accept',
        girlId: toId(girl._id || relationship.girlProfileId),
        girlName: girl.name || '',
        girlPhoto: girl.photo || '',
      },
      android: {
        channelId,
        pressAction: { id: 'default' },
      },
    });
  }

  async scheduleAnniversaryNudge(relationship) {
    const acceptedAtMs = toTimestamp(relationship.acceptedAt);
    if (!acceptedAtMs) return;
    const triggerAt = acceptedAtMs + 7 * 24 * 60 * 60 * 1000;
    if (triggerAt <= Date.now()) return;

    const girl = relationship.girl || {};
    const channelId = await this.ensureChannel();
    await notifee.createTriggerNotification({
      id: `relationship-anniversary-${toId(relationship._id)}`,
      title: `${relationship.typeIcon || '💫'} One week with ${girl.name || 'her'}!`,
      body: `It's been 7 days. Send ${girl.name || 'her'} something special?`,
      data: {
        type: 'relationship_anniversary',
        girlId: toId(girl._id || relationship.girlProfileId),
        girlName: girl.name || '',
        girlPhoto: girl.photo || '',
      },
      android: {
        channelId,
        pressAction: { id: 'default' },
      },
    }, {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerAt,
    });
  }

  handleForegroundNotifeeEvent(event) {
    if (!event) return;
    const { type, detail } = event;
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return;
    this.handleNotificationPress(detail?.notification);
  }

  cacheBackgroundPress(notification) {
    const data = notification?.data || {};
    if (!data?.girlId) return;
    mmkvStorage.setItem(PENDING_NAV_KEY, JSON.stringify(data));
  }

  consumePendingNavigation() {
    const raw = mmkvStorage.getItem(PENDING_NAV_KEY);
    if (!raw) return;
    mmkvStorage.removeItem(PENDING_NAV_KEY);
    try {
      const data = JSON.parse(raw);
      this.navigateToGirl(data);
    } catch {
      // ignore malformed payload
    }
  }

  handleNotificationPress(notification) {
    const data = notification?.data || {};
    if (!data?.girlId) return;
    this.navigateToGirl(data);
  }

  navigateToGirl(data) {
    const navigateAction = () => {
      navigationRef.navigate('GirlProfile', {
        girl: {
          _id: data.girlId,
          name: data.girlName || '',
          photos: data.girlPhoto ? [data.girlPhoto] : [],
        },
      });
    };

    if (!navigationRef.isReady()) {
      mmkvStorage.setItem(PENDING_NAV_KEY, JSON.stringify(data));
      return;
    }

    navigateAction();
  }
}

export default new RelationshipEngine();

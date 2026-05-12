import notifee, { TriggerType, AndroidImportance } from '@notifee/react-native';
import api from '../api/client';
import socketService from '../api/socket';
import mmkvStorage from '../utils/storage.js';
import useChatUIStore from '../store/chatUIStore.js';

const FOREGROUND_CHANNEL_ID = 'chat-messages-foreground';
const BACKGROUND_CHANNEL_ID = 'chat-messages';
const PREFETCH_NOTIFICATION_TYPE = 'prefetch_message';
const PENDING_PREFETCH_DELIVERIES_KEY = 'pending_prefetch_deliveries';

class MessageTriggerEngine {
  constructor() {
    this.isForeground = false;
    this.isStarted = false;
    this.pollTimeout = null;
    this.handleNewMessage = this.handleNewMessage.bind(this);
  }

  /**
   * Initializes the engine. Start foreground polling.
   */
  async start() {
    if (this.isStarted) return;

    this.isStarted = true;
    console.log('[MessageTriggerEngine] Starting foreground polling...');

    // Bind to the global socket for new messages
    socketService.onNewMessage(this.handleNewMessage);
    await this.resumeForeground();
  }

  /**
   * Stops the engine entirely.
   */
  stop() {
    this.isStarted = false;
    this.isForeground = false;
    this.clearPollTimeout();
    this.setPendingPrefetchDeliveries([]);
    Promise.resolve(notifee.cancelTriggerNotifications()).catch(() => {});
    socketService.offNewMessage(this.handleNewMessage);
  }

  clearPollTimeout() {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  hasAuthTokens() {
    return !!mmkvStorage.getItem('user_tokens');
  }

  getPendingPrefetchDeliveries() {
    try {
      return JSON.parse(mmkvStorage.getItem(PENDING_PREFETCH_DELIVERIES_KEY) || '[]');
    } catch {
      return [];
    }
  }

  setPendingPrefetchDeliveries(deliveries) {
    mmkvStorage.setItem(PENDING_PREFETCH_DELIVERIES_KEY, JSON.stringify(deliveries));
  }

  async queuePendingPrefetchDelivery(payload) {
    const existing = this.getPendingPrefetchDeliveries();
    if (existing.some((item) => item.notificationId === payload.notificationId)) {
      return;
    }

    this.setPendingPrefetchDeliveries([...existing, payload]);
  }

  async flushPendingPrefetchDeliveries() {
    if (!this.hasAuthTokens()) return;

    const pending = this.getPendingPrefetchDeliveries();
    if (!pending.length) return;

    const remaining = [];

    for (const payload of pending) {
      try {
        await api.post('/chat/deliver-prefetch', payload);
      } catch (error) {
        remaining.push(payload);
        console.warn('[MessageTriggerEngine] Pending prefetch delivery retry failed:', error.message);
      }
    }

    this.setPendingPrefetchDeliveries(remaining);
  }

  async handleDeliveredPrefetchNotification(notification) {
    const data = notification?.data || {};

    if (data.type !== PREFETCH_NOTIFICATION_TYPE) {
      return false;
    }

    const payload = {
      girlId: data.girlId,
      text: data.text,
      notificationId: data.notificationId || notification?.id,
    };

    if (!payload.girlId || !payload.text) {
      return false;
    }

    try {
      await api.post('/chat/deliver-prefetch', payload);
      return true;
    } catch (error) {
      await this.queuePendingPrefetchDelivery(payload);
      console.warn('[MessageTriggerEngine] Prefetch delivery sync failed, queued for retry:', error.message);
      return false;
    }
  }

  /**
   * Triggers a fast local push notification when the app receives a new socket message
   * but the user isn't physically in the ConversationScreen for that girl.
   */
  async handleNewMessage(msgPayload) {
    if (!this.isForeground) return; // Background fetch handles offline completely

    const activeGirlId = useChatUIStore.getState().activeConversationGirlId;
    if (activeGirlId && String(activeGirlId) === String(msgPayload?.girlProfileId)) {
      return;
    }

    try {
      const channelId = await notifee.createChannel({
        id: FOREGROUND_CHANNEL_ID,
        name: 'Chat Updates',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title: msgPayload?.girl?.name || 'New Message',
        body: msgPayload?.content?.text || 'You received a new photo!',
        android: {
          channelId,
          pressAction: { id: 'default' },
        },
      });
    } catch (e) {
      console.warn('Silent local notification error:', e.message);
    }
  }

  /**
   * Transition to FOREGROUND state.
   * Clear any pending offline local notifications, then start fast polling.
   */
  async resumeForeground() {
    if (!this.isStarted) return;

    this.isForeground = true;
    await this.flushPendingPrefetchDeliveries();

    // Clear previously scheduled offline messages
    await notifee.cancelTriggerNotifications();
    console.log('[MessageTriggerEngine] Cancelled scheduled background notifications.');

    this.clearPollTimeout();
    
    // Poll every 3-5 minutes while active (using a base 3m + 0-2m random)
    const scheduleNextForeground = () => {
      if (!this.isForeground) return;
      const delay = 3 * 60 * 1000 + Math.random() * 2 * 60 * 1000;
      this.pollTimeout = setTimeout(async () => {
        await this.triggerNetworkMessage();
        scheduleNextForeground();
      }, delay);
    };

    scheduleNextForeground();
  }

  /**
   * Transition to BACKGROUND state.
   * Pause polling, prefetch some messages, and schedule them via notifee.
   */
  async pauseForeground() {
    if (!this.isStarted) return;

    this.isForeground = false;
    this.clearPollTimeout();

    try {
      await this.scheduleOfflineMessages();
    } catch (e) {
      console.warn('[MessageTriggerEngine] Failed to schedule offline messages:', e);
    }
  }

  /**
   * Foreground: hit /chat/trigger directly. Real-time websocket notification will handle the UI update.
   */
  async triggerNetworkMessage() {
    try {
      if (!this.hasAuthTokens()) return;

      console.log('[MessageTriggerEngine] Requesting foreground trigger...');
      // Add ?t=timestamp to break iOS/Android networking cache
      await api.get(`/chat/trigger?t=${Date.now()}`);
    } catch (error) {
      console.warn('[MessageTriggerEngine] Error triggering message:', error.message);
    }
  }

  /**
   * Background: hit /chat/prefetch to get future messages, then schedule local pushes.
   */
  async scheduleOfflineMessages() {
    try {
      if (!this.hasAuthTokens()) return;

      await notifee.cancelTriggerNotifications();

      const response = await api.get('/chat/prefetch?count=3');
      const messages = response.data?.data;
      if (!messages || messages.length === 0) return;

      console.log(`[MessageTriggerEngine] Prefetched ${messages.length} messages for offline schedules.`);

      const channelId = await notifee.createChannel({
        id: BACKGROUND_CHANNEL_ID,
        name: 'Direct Messages',
        importance: AndroidImportance.HIGH,
      });

      let nextTimestamp = Date.now() + 15 * 60 * 1000;

      for (const msg of messages) {
        const notificationId = `prefetch-${String(msg.girlId)}-${nextTimestamp}`;
        const trigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: nextTimestamp,
        };

        await notifee.createTriggerNotification({
          id: notificationId,
          title: msg.girlName,
          body: msg.text,
          data: {
            type: PREFETCH_NOTIFICATION_TYPE,
            girlId: String(msg.girlId),
            girlName: msg.girlName,
            girlAvatar: msg.girlAvatar || '',
            text: msg.text,
            notificationId,
          },
          android: {
            channelId,
            pressAction: {
              id: 'default',
            },
          },
        }, trigger);

        nextTimestamp += (30 + Math.floor(Math.random() * 31)) * 60 * 1000;
      }
    } catch (error) {
      console.warn('[MessageTriggerEngine] Prefetch error:', error.message);
    }
  }
}

export default new MessageTriggerEngine();

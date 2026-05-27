import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator.jsx';
import MessageTriggerEngine from './src/engines/MessageTriggerEngine';
import RelationshipEngine from './src/engines/RelationshipEngine.js';
import socketService from './src/api/socket.js';
import useAuthStore from './src/store/authStore.js';
import useChatBadgeStore from './src/store/chatBadgeStore.js';
import { paymentsApi } from './src/api/services.js';
import useAppSettingsStore from './src/store/appSettingsStore.js';
import usePermissionStore from './src/store/permissionStore.js';

const App = () => {
  const appState = useRef(AppState.currentState);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isOnboarded = !!user?.name;
  const bootstrapAppSettings = useAppSettingsStore((s) => s.bootstrap);
  const refreshPermissions = usePermissionStore((s) => s.refreshStatuses);
  const requestPermissions = usePermissionStore((s) => s.requestPermissions);

  useEffect(() => {
    bootstrapAppSettings().catch(() => {});
  }, [bootstrapAppSettings]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    refreshPermissions().catch(() => {});
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshPermissions().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isAuthenticated || !isOnboarded) {
      return undefined;
    }

    const promptMissingPermissions = async () => {
      const statuses = await refreshPermissions().catch(() => null);
      if (!statuses) return;

      const missing = Object.entries(statuses)
        .filter(([, status]) => status === 'denied')
        .map(([key]) => key);

      if (missing.length > 0) {
        await requestPermissions(missing).catch(() => {});
      }
    };

    promptMissingPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        promptMissingPermissions();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, isOnboarded, refreshPermissions, requestPermissions]);

  useEffect(() => {
    if (!isAuthenticated) {
      MessageTriggerEngine.stop();
      RelationshipEngine.stop();
      socketService.disconnect();
      useChatBadgeStore.getState().reset();
      return undefined;
    }

    appState.current = AppState.currentState;
    socketService.connect();
    MessageTriggerEngine.start();
    RelationshipEngine.start();
    useChatBadgeStore.getState().refreshUnreadCount();
    const foregroundNotifUnsub = notifee.onForegroundEvent((event) => {
      RelationshipEngine.handleForegroundNotifeeEvent(event);
    });

    const handleUnreadRefresh = () => {
      useChatBadgeStore.getState().refreshUnreadCount();
    };

    socketService.onNewMessage(handleUnreadRefresh);

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground!
        MessageTriggerEngine.resumeForeground();
        RelationshipEngine.consumePendingNavigation();
        RelationshipEngine.catchUpPendingAccepts().catch(() => {});
        handleUnreadRefresh();
        (async () => {
          try {
            const res = await paymentsApi.orders({ status: 'created', minAgeMinutes: 2, limit: 10 });
            const list = res.data?.data || [];
            for (const o of list) {
              await paymentsApi.reconcile(o._id).catch(() => {});
            }
          } catch { /* ignore */ }
        })();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background!
        MessageTriggerEngine.pauseForeground();
      }
      appState.current = nextAppState;
    });

    return () => {
      socketService.offNewMessage(handleUnreadRefresh);
      subscription.remove();
       foregroundNotifUnsub();
      MessageTriggerEngine.stop();
      RelationshipEngine.stop();
    };
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

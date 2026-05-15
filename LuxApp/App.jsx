import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator.jsx';
import MessageTriggerEngine from './src/engines/MessageTriggerEngine';
import socketService from './src/api/socket.js';
import useAuthStore from './src/store/authStore.js';
import useChatBadgeStore from './src/store/chatBadgeStore.js';

const App = () => {
  const appState = useRef(AppState.currentState);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      MessageTriggerEngine.stop();
      socketService.disconnect();
      useChatBadgeStore.getState().reset();
      return undefined;
    }

    appState.current = AppState.currentState;
    socketService.connect();
    MessageTriggerEngine.start();
    useChatBadgeStore.getState().refreshUnreadCount();

    const handleUnreadRefresh = () => {
      useChatBadgeStore.getState().refreshUnreadCount();
    };

    socketService.onNewMessage(handleUnreadRefresh);

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground!
        MessageTriggerEngine.resumeForeground();
        handleUnreadRefresh();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background!
        MessageTriggerEngine.pauseForeground();
      }
      appState.current = nextAppState;
    });

    return () => {
      socketService.offNewMessage(handleUnreadRefresh);
      subscription.remove();
      MessageTriggerEngine.stop();
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

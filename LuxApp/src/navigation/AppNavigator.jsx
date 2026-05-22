import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../theme/theme.js';
import useAuthStore from '../store/authStore.js';
import TriggerEngine from '../engines/TriggerEngine.js';
import useChatBadgeStore from '../store/chatBadgeStore.js';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen.jsx';
import OtpScreen from '../screens/auth/OtpScreen.jsx';
import OnboardScreen from '../screens/auth/OnboardScreen.jsx';

// Tab Screens
import ForYouScreen from '../screens/Feed/ForYouScreen.jsx';
import InboxScreen from '../screens/Chat/InboxScreen.jsx';
import ProfileScreen from '../screens/Me/ProfileScreen.jsx';

// Stack Screens
import GirlProfileScreen from '../screens/GirlProfile/GirlProfileScreen.jsx';
import IncomingCallScreen from '../screens/IncomingCall/IncomingCallScreen.jsx';
import OutgoingCallScreen from '../screens/OutgoingCall/OutgoingCallScreen.jsx';
import VideoCallScreen from '../screens/VideoCall/VideoCallScreen.jsx';
import CallHistoryScreen from '../screens/Chat/CallHistoryScreen';
import ConversationScreen from '../screens/Chat/ConversationScreen.jsx';
import WalletScreen from '../screens/Me/WalletScreen.jsx';
import CoinPackScreen from '../screens/Me/CoinPackScreen.jsx';
import VIPPlansScreen from '../screens/Me/VIPPlansScreen.jsx';
import TransactionHistoryScreen from '../screens/Me/TransactionHistoryScreen.jsx';
import EditProfileScreen from '../screens/Me/EditProfileScreen.jsx';

export const navigationRef = createNavigationContainerRef();

TriggerEngine.setCallHandler((callData) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('IncomingCall', { callData });
  }
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  ForYou: { focused: 'flame', unfocused: 'flame-outline' },
  Chat: { focused: 'chatbubble', unfocused: 'chatbubble-outline' },
  Me: { focused: 'person', unfocused: 'person-outline' },
};

function MainTabs() {
  const unreadCount = useChatBadgeStore((s) => s.unreadCount);
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.bgSecondary,
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.colors.accentMagenta,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const iconSet = TAB_ICONS[route.name];
          const iconName = focused ? iconSet.focused : iconSet.unfocused;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ForYou" component={ForYouScreen} options={{ tabBarLabel: 'For You' }} />
      <Tab.Screen
        name="Chat"
        component={InboxScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadBadgeLabel : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.accentMagenta,
            color: theme.colors.textPrimary,
            fontSize: 10,
            fontWeight: '800',
            minWidth: unreadCount > 99 ? 24 : 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 1.5,
            borderColor: theme.colors.bgSecondary,
          },
        }}
      />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Onboard" component={OnboardScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="GirlProfile"
        component={GirlProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      {/* These screens will be built in later phases */}
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ animation: 'fade', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="OutgoingCall"
        component={OutgoingCallScreen}
        options={{ animation: 'fade', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CoinPack"
        component={CoinPackScreen}
        options={{ 
          presentation: 'transparentModal', 
          animation: 'fade' 
        }}
      />
      <Stack.Screen
        name="VIPPlans"
        component={VIPPlansScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isOnboarded = !!user?.name;

  return (
    <NavigationContainer ref={navigationRef}>
      {!isAuthenticated ? (
        <AuthStack />
      ) : !isOnboarded ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboard" component={OnboardScreen} />
        </Stack.Navigator>
      ) : (
        <AppStack />
      )}
    </NavigationContainer>
  );
}


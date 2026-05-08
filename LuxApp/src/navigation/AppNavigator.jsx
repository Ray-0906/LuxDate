import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../theme/theme.js';
import useAuthStore from '../store/authStore.js';
import TriggerEngine from '../engines/TriggerEngine.js';

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
import VideoCallScreen from '../screens/VideoCall/VideoCallScreen.jsx';

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
      <Tab.Screen name="Chat" component={InboxScreen} />
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
      {/* <Stack.Screen name="Conversation" component={ConversationScreen} /> */}
      {/* <Stack.Screen name="CallHistory" component={CallHistoryScreen} /> */}
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ animation: 'fade', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{ animation: 'fade' }}
      />
      {/* <Stack.Screen name="Wallet" component={WalletScreen} /> */}
      {/* <Stack.Screen name="VIPPlans" component={VIPPlansScreen} /> */}
      {/* <Stack.Screen name="CoinRecharge" component={CoinRechargeSheet} /> */}
      {/* <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} /> */}
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

import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ChatProvider } from '../src/context/ChatContext';
import { registerForPush, notificationPath } from '../src/lib/push';
import { colors } from '../src/theme';
import { stackScreenOptions, sheetOptions } from '../src/navigation';

SplashScreen.preventAutoHideAsync().catch(() => {});


function Navigator() {
  const { loading, signedIn, refreshMe } = useAuth();
  const router = useRouter();
  const askedAboutAvatar = useRef(false);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // After sign-in: register for pushes and open chats from notification taps.
  useEffect(() => {
    if (!signedIn) return undefined;
    registerForPush().catch((error) => console.warn('Push registration failed', error));
    const open = (response) => {
      const path = notificationPath(response);
      if (path) router.push(path, { withAnchor: true });
    };
    Notifications.getLastNotificationResponseAsync().then((response) => response && open(response)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [signedIn, router]);

  // Once per member: what's new in the app, and choose a public avatar.
  useEffect(() => {
    if (!signedIn) {
      askedAboutAvatar.current = false;
      return;
    }
    if (askedAboutAvatar.current) return;
    askedAboutAvatar.current = true;
    refreshMe()
      .then((me) => {
        if (!me.avatarPromptDoneAt) setTimeout(() => router.push('/whats-new'), 600);
      })
      .catch(() => {});
  }, [signedIn, refreshMe, router]);

  if (loading) return null;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: '' }} />
        <Stack.Screen name="chat/[roomId]" options={{ title: 'Chat' }} />
        <Stack.Screen name="member/[id]" options={{ title: '' }} />
        <Stack.Screen name="gallery/[eventId]" options={{ title: 'Photos' }} />
        <Stack.Screen name="edit-profile" options={{ ...sheetOptions, title: 'Edit profile' }} />
        <Stack.Screen name="delete-account" options={{ ...sheetOptions, title: 'Delete account' }} />
        <Stack.Screen name="new-message" options={{ ...sheetOptions, title: 'New message', sheetAllowedDetents: [0.6, 1] }} />
        <Stack.Screen name="whats-new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="new-group" options={{ ...sheetOptions, title: 'New group' }} />
        <Stack.Screen name="rsvp" options={{ ...sheetOptions, title: 'Before you RSVP' }} />
        <Stack.Screen name="chat-info" options={{ title: '' }} />
        <Stack.Screen
          name="photos"
          options={{ presentation: 'fullScreenModal', title: '', headerTransparent: true, contentStyle: { backgroundColor: '#000' } }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: '' }} />
        <Stack.Screen name="register" options={{ title: 'Join' }} />
        <Stack.Screen name="forgot-password" options={{ ...sheetOptions, title: 'Reset password' }} />
      </Stack.Protected>
      {/* Guidelines, privacy and the photography notice: open to everyone. */}
      <Stack.Screen name="info/[page]" options={{ ...sheetOptions, title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Thelorin: require('../assets/fonts/Thelorin.otf') });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.navy }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ChatProvider>
            <StatusBar style="light" />
            <Navigator />
          </ChatProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import { useEffect } from 'react';
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
  const { loading, signedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // After sign-in: register for pushes and open chats from notification taps.
  useEffect(() => {
    if (!signedIn) return undefined;
    registerForPush().catch((error) => console.warn('Push registration failed', error));
    const open = (response) => {
      const path = notificationPath(response);
      if (path) router.push(path);
    };
    Notifications.getLastNotificationResponseAsync().then((response) => response && open(response)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [signedIn, router]);

  if (loading) return null;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: '' }} />
        <Stack.Screen name="chat/[roomId]" options={{ title: 'Chat' }} />
        <Stack.Screen name="member/[id]" options={{ title: '' }} />
        <Stack.Screen name="edit-profile" options={{ ...sheetOptions, title: 'Edit profile' }} />
        <Stack.Screen name="delete-account" options={{ ...sheetOptions, title: 'Delete account' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
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

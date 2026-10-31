import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';
import { EAS_PROJECT_ID } from '../config';

// SDK 58 shows foreground notifications by default; we hide chat pushes for
// the room that's currently open on screen (see setActiveRoom).
let activeRoomId = null;
export function setActiveRoom(roomId) {
  activeRoomId = roomId;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const roomId = notification.request.content.data?.roomId;
    const inThisRoom = roomId && roomId === activeRoomId;
    return {
      shouldShowBanner: !inThisRoom,
      shouldShowList: !inThisRoom,
      shouldPlaySound: !inThisRoom,
      shouldSetBadge: false
    };
  }
});

let registeredToken = null;

// Asks permission (once) and registers this phone for chat/announcement pushes.
export async function registerForPush() {
  if (!Device.isDevice) return null; // simulators can't receive pushes
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat', {
      name: 'Chats and announcements',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#ffd460'
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted' && current.canAskAgain !== false) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;
  if (!EAS_PROJECT_ID) {
    console.warn('Push disabled: set EAS_PROJECT_ID (run `eas init`).');
    return null;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
  await api.registerPushToken(token, Platform.OS);
  registeredToken = token;
  return token;
}

export async function unregisterPush() {
  if (!registeredToken) return;
  await api.removePushToken(registeredToken).catch(() => {});
  registeredToken = null;
}

// Opening a notification goes to its chat: data.url is mcrgents://chat/<roomId>.
export function notificationPath(response) {
  const data = response?.notification?.request?.content?.data || {};
  // Admin alerts (RSVPs, new members, chat reports) name the screen to open.
  if (typeof data.path === 'string' && data.path.startsWith('/')) return data.path;
  if (data.roomId) return `/chat/${encodeURIComponent(data.roomId)}`;
  if (data.eventId) return `/event/${encodeURIComponent(data.eventId)}`;
  return null;
}

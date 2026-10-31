import { useCallback, useEffect, useState } from 'react';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { api } from '../lib/api';
import { colors } from '../theme';

function useUnreadNotifications() {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    api
      .notifications()
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(refresh);
    return () => sub.remove();
  }, [refresh]);
  return unread;
}

// Native header toolbar for the main tabs (in the side rail on a folded iPhone
// Duo): a bell for the notification inbox, with the unread count, plus any
// screen-specific buttons passed as children.
export function NotificationToolbar({ children }) {
  const router = useRouter();
  const unread = useUnreadNotifications();
  return (
    <Stack.Toolbar placement="right">
      {children}
      <Stack.Toolbar.Button onPress={() => router.push('/notifications')} tintColor={colors.gold}>
        <Stack.Toolbar.Icon sf={unread ? 'bell.badge' : 'bell'} />
        <Stack.Toolbar.Label>{unread ? `Notifications, ${unread} unread` : 'Notifications'}</Stack.Toolbar.Label>
        {unread ? <Stack.Toolbar.Badge>{unread > 9 ? '9+' : String(unread)}</Stack.Toolbar.Badge> : null}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { colors, space } from '../theme';

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
// screen-specific actions ({ icon, label, onPress }) before it. Android's
// toolbar can't draw SF Symbols, so there they're plain header buttons.
export function NotificationToolbar({ actions = [] }) {
  const router = useRouter();
  const unread = useUnreadNotifications();
  const label = unread ? `Notifications, ${unread} unread` : 'Notifications';
  const openInbox = () => router.push('/notifications');

  if (Platform.OS === 'android') {
    return (
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.buttons}>
              {actions.map((a) => (
                <Pressable key={a.label} onPress={a.onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={a.label}>
                  <Icon name={a.icon} size={22} color={colors.gold} />
                </Pressable>
              ))}
              <Pressable onPress={openInbox} hitSlop={12} accessibilityRole="button" accessibilityLabel={label} style={styles.bell}>
                <Icon name={unread ? 'bell.badge' : 'bell'} size={22} color={colors.gold} />
                {unread ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          )
        }}
      />
    );
  }

  return (
    <Stack.Toolbar placement="right">
      {actions.map((a) => (
        <Stack.Toolbar.Button key={a.label} icon={a.icon} onPress={a.onPress} tintColor={colors.gold}>
          {a.label}
        </Stack.Toolbar.Button>
      ))}
      <Stack.Toolbar.Button onPress={openInbox} tintColor={colors.gold}>
        <Stack.Toolbar.Icon sf={unread ? 'bell.badge' : 'bell'} />
        <Stack.Toolbar.Label>{label}</Stack.Toolbar.Label>
        {unread ? <Stack.Toolbar.Badge>{unread > 9 ? '9+' : String(unread)}</Stack.Toolbar.Badge> : null}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  // Room for the badge: the header clips anything outside the button.
  bell: { padding: 6 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' }
});

import { NativeTabs } from 'expo-router/native-tabs';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { colors } from '../../src/theme';

// Native tab bar: Liquid Glass on iOS (in the side rail on a folded iPhone
// Duo), Material on Android. The Admin tab only exists for admins.
export default function TabsLayout() {
  const { user } = useAuth();
  const { unreadTotal } = useChat();
  return (
    <NativeTabs tintColor={colors.gold} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="events">
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chats">
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="forum" />
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
        {unreadTotal > 0 ? (
          <NativeTabs.Trigger.Badge>{unreadTotal > 99 ? '99+' : String(unreadTotal)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="admin" hidden={!user?.isAdmin}>
        <NativeTabs.Trigger.Icon sf="shield.lefthalf.filled" md="admin_panel_settings" />
        <NativeTabs.Trigger.Label>Admin</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

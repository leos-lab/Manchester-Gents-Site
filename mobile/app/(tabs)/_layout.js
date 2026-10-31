import { NativeTabs } from 'expo-router/native-tabs';
import { useChat } from '../../src/context/ChatContext';
import { colors } from '../../src/theme';

// Native tab bar: Liquid Glass on iOS, Material on Android.
export default function TabsLayout() {
  const { unreadTotal } = useChat();
  return (
    <NativeTabs tintColor={colors.gold} minimizeBehavior="onScrollDown">
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
    </NativeTabs>
  );
}

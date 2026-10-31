import { Stack } from 'expo-router';
import { stackScreenOptions, sheetOptions } from '../../../src/navigation';

// Admin dashboard (the tab only shows for admins; the API checks too).
export default function AdminStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Admin', headerLargeTitle: true }} />
      <Stack.Screen name="events" options={{ title: 'Events' }} />
      <Stack.Screen name="event/[id]" options={{ title: '' }} />
      <Stack.Screen name="event-form" options={{ ...sheetOptions, title: 'Event' }} />
      <Stack.Screen name="members" options={{ title: 'Members' }} />
      <Stack.Screen name="member/[id]" options={{ title: '' }} />
      <Stack.Screen name="add-guests" options={{ ...sheetOptions, title: 'Add guests' }} />
      <Stack.Screen name="reports" options={{ title: 'Chat reports' }} />
      <Stack.Screen name="reminders" options={{ title: 'RSVP reminders' }} />
      <Stack.Screen name="settings" options={{ title: 'Security' }} />
    </Stack>
  );
}

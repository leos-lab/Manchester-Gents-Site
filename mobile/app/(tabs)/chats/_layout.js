import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../src/navigation';

// Header buttons (New message, notifications) come from the screen's
// native toolbar (see app/(tabs)/chats/index.js).
export default function ChatsStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Chats', headerLargeTitle: true }} />
    </Stack>
  );
}

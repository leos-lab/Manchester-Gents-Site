import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../src/navigation';

export default function ChatsStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Chats', headerLargeTitle: true }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../src/navigation';

export default function EventsStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Events', headerLargeTitle: true }} />
    </Stack>
  );
}

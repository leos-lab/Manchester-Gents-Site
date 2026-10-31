import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../src/navigation';

export default function ProfileStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Profile', headerLargeTitle: true }} />
    </Stack>
  );
}

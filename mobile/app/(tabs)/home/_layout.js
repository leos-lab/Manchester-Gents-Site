import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../src/navigation';

export default function HomeStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Home', headerLargeTitle: true }} />
    </Stack>
  );
}

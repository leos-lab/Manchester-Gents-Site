import { Platform, Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Icon } from '../../../src/components/Icon';
import { colors } from '../../../src/theme';
import { stackScreenOptions } from '../../../src/navigation';

export default function ChatsStack() {
  const router = useRouter();
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Chats',
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable onPress={() => router.push('/new-message')} hitSlop={12} accessibilityRole="button" accessibilityLabel="New message">
              {Platform.OS === 'ios' ? (
                <Icon name="square.and.pencil" size={22} color={colors.gold} />
              ) : (
                <Text style={{ color: colors.gold, fontWeight: '600' }}>New</Text>
              )}
            </Pressable>
          )
        }}
      />
    </Stack>
  );
}

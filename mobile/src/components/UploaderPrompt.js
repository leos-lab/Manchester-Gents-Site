import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './Button';
import { colors, fonts, radius, space } from '../theme';

// Credits photos to someone before they're uploaded to an event gallery:
// "Name (@handle)" for the member, or a name typed for someone else.
export function uploaderLabel(user) {
  const name = user?.preferredName?.trim() || user?.firstName?.trim() || user?.name?.split(' ')[0] || 'Member';
  return user?.instagram?.handle ? `${name} (@${user.instagram.handle})` : name;
}

export function UploaderPrompt({ visible, count, user, onUpload, onCancel }) {
  const mine = uploaderLabel(user);
  const [someoneElse, setSomeoneElse] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setSomeoneElse(false);
      setName('');
    }
  }, [visible]);

  const photos = `${count} ${count === 1 ? 'photo' : 'photos'}`;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>Upload {photos}</Text>
          {someoneElse ? (
            <>
              <Text style={styles.text}>Who took them? Their name is shown with the photos.</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Sam (@samsuits)"
                placeholderTextColor={colors.textFaint}
                autoFocus
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={() => name.trim() && onUpload(name.trim())}
              />
              <Button title="Upload" onPress={() => onUpload(name.trim())} disabled={!name.trim()} />
              <Button title={`Upload as ${mine} instead`} variant="ghost" onPress={() => setSomeoneElse(false)} />
            </>
          ) : (
            <>
              <Text style={styles.text}>Photos are shown with who uploaded them.</Text>
              <Button title={`Upload as ${mine}`} onPress={() => onUpload(mine)} />
              <Button title="Uploading for someone else?" variant="secondary" onPress={() => setSomeoneElse(true)} />
            </>
          )}
          <Button title="Cancel" variant="ghost" onPress={onCancel} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: space.xl, gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, maxWidth: 440, width: '100%', alignSelf: 'center' },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 28 },
  text: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 13 }
});

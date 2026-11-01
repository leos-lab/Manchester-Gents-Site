import { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api, privateImage } from '../../../../src/lib/api';
import { useLoader } from '../../../../src/lib/useLoader';
import { eventWhen, memberSince } from '../../../../src/lib/format';
import { Avatar } from '../../../../src/components/Avatar';
import { Button } from '../../../../src/components/Button';
import { Chip } from '../../../../src/components/Chip';
import { Content } from '../../../../src/components/Content';
import { Field, ToggleRow } from '../../../../src/components/Form';
import { ListGroup, ListRow } from '../../../../src/components/ListGroup';
import { PhotoViewer } from '../../../../src/components/PhotoViewer';
import { colors, fonts, radius, space } from '../../../../src/theme';

const STATUS = { CONFIRMED: 'Going', WAITLISTED: 'Waitlist', CANCELLED: 'Cancelled' };

// One member for admins: reference photo, contact details, events, chat ban,
// and editing their details (as on the website's member editor).
export default function AdminMember() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, refreshing, refresh, reload } = useLoader(() => api.admin.member(id));
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null); // { source, label }

  if (!data) return <View style={styles.screen} />;
  const { member, events } = data;

  const startEditing = () =>
    setEditing({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      preferredName: member.preferredName || '',
      shareFirstName: member.shareFirstName !== false,
      email: member.email || '',
      phoneNumber: member.phoneNumber || ''
    });

  const save = async () => {
    setBusy(true);
    try {
      const fields = {
        firstName: editing.firstName.trim() || undefined,
        lastName: editing.lastName.trim() || undefined,
        preferredName: editing.preferredName.trim(),
        shareFirstName: editing.shareFirstName,
        phoneNumber: editing.phoneNumber.trim()
      };
      if (editing.email.trim() && editing.email.trim() !== member.email) fields.email = editing.email.trim();
      await api.admin.updateMember(member.id, fields);
      setEditing(null);
      await reload();
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const unban = async () => {
    try {
      await api.admin.unbanFromChat(member.id);
      await reload();
    } catch (e) {
      Alert.alert('Couldn’t unban', e.message);
    }
  };

  // A reset link to send by hand (e.g. their email is out of date). After
  // using it they're signed in and asked to check their details.
  const shareResetLink = async () => {
    try {
      const { url, expiresAt } = await api.admin.resetLink(member.id);
      const until = new Date(expiresAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      await Share.share({
        message: `Hi ${member.name.split(' ')[0]}, here’s a link to set a new Manchester Gents password. It works until ${until}: ${url}`
      });
    } catch (e) {
      Alert.alert('Couldn’t make a reset link', e.message);
    }
  };

  const remove = () =>
    Alert.alert(`Remove ${member.name}?`, 'This deletes their account, RSVPs and chat memberships. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove member',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.admin.deleteMember(member.id);
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t remove', e.message);
          }
        }
      }
    ]);

  const set = (key) => (value) => setEditing((f) => ({ ...f, [key]: value }));

  return (
    <>
      <Stack.Screen options={{ title: member.name }} />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        <Content style={styles.content}>
          {/* Tap either photo to see it full size (the reference photo uncropped). */}
          <View style={styles.photos}>
            {member.referencePhotoUrl ? (
              <Pressable
                style={styles.photoBlock}
                onPress={() => setViewing({ source: privateImage(member.referenceFullUrl), label: 'Reference photo' })}
                accessibilityRole="imagebutton"
                accessibilityLabel="Reference photo. Open full size"
              >
                <Image source={privateImage(member.referencePhotoUrl)} style={styles.reference} contentFit="cover" />
                <Text style={styles.caption}>Reference (private)</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.photoBlock}
              disabled={!member.avatarUrl}
              onPress={() => setViewing({ source: { uri: member.avatarUrl }, label: 'Profile photo' })}
              accessibilityRole="imagebutton"
              accessibilityLabel={member.avatarUrl ? 'Profile photo. Open full size' : 'No profile photo'}
            >
              <Avatar name={member.name} uri={member.avatarUrl} size={96} ring={member.isAdmin} />
              <Text style={styles.caption}>{member.avatarUrl ? 'Profile photo' : 'No profile photo'}</Text>
            </Pressable>
          </View>
          <PhotoViewer source={viewing?.source} label={viewing?.label} onClose={() => setViewing(null)} />

          <View style={styles.header}>
            <Text style={styles.name}>{member.name}</Text>
            <View style={styles.chips}>
              {member.isAdmin ? <Chip label="Admin" tone="gold" /> : null}
              {member.isPlaceholder ? <Chip label="Placeholder" /> : <Chip label={`Joined ${memberSince(member.memberSince)}`} />}
              {member.termsAgreed === false ? <Chip label="Terms not accepted" /> : null}
            </View>
            {member.bio ? <Text style={styles.bio}>{member.bio}</Text> : null}
          </View>

          {editing ? (
            <View style={styles.form}>
              <View style={styles.row}>
                <Field style={styles.flex} label="First name" value={editing.firstName} onChangeText={set('firstName')} />
                <Field style={styles.flex} label="Last name" value={editing.lastName} onChangeText={set('lastName')} />
              </View>
              <Field label="Preferred name" value={editing.preferredName} onChangeText={set('preferredName')} />
              <ToggleRow title="Show real name" value={editing.shareFirstName} onValueChange={set('shareFirstName')} />
              {!member.isPlaceholder ? <Field label="Email" value={editing.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" /> : null}
              <Field label="Phone" value={editing.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad" />
              <View style={styles.row}>
                <Button title="Cancel" variant="secondary" style={styles.flex} onPress={() => setEditing(null)} />
                <Button title="Save" style={styles.flex} onPress={save} loading={busy} />
              </View>
            </View>
          ) : (
            <ListGroup title="Contact">
              {member.instagramHandle ? (
                <ListRow symbol="camera" title={`@${member.instagramHandle}`} onPress={() => Linking.openURL(`https://instagram.com/${encodeURIComponent(member.instagramHandle)}`)} />
              ) : null}
              {member.email ? <ListRow symbol="envelope" title={member.email} onPress={() => Linking.openURL(`mailto:${member.email}`)} /> : null}
              {member.phoneNumber ? <ListRow symbol="phone" title={member.phoneNumber} onPress={() => Linking.openURL(`tel:${member.phoneNumber.replace(/\s/g, '')}`)} /> : null}
              {member.preferredContactMethod ? <ListRow symbol="text.bubble" title={member.preferredContactMethod} /> : null}
              <ListRow symbol="pencil" title="Edit details" onPress={startEditing} />
              {!member.isPlaceholder ? (
                <ListRow symbol="key" title="Send a password reset link" subtitle="Valid for 3 days. Share it by message." onPress={shareResetLink} />
              ) : null}
            </ListGroup>
          )}

          <ListGroup title={`Events · ${events.length}`}>
            {events.length ? (
              events.map((e) => (
                <ListRow
                  key={e.id}
                  title={e.title}
                  subtitle={`${eventWhen(e.startTime).date} · ${STATUS[e.status] || e.status}${e.specialRequests ? ` · Note: ${e.specialRequests}` : ''}`}
                  onPress={() => router.push(`/admin/event/${e.id}`)}
                />
              ))
            ) : (
              <ListRow title="No events yet" />
            )}
          </ListGroup>

          <ListGroup title="Chat" footer={member.chatBanned ? 'Banned members can read their chats but can’t post. Bans are made from chat reports.' : undefined}>
            {member.chatBanned ? (
              <ListRow symbol="checkmark.bubble" title="Let them post again" onPress={unban} />
            ) : (
              <ListRow symbol="bubble.left.and.bubble.right" title="Can post in chats" chevron={false} />
            )}
          </ListGroup>

          {!member.isAdmin ? (
            <ListGroup>
              <ListRow title="Remove member" destructive chevron={false} onPress={remove} />
            </ListGroup>
          ) : null}
        </Content>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.xl, paddingBottom: 140 },
  photos: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  photoBlock: { alignItems: 'center', gap: space.sm },
  reference: { width: 96, height: 96, borderRadius: radius.md },
  caption: { color: colors.textFaint, fontSize: 12 },
  header: { alignItems: 'center', gap: space.sm },
  name: { color: colors.gold, fontFamily: fonts.heading, fontSize: 32, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  bio: { color: colors.text, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  form: { gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 }
});

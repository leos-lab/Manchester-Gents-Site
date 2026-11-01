import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { eventWhen, messageTime } from '../../../src/lib/format';
import { Button } from '../../../src/components/Button';
import { Content } from '../../../src/components/Content';
import { Field, SectionTitle } from '../../../src/components/Form';
import { ListGroup, ListRow } from '../../../src/components/ListGroup';
import { colors, radius, space } from '../../../src/theme';

const AUDIENCES = [
  { key: 'ALL', label: 'All members', needsEvent: false },
  { key: 'GOING', label: 'Going to the event', needsEvent: true },
  { key: 'NOT_RSVPED', label: 'Haven’t RSVPed yet', needsEvent: true }
];
const AUDIENCE_LABEL = { ALL: 'All members', GOING: 'Going', NOT_RSVPED: 'Not RSVPed' };

// Push an announcement to members. It's also posted in the community chat
// (all members) or the event chat (those going).
export default function Announce() {
  const { data, refreshing, refresh, reload } = useLoader(async () => {
    const [{ events }, { announcements }] = await Promise.all([api.admin.events(), api.admin.announcements()]);
    const recent = Date.now() - 14 * 24 * 3600 * 1000;
    return { events: events.filter((e) => new Date(e.startTime) >= recent).reverse(), announcements };
  });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventId, setEventId] = useState(null); // null = general
  const [audience, setAudience] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const event = data?.events.find((e) => e.id === eventId);

  const regarding = (id) => {
    setEventId(id);
    if (!id) setAudience('ALL');
  };

  const send = () => {
    const who =
      audience === 'ALL' ? 'every member' : audience === 'GOING' ? `everyone going to ${event.title}` : `members who haven’t RSVPed to ${event.title}`;
    Alert.alert('Send announcement?', `A notification goes to ${who}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setBusy(true);
          try {
            const result = await api.admin.announce({ title: title.trim(), body: body.trim(), eventId, audience });
            Alert.alert('Announcement sent', `${result.recipients} ${result.recipients === 1 ? 'member' : 'members'}, ${result.delivered} with the app.`);
            setTitle('');
            setBody('');
            await reload();
          } catch (e) {
            Alert.alert('Couldn’t send', e.message);
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardDismissMode="interactive"
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        <Content style={styles.content}>
          <Field label="Title" value={title} onChangeText={setTitle} maxLength={80} placeholder="Doors open at 7pm" />
          <Field label="Message" value={body} onChangeText={setBody} maxLength={1000} multiline placeholder="What do members need to know?" />

          <SectionTitle>Regarding</SectionTitle>
          <View style={styles.options}>
            <Option label="General" selected={!eventId} onPress={() => regarding(null)} />
            {data?.events.map((e) => (
              <Option key={e.id} label={e.title} detail={eventWhen(e.startTime).date} selected={eventId === e.id} onPress={() => regarding(e.id)} />
            ))}
          </View>

          <SectionTitle>Send to</SectionTitle>
          <View style={styles.options}>
            {AUDIENCES.map((a) => (
              <Option
                key={a.key}
                label={a.label}
                detail={a.needsEvent && !eventId ? 'Choose an event above' : undefined}
                selected={audience === a.key}
                disabled={a.needsEvent && !eventId}
                onPress={() => setAudience(a.key)}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            {audience === 'ALL'
              ? 'Also posted in the community chat.'
              : audience === 'GOING'
                ? 'Also posted in the event chat.'
                : 'Notification only, with a link to the event.'}
          </Text>

          <Button title="Send announcement" onPress={send} loading={busy} disabled={title.trim().length < 2 || body.trim().length < 2} />

          {data?.announcements.length ? (
            <ListGroup title="Sent">
              {data.announcements.map((a) => (
                <ListRow
                  key={a.id}
                  title={a.title}
                  subtitle={`${AUDIENCE_LABEL[a.audience] || a.audience}${a.event ? ` · ${a.event.title}` : ''} · ${a.recipients} members · ${messageTime(a.createdAt)}${a.createdBy ? ` · ${a.createdBy}` : ''}`}
                />
              ))}
            </ListGroup>
          ) : null}
        </Content>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Option({ label, detail, selected, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={1}>{label}</Text>
      {detail ? <Text style={[styles.optionDetail, selected && styles.optionLabelSelected]}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 140 },
  options: { gap: space.sm },
  option: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { backgroundColor: 'rgba(255, 212, 96, 0.16)', borderColor: colors.gold },
  optionDisabled: { opacity: 0.45 },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  optionLabelSelected: { color: colors.gold },
  optionDetail: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  hint: { color: colors.textMuted, fontSize: 14 }
});

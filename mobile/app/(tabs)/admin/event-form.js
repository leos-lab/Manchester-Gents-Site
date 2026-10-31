import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { api } from '../../../src/lib/api';
import { useGutter } from '../../../src/lib/layout';
import { Button } from '../../../src/components/Button';
import { Field, SectionTitle, ToggleRow } from '../../../src/components/Form';
import { colors, radius, space } from '../../../src/theme';

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

function nextSocial() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(19, 0, 0, 0);
  return d;
}

// Create (no id) or edit (?id=) an event: same fields as the website's form.
// New published events notify every member with the app.
export default function EventForm() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const gutter = useGutter(space.xl);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    location: '',
    startTime: nextSocial(),
    endTime: null,
    signupDeadline: null,
    capacity: '',
    published: false
  });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!id) return;
    api.admin
      .event(id)
      .then(({ event }) =>
        setForm({
          title: event.title,
          slug: event.slug,
          subtitle: event.subtitle || '',
          description: event.description || '',
          location: event.location || '',
          startTime: new Date(event.startTime),
          endTime: event.endTime ? new Date(event.endTime) : null,
          signupDeadline: event.signupDeadline ? new Date(event.signupDeadline) : null,
          capacity: event.capacity ? String(event.capacity) : '',
          published: event.published
        })
      )
      .catch((e) => Alert.alert('Couldn’t load the event', e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const setTitle = (title) => setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));

  const save = async () => {
    const capacity = form.capacity.trim() ? Number.parseInt(form.capacity, 10) : undefined;
    if (form.title.trim().length < 3) return Alert.alert('Add a title', 'At least 3 characters.');
    if (!/^[a-z0-9-]{3,}$/i.test(form.slug)) return Alert.alert('Check the web address', 'Use letters, numbers and dashes.');
    if (capacity !== undefined && !(capacity > 0)) return Alert.alert('Check the capacity', 'Use a whole number, or leave it blank.');
    if (form.endTime && form.endTime <= form.startTime) return Alert.alert('Check the times', 'The end must be after the start.');
    setBusy(true);
    try {
      const fields = {
        title: form.title.trim(),
        slug: form.slug,
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startTime: form.startTime.toISOString(),
        endTime: form.endTime ? form.endTime.toISOString() : '',
        signupDeadline: form.signupDeadline ? form.signupDeadline.toISOString() : '',
        capacity,
        published: form.published
      };
      if (id) {
        await api.admin.updateEvent(id, fields);
        router.back();
      } else {
        const { event } = await api.admin.createEvent(fields);
        router.replace(`/admin/event/${event.id}`);
      }
    } catch (e) {
      Alert.alert('Couldn’t save the event', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Edit event' : 'New event' }} />
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]} keyboardShouldPersistTaps="handled">
        <Field label="Title" value={form.title} onChangeText={setTitle} placeholder="Lodge Social: January" />
        <Field
          label="Web address"
          hint={`manchestergents.com/events/${form.slug || '…'}`}
          value={form.slug}
          onChangeText={(v) => {
            setSlugTouched(true);
            set('slug')(slugify(v));
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Field label="Subtitle" value={form.subtitle} onChangeText={set('subtitle')} />
        <Field label="Location" value={form.location} onChangeText={set('location')} />
        <Field label="Description" value={form.description} onChangeText={set('description')} multiline />

        <SectionTitle>When</SectionTitle>
        <DateField label="Starts" value={form.startTime} onChange={set('startTime')} />
        <DateField label="Ends" value={form.endTime} onChange={set('endTime')} optional fallback={() => new Date(form.startTime.getTime() + 4 * 3600 * 1000)} />
        <DateField label="RSVPs close" value={form.signupDeadline} onChange={set('signupDeadline')} optional fallback={() => form.startTime} />

        <SectionTitle>Guests</SectionTitle>
        <Field
          label="Capacity"
          hint={id && form.capacity ? 'Leave as is or change it; it can’t be removed once set.' : 'Leave blank for no limit.'}
          value={form.capacity}
          onChangeText={set('capacity')}
          keyboardType="number-pad"
        />
        <ToggleRow
          title="Published"
          description={id ? 'Members can see and RSVP.' : 'Members can see and RSVP, and everyone with the app gets a notification.'}
          value={form.published}
          onValueChange={set('published')}
        />

        <Button title={id ? 'Save changes' : 'Create event'} onPress={save} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Date and time row: iOS shows compact native pickers inline; Android opens
// the date then the time dialog. Optional fields can be cleared.
function DateField({ label, value, onChange, optional, fallback }) {
  const shown = value || null;
  const openAndroid = () => {
    const start = shown || fallback?.() || new Date();
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (e2, time) => e2.type === 'set' && time && onChange(time)
        });
      }
    });
  };

  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      {shown ? (
        Platform.OS === 'ios' ? (
          <DateTimePicker value={shown} mode="datetime" display="compact" onChange={(_, d) => d && onChange(d)} themeVariant="dark" accentColor={colors.gold} minuteInterval={5} />
        ) : (
          <Pressable onPress={openAndroid}>
            <Text style={styles.dateValue}>{shown.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          </Pressable>
        )
      ) : (
        <Pressable onPress={() => (Platform.OS === 'ios' ? onChange(fallback?.() || new Date()) : openAndroid())} accessibilityRole="button">
          <Text style={styles.dateAdd}>Add</Text>
        </Pressable>
      )}
      {optional && shown ? (
        <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
          <Text style={styles.dateClear}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 52
  },
  dateLabel: { color: colors.text, fontSize: 16, flex: 1 },
  dateValue: { color: colors.gold, fontSize: 16 },
  dateAdd: { color: colors.gold, fontSize: 16, fontWeight: '600' },
  dateClear: { color: colors.textMuted, fontSize: 14 }
});

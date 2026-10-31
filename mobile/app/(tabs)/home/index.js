import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { eventWhen } from '../../../src/lib/format';
import { useAuth } from '../../../src/context/AuthContext';
import { useChat } from '../../../src/context/ChatContext';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { Content } from '../../../src/components/Content';
import { EventCard } from '../../../src/components/EventCard';
import { GalleryStrip } from '../../../src/components/GalleryStrip';
import { Icon } from '../../../src/components/Icon';
import { colors, fonts, radius, space } from '../../../src/theme';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
}

// The signed-in landing tab: your next social, anything waiting for you in
// chats, what's coming up, the latest photos and (for admins) the to-do list.
export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { rooms } = useChat();
  const [upcoming, setUpcoming] = useState(null);
  const [lastPast, setLastPast] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [up, past, overview] = await Promise.all([
      api.events('upcoming').catch(() => null),
      api.events('past').catch(() => null),
      user?.isAdmin ? api.admin.overview().catch(() => null) : null
    ]);
    if (up) setUpcoming(up.events);
    if (past) setLastPast(past.events[0] || null);
    setAdmin(overview);
  }, [user?.isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mine = upcoming?.find((e) => e.myRsvp === 'CONFIRMED' || e.myRsvp === 'WAITLISTED');
  const featured = mine || upcoming?.[0];
  const later = (upcoming || []).filter((e) => e.id !== featured?.id).slice(0, 4);
  const unread = rooms.filter((r) => r.unread > 0 && !r.muted).slice(0, 3);
  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <Stack.Screen options={{ title: firstName ? `${greeting()}, ${firstName}` : 'Home' }} />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.gold}
          />
        }
      >
        <Content style={styles.content}>
          {featured ? (
            <Section title={mine ? 'Your next social' : 'Next social'}>
              <EventCard event={featured} onPress={() => router.push(`/event/${featured.id}`)} />
              {!mine ? (
                <Button title="Reserve your spot" onPress={() => router.push(`/event/${featured.id}`)} />
              ) : null}
            </Section>
          ) : upcoming ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Next social coming soon</Text>
              <Text style={styles.muted}>We’ll send a notification as soon as it’s announced.</Text>
            </View>
          ) : null}

          {admin ? <AdminTodo admin={admin} onOpen={(path) => router.push(path)} /> : null}

          {unread.length ? (
            <Section title="Unread messages" action={{ label: 'All chats', onPress: () => router.push('/chats') }}>
              <View style={styles.list}>
                {unread.map((room) => (
                  <Pressable
                    key={room.id}
                    style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                    onPress={() => router.push(`/chat/${room.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${room.title}, ${room.unread} unread`}
                  >
                    {room.kind === 'EVENT' ? (
                      <Icon name="person.3.fill" size={22} color={colors.gold} style={styles.rowIcon} />
                    ) : (
                      <Avatar name={room.other?.name} uri={room.other?.photoUrl} size={36} />
                    )}
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{room.title}</Text>
                      <Text style={styles.muted} numberOfLines={1}>{room.lastBody || 'New messages'}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{room.unread > 99 ? '99+' : room.unread}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}

          {later.length ? (
            <Section title="Coming up" action={{ label: 'All events', onPress: () => router.push('/events') }}>
              <View style={styles.list}>
                {later.map((e) => {
                  const when = eventWhen(e.startTime);
                  return (
                    <Pressable
                      key={e.id}
                      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                      onPress={() => router.push(`/event/${e.id}`)}
                      accessibilityRole="button"
                    >
                      <View style={styles.flex}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{e.title}</Text>
                        <Text style={styles.muted}>{when.date}</Text>
                      </View>
                      {e.myRsvp === 'CONFIRMED' ? <Icon name="checkmark.circle.fill" size={20} color={colors.success} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {lastPast ? (
            <Section title={`Photos from ${lastPast.title}`}>
              <GalleryStrip eventId={lastPast.id} onOpen={() => router.push(`/gallery/${lastPast.id}`)} />
            </Section>
          ) : null}

          <View style={styles.links}>
            <Text style={styles.link} onPress={() => router.push('/info/guidelines')} accessibilityRole="link">
              Community guidelines
            </Text>
            <Text style={styles.link} onPress={() => router.push('/info/photography')} accessibilityRole="link">
              Photography notice
            </Text>
          </View>
        </Content>
      </ScrollView>
    </>
  );
}

function AdminTodo({ admin, onOpen }) {
  const next = admin.upcoming[0];
  const items = [
    admin.openReports
      ? { key: 'reports', symbol: 'flag.fill', text: `${admin.openReports} chat ${admin.openReports === 1 ? 'report' : 'reports'} to review`, path: '/admin/reports', urgent: true }
      : null,
    admin.newMembers.length
      ? { key: 'members', symbol: 'person.badge.plus', text: `${admin.newMembers.length} new ${admin.newMembers.length === 1 ? 'member' : 'members'} in the last 2 weeks`, path: '/admin/members' }
      : null,
    next
      ? {
          key: 'event',
          symbol: 'calendar',
          text: `${next.title}: ${next.confirmed}${next.capacity ? ` of ${next.capacity}` : ''} going${next.waitlisted ? `, ${next.waitlisted} waitlisted` : ''}`,
          path: `/admin/event/${next.id}`
        }
      : null
  ].filter(Boolean);
  return (
    <Section title="For admins" action={{ label: 'Dashboard', onPress: () => onOpen('/admin') }}>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
            onPress={() => onOpen(item.path)}
            accessibilityRole="button"
          >
            <Icon name={item.symbol} size={20} color={item.urgent ? colors.danger : colors.gold} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, styles.flex]}>{item.text}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

function Section({ title, action, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action ? (
          <Text style={styles.sectionAction} onPress={action.onPress} accessibilityRole="button">
            {action.label}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.xl, paddingBottom: 140 },
  flex: { flex: 1 },
  section: { gap: space.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { color: colors.gold, fontFamily: fonts.heading, fontSize: 24, flexShrink: 1 },
  sectionAction: { color: colors.gold, fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  cardTitle: { color: colors.gold, fontFamily: fonts.heading, fontSize: 24 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  pressed: { backgroundColor: colors.cardPressed },
  rowIcon: { width: 24, height: 24 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  chevron: { color: colors.textFaint, fontSize: 18 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  link: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' }
});

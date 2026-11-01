import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api } from '../../../src/lib/api';
import { loadPhotos } from '../../../src/lib/gallery';
import { eventDay, eventWhen, memberSince } from '../../../src/lib/format';
import { useGutter } from '../../../src/lib/layout';
import { useAuth } from '../../../src/context/AuthContext';
import { useChat } from '../../../src/context/ChatContext';
import { Avatar } from '../../../src/components/Avatar';
import { BackupImage } from '../../../src/components/BackupImage';
import { Chip } from '../../../src/components/Chip';
import { Icon } from '../../../src/components/Icon';
import { Placeholder, PressableScale, Rise } from '../../../src/components/Motion';
import { colors, fonts, radius, space, MAX_CONTENT_WIDTH } from '../../../src/theme';
import { NotificationToolbar } from '../../../src/components/NotificationBell';
import { coverPosition } from '../../../src/lib/cover';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

// "Tonight", "Tomorrow", "In 12 days"…
function countdown(startIso, endIso) {
  const start = new Date(startIso);
  const now = new Date();
  const end = endIso ? new Date(endIso) : new Date(start.getTime() + 6 * 3600 * 1000);
  if (now >= start && now <= end) return 'Happening now';
  const days = Math.round((new Date(start.toDateString()) - new Date(now.toDateString())) / 86400000);
  if (days <= 0) return start.getHours() >= 17 ? 'Tonight' : 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}

// The signed-in landing tab: a photo-led look at your next social, what's
// waiting in chats, what's coming up and the latest photos.
export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gutter = useGutter(space.lg);
  const { user } = useAuth();
  const { rooms } = useChat();
  const [upcoming, setUpcoming] = useState(null);
  const [featuredDetail, setFeaturedDetail] = useState(null);
  const [lastPast, setLastPast] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [up, past, overview] = await Promise.all([
      api.events('upcoming').catch(() => null),
      api.events('past').catch(() => null),
      user?.isAdmin ? api.admin.overview().catch(() => null) : null
    ]);
    const list = up?.events || [];
    setUpcoming(list);
    setAdmin(overview);
    const featured = list.find((e) => e.myRsvp === 'CONFIRMED' || e.myRsvp === 'WAITLISTED') || list[0];
    if (featured) api.event(featured.id).then(({ event }) => setFeaturedDetail(event)).catch(() => {});
    const latest = past?.events?.[0] || null;
    setLastPast(latest);
    if (latest) {
      api
        .gallery(latest.id)
        .then(({ gallery }) => loadPhotos(gallery, 1))
        .then((result) => setPhotos({ list: result.photos.slice(0, 3), total: result.total }))
        .catch(() => setPhotos({ list: [], total: 0 }));
    }
  }, [user?.isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mine = upcoming?.find((e) => e.myRsvp === 'CONFIRMED' || e.myRsvp === 'WAITLISTED');
  const featured = mine || upcoming?.[0];
  const detail = featuredDetail?.id === featured?.id ? featuredDetail : null;
  const later = (upcoming || []).filter((e) => e.id !== featured?.id);
  const unread = rooms.filter((r) => r.unread > 0 && !r.muted && !r.closed).slice(0, 3);
  const community = rooms.find((r) => r.kind === 'COMMUNITY');
  const firstName = user?.preferredName || user?.firstName || user?.name?.split(' ')[0];
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH) - space.lg * 2;
  let order = 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Home', headerLargeTitle: false, headerTitle: '' }} />
      <NotificationToolbar />
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
        <View style={[styles.content, gutter]}>
          <Rise index={order++}>
            <Text style={styles.hello}>{greeting()},</Text>
            <Text style={styles.name}>{firstName || 'Gent'}</Text>
            {user?.eventsAttended ? (
              <Text style={styles.stat}>
                {user.eventsAttended} {user.eventsAttended === 1 ? 'social' : 'socials'} with us
                {user.memberSince ? ` · member since ${memberSince(user.memberSince)}` : ''}
              </Text>
            ) : (
              <Text style={styles.stat}>Welcome to Manchester Gents.</Text>
            )}
          </Rise>

          {!upcoming ? (
            <View style={styles.skeleton}>
              <Placeholder style={{ height: 360, borderRadius: radius.lg }} />
              <Placeholder style={{ height: 22, width: '60%' }} />
              <Placeholder style={{ height: 160, borderRadius: radius.lg }} />
            </View>
          ) : featured ? (
            <Rise index={order++}>
              <FeaturedCard event={featured} detail={detail} going={Boolean(mine)} onPress={() => router.push(`/event/${featured.id}`)} />
            </Rise>
          ) : (
            <Rise index={order++} style={styles.emptyCard}>
              <Icon name="sparkles" size={28} color={colors.gold} />
              <Text style={styles.emptyTitle}>Next social coming soon</Text>
              <Text style={styles.muted}>We’ll send a notification as soon as it’s announced.</Text>
            </Rise>
          )}

          {admin ? (
            <Rise index={order++}>
              <AdminTodo admin={admin} onOpen={(path) => router.push(path, { withAnchor: true })} />
            </Rise>
          ) : null}

          {unread.length ? (
            <Rise index={order++}>
              <SectionHeader title="Waiting for you" action="All chats" onAction={() => router.push('/chats')} />
              <View style={styles.list}>
                {unread.map((room) => (
                  <PressableScale key={room.id} onPress={() => router.push(`/chat/${room.id}`)} style={styles.listRow} accessibilityRole="button" accessibilityLabel={`${room.title}, ${room.unread} unread`}>
                    {room.kind === 'DIRECT' ? (
                      <Avatar name={room.other?.name} uri={room.other?.photoUrl} size={40} />
                    ) : (
                      <View style={styles.roomIcon}>
                        <Icon name={room.kind === 'COMMUNITY' ? 'person.3.fill' : 'calendar'} size={18} color={colors.gold} />
                      </View>
                    )}
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{room.title}</Text>
                      <Text style={styles.muted} numberOfLines={1}>{room.lastBody || 'New messages'}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{room.unread > 99 ? '99+' : room.unread}</Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </Rise>
          ) : null}

          {later.length ? (
            <Rise index={order++}>
              <SectionHeader title="Coming up" action="All events" onAction={() => router.push('/events')} />
              <FlatList
                horizontal
                data={later}
                keyExtractor={(e) => e.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={232 + space.md}
                decelerationRate="fast"
                contentContainerStyle={{ gap: space.md }}
                style={styles.bleed}
                renderItem={({ item }) => <MiniEvent event={item} onPress={() => router.push(`/event/${item.id}`)} />}
              />
            </Rise>
          ) : null}

          {lastPast && photos?.list.length ? (
            <Rise index={order++}>
              <SectionHeader title="Latest photos" action={`All ${photos.total}`} onAction={() => router.push(`/gallery/${lastPast.id}`)} />
              <Text style={styles.sectionSub}>{lastPast.title}</Text>
              <Mosaic photos={photos.list} width={contentWidth} onPress={() => router.push(`/gallery/${lastPast.id}`)} />
            </Rise>
          ) : null}

          {community ? (
            <Rise index={order++}>
              <PressableScale onPress={() => router.push(`/chat/${community.id}`)} style={styles.community} accessibilityRole="button">
                <View style={styles.communityIcon}>
                  <Icon name="person.3.fill" size={22} color={colors.navy} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.communityTitle}>Community chat</Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {community.lastBody || 'Say hello to every member of Manchester Gents.'}
                  </Text>
                </View>
                <Icon name="chevron.right" size={16} color={colors.textFaint} />
              </PressableScale>
            </Rise>
          ) : null}

          <Rise index={order++} style={styles.links}>
            <Text style={styles.link} onPress={() => router.push('/info/guidelines')} accessibilityRole="link">
              Community guidelines
            </Text>
            <Text style={styles.link} onPress={() => router.push('/info/photography')} accessibilityRole="link">
              Photography notice
            </Text>
          </Rise>
        </View>
      </ScrollView>
    </>
  );
}

// The next social, photo-led, with a countdown and who's going.
function FeaturedCard({ event, detail, going, onPress }) {
  const when = eventWhen(event.startTime, event.endTime);
  const faces = detail?.attendees?.slice(0, 5) || [];
  const count = detail?.attendeeCount ?? event.attendeeCount ?? 0;
  const body = (
    <>
      <View style={styles.heroTop}>
        <Chip label={countdown(event.startTime, event.endTime)} tone="gold" symbol="clock" />
        {going ? <Chip label={event.myRsvp === 'WAITLISTED' ? 'Waitlist' : 'You’re going'} tone="success" symbol="checkmark.circle.fill" /> : null}
      </View>
      <View style={styles.heroBottom}>
        <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.heroMeta}>
          {when.date} · {when.time}
        </Text>
        {event.location ? <Text style={styles.heroMeta} numberOfLines={1}>{event.location}</Text> : null}
        <View style={styles.heroFooter}>
          {faces.length ? (
            <View style={styles.faces}>
              {faces.map((m, i) => (
                <View key={m.id} style={[styles.face, { marginLeft: i ? -12 : 0, zIndex: 10 - i }]}>
                  <Avatar name={m.name} uri={m.avatarUrl} size={30} />
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.heroGoing}>
            {count ? `${count} ${count === 1 ? 'gent' : 'gents'} going` : 'Be the first to RSVP'}
            {event.spotsLeft ? ` · ${event.spotsLeft} spots left` : event.spotsLeft === 0 ? ' · Fully booked' : ''}
          </Text>
        </View>
        <View style={styles.heroCta}>
          <Text style={styles.heroCtaText}>{going ? 'View event' : 'Reserve your spot'}</Text>
          <Icon name="chevron.right" size={14} color={colors.navy} />
        </View>
      </View>
    </>
  );
  return (
    <PressableScale onPress={onPress} style={styles.hero} accessibilityRole="button" accessibilityLabel={`${event.title}, ${when.date}`}>
      {event.coverImageUrl ? (
        <>
          <Image source={{ uri: event.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={coverPosition(event)} transition={300} />
          <View style={styles.heroShade} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.heroBrand]} />
      )}
      {body}
    </PressableScale>
  );
}

function MiniEvent({ event, onPress }) {
  const day = eventDay(event.startTime);
  return (
    <PressableScale onPress={onPress} style={styles.mini} accessibilityRole="button" accessibilityLabel={`${event.title}, ${day.weekday} ${day.day} ${day.month}`}>
      {event.coverImageUrl ? <Image source={{ uri: event.coverImageUrl }} style={styles.miniCover} contentFit="cover" contentPosition={coverPosition(event)} transition={200} /> : null}
      <View style={styles.miniBody}>
        <Text style={styles.miniDate}>
          {day.weekday} {day.day} {day.month}
        </Text>
        <Text style={styles.miniTitle} numberOfLines={2}>{event.title}</Text>
        {event.myRsvp === 'CONFIRMED' ? <Text style={styles.miniGoing}>You’re going</Text> : null}
      </View>
    </PressableScale>
  );
}

// One large photo with two small ones beside it.
function Mosaic({ photos, width, onPress }) {
  const gap = 4;
  const small = (width - gap * 2) / 3;
  const big = small * 2 + gap;
  const [first, ...rest] = photos;
  return (
    <PressableScale onPress={onPress} style={[styles.mosaic, { height: big }]} accessibilityRole="button" accessibilityLabel="Open the gallery">
      <BackupImage uri={first.medium} backupUri={first.backupMedium} style={{ width: big, height: big }} contentFit="cover" transition={250} />
      <View style={[styles.mosaicColumn, { gap }]}>
        {rest.slice(0, 2).map((p) => (
          <BackupImage key={p.id} uri={p.thumb} backupUri={p.backupThumb} style={{ width: small, height: small }} contentFit="cover" transition={250} />
        ))}
      </View>
    </PressableScale>
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
      : null,
    { key: 'announce', symbol: 'megaphone', text: 'Make an announcement', path: '/admin/announce' }
  ].filter(Boolean);
  return (
    <>
      <SectionHeader title="For admins" action="Dashboard" onAction={() => onOpen('/admin')} />
      <View style={styles.list}>
        {items.map((item) => (
          <PressableScale key={item.key} onPress={() => onOpen(item.path)} style={styles.listRow} accessibilityRole="button">
            <Icon name={item.symbol} size={20} color={item.urgent ? colors.danger : colors.gold} style={styles.rowIconSmall} />
            <Text style={[styles.rowTitle, styles.flex]}>{item.text}</Text>
            <Icon name="chevron.right" size={14} color={colors.textFaint} />
          </PressableScale>
        ))}
      </View>
    </>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Text style={styles.sectionAction} onPress={onAction} accessibilityRole="button">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { gap: space.xl, paddingTop: space.sm, paddingBottom: 140, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  flex: { flex: 1 },
  hello: { color: colors.textMuted, fontSize: 17 },
  name: { color: colors.gold, fontFamily: fonts.heading, fontSize: 44, lineHeight: 48 },
  stat: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  skeleton: { gap: space.lg },
  hero: { height: 380, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'space-between', padding: space.lg, backgroundColor: colors.steel },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: 'linear-gradient(180deg, rgba(20, 29, 41, 0.15) 0%, rgba(20, 29, 41, 0.35) 40%, rgba(20, 29, 41, 0.92) 100%)'
  },
  heroBrand: { backgroundImage: `linear-gradient(150deg, ${colors.slate} 0%, ${colors.steel} 45%, ${colors.navyDeep} 100%)` },
  heroTop: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  heroBottom: { gap: 4 },
  heroTitle: { color: colors.gold, fontFamily: fonts.heading, fontSize: 38, lineHeight: 42 },
  heroMeta: { color: colors.text, fontSize: 15 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  faces: { flexDirection: 'row' },
  face: { borderRadius: 17, borderWidth: 2, borderColor: colors.navy },
  heroGoing: { color: colors.textMuted, fontSize: 14, flexShrink: 1 },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    marginTop: space.md
  },
  heroCtaText: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.xl, gap: space.sm, alignItems: 'center' },
  emptyTitle: { color: colors.gold, fontFamily: fonts.heading, fontSize: 26, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.md },
  sectionTitle: { color: colors.gold, fontFamily: fonts.heading, fontSize: 26, flexShrink: 1 },
  sectionAction: { color: colors.gold, fontSize: 15, fontWeight: '600' },
  sectionSub: { color: colors.textMuted, fontSize: 14, marginTop: -space.sm, marginBottom: space.md },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
  roomIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 212, 96, 0.14)', alignItems: 'center', justifyContent: 'center' },
  rowIconSmall: { width: 24, height: 24 },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  bleed: { overflow: 'visible' },
  mini: { width: 232, backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  miniCover: { height: 120 },
  miniBody: { padding: space.md, gap: 4 },
  miniDate: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  miniTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  miniGoing: { color: colors.success, fontSize: 13, fontWeight: '600' },
  mosaic: { flexDirection: 'row', gap: 4, borderRadius: radius.lg, overflow: 'hidden' },
  mosaicColumn: { flex: 1 },
  community: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg },
  communityIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  communityTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  link: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' }
});

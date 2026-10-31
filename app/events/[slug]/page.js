import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EventThemeSection from '@/components/EventThemeSection';
import EventSignupButton from '@/components/EventSignupButton';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { getPhotoNoticeConfig } from '@/lib/photoNoticeConfig';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import ClientAdminControls from './client-admin-controls';
import { getGalleryHighlights } from '@/lib/galleryHighlights';
import styles from './page.module.css';

async function getEvent(slug) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              avatarUrl: true,
              instagramHandle: true,
              firstName: true,
              lastName: true,
              preferredName: true,
              shareFirstName: true,
              role: true,
              eventsSignedUp: {
                select: {
                  status: true,
                  event: {
                    select: { startTime: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}

function getGuestDisplayName(user) {
  const preferred = user.preferredName?.trim();
  const first = user.firstName?.trim();
  const handle = user.instagramHandle?.trim();
  if (user.shareFirstName === false) {
    return preferred || (handle ? `@${handle}` : 'Member');
  }
  return preferred || first || (handle ? `@${handle}` : 'Member');
}

export async function generateMetadata({ params }) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { title: true, description: true }
  });
  if (!event) {
    return { title: 'Event not found | Manchester Gents' };
  }
  const description =
    event.description || 'Relaxed socials for suited gents at The Lodge in Manchester.';
  return {
    title: `${event.title} | Manchester Gents`,
    description,
    openGraph: {
      title: `${event.title} | Manchester Gents`,
      description,
      images: ['/opengraph-image']
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} | Manchester Gents`,
      description,
      images: ['/opengraph-image']
    }
  };
}

export default async function EventDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  const event = await getEvent(params.slug);

  if (!event || !event.published) {
    notFound();
  }

  const photoNoticeConfig = await getPhotoNoticeConfig();

  const attendeeConsentRecord = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          consentUpdatedAt: true,
          termsConsentCulture: true,
          termsSafeSpace: true,
          termsNoHate: true,
          termsPrivacy: true,
          termsGuidelines: true,
          generalPhotoConsent: true,
          groupFaceConsent: true,
          otherFaceConsent: true,
          taggingConsent: true
        }
      })
    : null;

  const existingSignup = session
    ? event.attendees.find((signup) => signup.userId === session.user.id)
    : null;

  const schedule = event.startTime
    ? format(new Date(event.startTime), 'EEEE, MMMM d') +
      ' · ' +
      format(new Date(event.startTime), 'h:mmaaa')
    : 'Date to be confirmed';

  const attendeeConsent = attendeeConsentRecord
    ? {
        ...attendeeConsentRecord,
        consentUpdatedAt: attendeeConsentRecord.consentUpdatedAt
          ? attendeeConsentRecord.consentUpdatedAt.toISOString()
          : null
      }
    : null;

  const palette = {
    primaryColor: event.primaryColor,
    accentColor: event.accentColor,
    backgroundColor: event.backgroundColor,
    textColor: event.textColor
  };
  const sortedAttendees = event.attendees
    .map((signup) => {
      const user = signup.user;
      const displayName = getGuestDisplayName(user);
      const confirmedAttendances = (user.eventsSignedUp || []).filter(
        (record) => record.status === 'CONFIRMED'
      );
      const attendanceCount = confirmedAttendances.length;
      const latestAttendance = confirmedAttendances
        .map((record) => record.event?.startTime)
        .filter(Boolean)
        .map((date) => new Date(date).getTime())
        .sort((a, b) => b - a)[0] || null;
      const normalisedHandle = user.instagramHandle || '';
      const rawSortName = displayName.replace(/^@/, '').trim();
      const sortName = (rawSortName || normalisedHandle).toLowerCase();
      return {
        signup,
        displayName,
        handle: normalisedHandle,
        isAdmin: user.role === 'ADMIN',
        attendanceCount,
        latestAttendance,
        sortName
      };
    })
    .sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) {
        return -1;
      }
      if (!a.isAdmin && b.isAdmin) {
        return 1;
      }
      if (b.attendanceCount !== a.attendanceCount) {
        return b.attendanceCount - a.attendanceCount;
      }
      if (a.latestAttendance && b.latestAttendance) {
        if (b.latestAttendance !== a.latestAttendance) {
          return b.latestAttendance - a.latestAttendance;
        }
      } else if (a.latestAttendance) {
        return -1;
      } else if (b.latestAttendance) {
        return 1;
      }
      return a.sortName.localeCompare(b.sortName);
    });
  const attendeeCount = event.attendees.length;
  const attendeeLabel = attendeeCount === 1 ? '1 attendee' : `${attendeeCount} attendees`;
  const eventHasStarted = event.startTime ? new Date(event.startTime) <= new Date() : false;
  const signupDeadlinePassed = event.signupDeadline
    ? new Date(event.signupDeadline) < new Date()
    : false;
  const isOpenForRsvp = !eventHasStarted && !signupDeadlinePassed;
  const isGoing = existingSignup?.status === 'CONFIRMED';
  const canChat = Boolean(session?.user) && event.chatEnabled && (isGoing || session.user.role === 'ADMIN');
  // Gallery photos are for signed-in members only.
  const highlights = session?.user && eventHasStarted ? await getGalleryHighlights(event, 6) : [];

  return (
    <div className={styles.page}>
      <NavBar />
      <section className={styles.cover} aria-labelledby="event-title">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt="" className={styles.coverImage} fetchPriority="high" />
        ) : (
          <div className={styles.coverCloth} aria-hidden="true" />
        )}
        <div className={styles.coverText}>
          <h1 id="event-title" className="heading-font">{event.title}</h1>
          {event.subtitle && <p className={styles.coverSubtitle}>{event.subtitle}</p>}
          <p className={styles.coverSchedule}>
            {schedule}
            {event.location ? <span>{event.location}</span> : null}
          </p>
        </div>
      </section>
      <main className={styles.eventMain}>
        <EventThemeSection palette={palette}>
          <div className={styles.eventGrid}>
            <div className={styles.eventInfo}>
              {event.description && <p className={styles.eventBody}>{event.description}</p>}
              <ClientAdminControls isAdmin={session?.user?.role === 'ADMIN'} slug={event.slug} />
              <EventSignupButton
                eventId={event.id}
                deadline={event.signupDeadline}
                existingSignup={existingSignup}
                consentSnapshot={attendeeConsent}
                photoNoticeEnabled={photoNoticeConfig.enabled && isOpenForRsvp}
              />
              {canChat && !eventHasStarted ? (
                <Link href={`/chat?event=${encodeURIComponent(event.id)}`} className={styles.chatLink}>
                  Open the event chat
                </Link>
              ) : null}
            </div>
            <aside className={`${styles.eventSidebar} glass-panel`}>
              {eventHasStarted && (
                <div className={styles.sidebarSection}>
                  <span className="heading-font">Event gallery</span>
                  {highlights.length ? (
                    <ul className={styles.galleryStrip}>
                      {highlights.map((photo) => (
                        <li key={photo.id}>
                          <Link href={`/events/${event.slug}/photos`} aria-label="Open the photo gallery">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.src} alt="" loading="lazy" decoding="async" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.sidebarCopy}>
                      Relive the night and download your favourite shots from the club photographer.
                    </p>
                  )}
                  {session?.user ? (
                    <Link href={`/events/${event.slug}/photos`} className={styles.galleryLink}>
                      View photo gallery
                    </Link>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/events/${event.slug}/photos`)}`}
                      className={styles.galleryLink}
                    >
                      Sign in to view photo gallery
                    </Link>
                  )}
                </div>
              )}
              <div className={styles.sidebarSection}>
                <div className={styles.guestListHeader}>
                  <span className="heading-font">Guest list</span>
                  <span className={styles.guestCount}>{attendeeLabel}</span>
                </div>
                {!photoNoticeConfig.enabled && (
                  <Link href={`/events/${event.slug}/consent`} className={styles.consentLink}>
                    Review other attendees&apos; photo consent
                  </Link>
                )}
                <ul className={styles.guestList}>
                  {sortedAttendees.map(({ signup, displayName, handle }) => {
                    const avatarUrl = signup.user.avatarUrl;
                    const showHandle = handle && !handle.startsWith('noinsta_');
                    const handleLabel = showHandle ? `@${handle}` : '';
                    const showName = Boolean(session?.user);
                    const isFallbackName =
                      !displayName || displayName === 'Member' || displayName.startsWith('@');
                    const shouldCombine =
                      showName &&
                      !isFallbackName &&
                      handleLabel &&
                      displayName !== handleLabel;
                    const listLabel = (() => {
                      if (showName && !isFallbackName) {
                        return shouldCombine ? `${displayName} · ${handleLabel}` : displayName;
                      }
                      return handleLabel || displayName || 'Member';
                    })();
                    const avatar = avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className={styles.guestAvatar} loading="lazy" />
                    ) : (
                      <span className={styles.guestAvatar} aria-hidden="true">
                        {(listLabel.replace(/^@/, '')[0] || 'M').toUpperCase()}
                      </span>
                    );
                    return (
                      <li key={signup.id}>
                        {session?.user ? (
                          <Link href={`/members/${signup.userId}`} className={styles.guest}>
                            {avatar}
                            <span>{listLabel}</span>
                          </Link>
                        ) : (
                          <span className={styles.guest}>
                            {avatar}
                            <span>{listLabel}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {event.attendees.length === 0 && <li>Be the first to join.</li>}
                </ul>
              </div>
            </aside>
          </div>
        </EventThemeSection>
      </main>
      <Footer />
    </div>
  );
}

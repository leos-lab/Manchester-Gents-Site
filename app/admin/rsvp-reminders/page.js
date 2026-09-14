import Link from 'next/link';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { getBaseUrl } from '@/lib/appUrl';
import AdminRsvpRemindersTable from '@/components/AdminRsvpRemindersTable';
import styles from './page.module.css';

function getFriendlyFirstName(member) {
  const preferred = member.preferredName?.trim();
  if (preferred) return preferred;
  const first = member.firstName?.trim();
  if (first) return first;
  return member.instagramHandle?.trim() || 'Member';
}

async function getNextEvent() {
  const now = new Date();
  return prisma.event.findFirst({
    where: {
      startTime: { gte: now },
      published: true
    },
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      startTime: true
    }
  });
}

async function getMembersMissingRsvp(eventId) {
  return prisma.user.findMany({
    where: {
      isPlaceholder: false,
      role: 'MEMBER',
      eventsSignedUp: {
        none: {
          eventId,
          status: { in: ['CONFIRMED', 'WAITLISTED'] }
        }
      }
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      instagramHandle: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      shareFirstName: true,
      createdAt: true,
      _count: {
        select: {
          eventsSignedUp: true
        }
      }
    }
  });
}

export const metadata = {
  title: 'RSVP reminders | Manchester Gents Admin'
};

export default async function AdminRsvpRemindersPage() {
  const event = await getNextEvent();

  if (!event) {
    return (
      <main className={styles.main}>
        <header className={styles.header}>
          <Link href="/admin" className={styles.backLink}>
            ← Back to admin
          </Link>
          <h1>RSVP reminders</h1>
          <p>Review members who haven’t RSVPed for the next event, then send them an Instagram DM.</p>
        </header>

        <section className={styles.notice}>
          <h2>No upcoming event found</h2>
          <p>Create/publish an event first, then come back here to send RSVPs.</p>
          <div className={styles.noticeLinks}>
            <Link href="/admin/events" className={styles.noticeLink}>
              View events →
            </Link>
            <Link href="/admin/create-event" className={styles.noticeLink}>
              Create event →
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const members = await getMembersMissingRsvp(event.id);
  const rsvpLink = `${getBaseUrl()}/events/${event.slug}`;
  const formattedDate = format(new Date(event.startTime), 'EEE d MMM yyyy • h:mmaaa');

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to admin
        </Link>
        <h1>RSVP reminders</h1>
        <p>Review members who haven’t RSVPed for the next event, then send them an Instagram DM.</p>
      </header>

      <section className={styles.eventSection}>
        <div className={`${styles.eventCard} glass-panel`}>
          <div className={styles.eventTop}>
            <div>
              <p className={styles.eventEyebrow}>Next event</p>
              <h2>{event.title}</h2>
              <p className={styles.eventMeta}>{formattedDate}</p>
            </div>
            <a href={rsvpLink} className={styles.rsvpLink} target="_blank" rel="noreferrer">
              Open RSVP link →
            </a>
          </div>
          <p className={styles.eventHint}>
            Reminders use Instagram handles on file and send a short RSVP link to this event.
          </p>
        </div>

        <AdminRsvpRemindersTable
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          eventStartTimeIso={event.startTime.toISOString()}
          rsvpLink={rsvpLink}
          members={members.map((member) => ({
            id: member.id,
            instagramHandle: member.instagramHandle || '',
            displayName: getFriendlyFirstName(member),
            createdAtIso: member.createdAt.toISOString(),
            eventsSignedUpCount: member._count?.eventsSignedUp ?? 0
          }))}
        />
      </section>
    </main>
  );
}

import Link from 'next/link';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import styles from './page.module.css';

async function getEvents() {
  return prisma.event.findMany({
    orderBy: { startTime: 'asc' }
  });
}

export const metadata = {
  title: 'Events | Manchester Gents Admin'
};

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to admin
        </Link>
        <h1>Events</h1>
        <p>Manage the calendar and jump into event workspaces for attendee updates.</p>
        <Link href="/admin/create-event" className={styles.createLink}>
          Create a new event
        </Link>
      </header>

      <section className={styles.section}>
        <span className="heading-font">Existing events</span>
        <div className={styles.list}>
          {events.map((event) => {
            const startTime = event.startTime ? new Date(event.startTime) : null;
            const schedule = startTime
              ? format(startTime, 'd MMM yyyy • h:mmaaa')
              : 'Schedule TBA';
            return (
              <article key={event.id} className={`${styles.eventCard} glass-panel`}>
                <div className={styles.eventTop}>
                  <div>
                    <h3>{event.title}</h3>
                    <p className={styles.eventSlug}>/{event.slug}</p>
                  </div>
                  <span className={styles.eventStatus}>
                    {event.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className={styles.eventMeta}>
                  {schedule}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
                <p className={styles.eventDescription}>
                  {event.description || 'No description provided yet.'}
                </p>
                <div className={styles.eventActions}>
                  <Link href={`/events/${event.slug}/admin`} className={styles.manageLink}>
                    Manage event →
                  </Link>
                </div>
              </article>
            );
          })}

          {events.length === 0 && (
            <div className={`${styles.emptyCard} glass-panel`}>
              <h3>No events created yet</h3>
              <p>Use “Create a new event” above to kick things off.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}


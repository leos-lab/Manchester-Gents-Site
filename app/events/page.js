import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard';
import prisma from '@/lib/prisma';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getEventsByGrouping() {
  try {
    const now = new Date();
    const upcoming = await prisma.event.findMany({
      where: {
        published: true,
        startTime: { gte: now }
      },
      orderBy: { startTime: 'asc' }
    });
    const past = await prisma.event.findMany({
      where: {
        published: true,
        startTime: { lt: now }
      },
      orderBy: { startTime: 'desc' }
    });
    return { upcoming, past };
  } catch (error) {
    console.error('Failed to load events for events page, rendering fallback state.', error);
    return { upcoming: [], past: [] };
  }
}

export const metadata = {
  title: 'Events | Manchester Gents'
};

export default async function EventsPage() {
  const { upcoming, past } = await getEventsByGrouping();

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.eventsMain}>
        <header className={`${styles.eventsHero} glass-panel`}>
          <span className={styles.sectionEyebrow}>Our socials</span>
          <h1>Relaxed evenings at The Lodge</h1>
          <p>
            Explore upcoming meetups for suited gents in Manchester. Each social is informal — just
            drinks, conversation, and the option to keep the night going afterwards.
          </p>
        </header>
        <section className={styles.eventsGroup}>
          <header className={styles.groupHeader}>
            <span className={styles.sectionEyebrow}>Future experiences</span>
            <h2>Upcoming events</h2>
            <p>
              Secure your RSVP while spaces remain. We keep the guest list intentionally small so
              everyone gets time to talk.
            </p>
          </header>
          <div className={`${styles.eventsList} glass-panel`}>
            {upcoming.length === 0 ? (
              <div className={`${styles.noEvents} glass-panel`}>
                <h3>No upcoming socials just yet</h3>
                <p>Check back soon or follow us on Instagram for the next Lodge meetup.</p>
              </div>
            ) : (
              upcoming.map((event, index) => (
                <article
                  key={event.id}
                  className={index === 0 ? styles.featuredCardWrapper : styles.eventCardWrapper}
                >
                  <EventCard event={event} variant={index === 0 ? 'hero' : 'condensed'} />
                </article>
              ))
            )}
          </div>
        </section>

        <section className={styles.eventsGroup}>
          <header className={styles.groupHeader}>
            <span className={styles.sectionEyebrow}>Previous gatherings</span>
            <h2>Past events</h2>
            <p>
              A look at where we have been lately. Tap any gathering to revisit the details and keep
              an eye on what resonates with the community.
            </p>
          </header>
          <div className={`${styles.eventsList} glass-panel`}>
            {past.length === 0 ? (
              <div className={`${styles.noEvents} glass-panel`}>
                <h3>No socials announced yet</h3>
                <p>Check back soon or follow us on Instagram for the next Lodge meetup.</p>
              </div>
            ) : (
              past.map((event) => (
                <article key={event.id} className={styles.eventCardWrapper}>
                  <EventCard event={event} variant="condensed" />
                </article>
              ))
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

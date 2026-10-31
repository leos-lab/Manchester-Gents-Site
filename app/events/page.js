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
  const [next, ...later] = upcoming;

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.v2Main}>
        <header className={styles.v2Header}>
          <h1 className="heading-font">Events</h1>
          <p>
            Relaxed evenings at The Lodge. Drinks, conversation, and the option to keep the night going
            afterwards. We keep each guest list small so everyone gets time to talk.
          </p>
        </header>

        <section aria-labelledby="upcoming" className={styles.v2Section}>
          <h2 id="upcoming" className={styles.v2Title}>Coming up</h2>
          {next ? (
            <>
              <EventCard event={next} variant="feature" />
              {later.length ? (
                <div className={styles.v2Grid}>
                  {later.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.v2Empty}>
              No dates are open yet. Members hear first when the next social is announced.
            </p>
          )}
        </section>

        {past.length ? (
          <section aria-labelledby="past" className={styles.v2Section}>
            <h2 id="past" className={styles.v2Title}>Past socials</h2>
            <div className={`${styles.v2Grid} ${styles.v2GridPast}`}>
              {past.map((event) => (
                <EventCard key={event.id} event={event} variant="condensed" />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

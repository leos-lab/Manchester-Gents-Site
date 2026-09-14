import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import HeroBanner from '@/components/HeroBanner';
import EventCard from '@/components/EventCard';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHomeData() {
  try {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        published: true,
        startTime: {
          gte: new Date(now.getTime() - 1000 * 60 * 60 * 24)
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 5
    });
    return {
      nextEvent: events[0] || null,
      otherEvents: events.slice(1)
    };
  } catch (error) {
    console.error('Failed to load events for home page, rendering fallback state.', error);
    return { nextEvent: null, otherEvents: [] };
  }
}

export default async function HomePage() {
  const { nextEvent, otherEvents } = await getHomeData();

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.homeMain}>
        <section className={clsx(styles.heroSection, styles.homeSection)}>
          <HeroBanner event={nextEvent} />
        </section>
        <section className={clsx(styles.eventsSection, styles.homeSection, 'glass-panel')}>
          <div className={clsx(styles.sectionHeader, styles.eventsHeader)}>
            <span className={styles.sectionEyebrow}>The calendar</span>
            <h2>Upcoming socials</h2>
            <p>
              Reserve your spot for our easy-going evenings at The Lodge — suited gents, great
              drinks, and unhurried conversation.
            </p>
            <Link href="/events" className={styles.eventsLink}>
              View all events →
            </Link>
          </div>
          <div className={styles.eventsGrid}>
            {otherEvents.length === 0 && (
              <div className={`${styles.emptyState} glass-panel`}>
                <h3>No other events are open yet.</h3>
                <p>Keep an eye on your inbox and Instagram for the next drop.</p>
              </div>
            )}
            {otherEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
        <section className={clsx(styles.communitySection, styles.homeSection, 'glass-panel')}>
          <div className={styles.communityGrid}>
            <div>
              <span className={styles.sectionEyebrow}>Inside Manchester Gents</span>
              <h2>Inside the club</h2>
              <p>
                We keep it simple: meet at The Lodge in Manchester, dress sharp, grab a drink, and
                chat with gents who appreciate great tailoring as much as you do.
              </p>
            </div>
            <ul className={styles.communityList}>
              <li className={styles.communityListItem}>
                <span className="heading-font">Unscripted evenings</span>
                <p className={styles.communityListText}>
                  No presentations or agenda — just relaxed conversation among well-dressed
                  company.
                </p>
              </li>
              <li className={styles.communityListItem}>
                <span className="heading-font">Familiar faces</span>
                <p className={styles.communityListText}>
                  Connect with Instagram friends and new gents who share your taste in classic
                  style.
                </p>
              </li>
              <li className={styles.communityListItem}>
                <span className="heading-font">Optional nightcaps</span>
                <p className={styles.communityListText}>
                  Stay for the full two hours or head downstairs to The Eagle afterwards — entirely
                  up to you.
                </p>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

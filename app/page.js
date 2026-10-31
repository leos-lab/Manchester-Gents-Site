import Link from 'next/link';
import { getServerSession } from 'next-auth';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard';
import HomeHero from '@/components/HomeHero';
import PhotoMarquee from '@/components/PhotoMarquee';
import { getHomeContent } from '@/lib/homeContent';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getGalleryHighlights } from '@/lib/galleryHighlights';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHomeData(userId) {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24);
    const [upcoming, covers, lastEvent, myRsvps] = await Promise.all([
      prisma.event.findMany({
        where: { published: true, startTime: { gte: dayAgo } },
        orderBy: { startTime: 'asc' },
        take: 4
      }),
      prisma.event.findMany({
        where: { published: true, coverImageUrl: { not: null } },
        orderBy: { startTime: 'desc' },
        take: 3,
        select: { coverImageUrl: true }
      }),
      prisma.event.findFirst({
        where: { published: true, startTime: { lt: now } },
        orderBy: { startTime: 'desc' },
        select: { id: true, slug: true, title: true, startTime: true, galleryUrl: true, featuredPhotoIds: true }
      }),
      userId
        ? prisma.eventSignup.findMany({ where: { userId, status: 'CONFIRMED' }, select: { eventId: true } })
        : []
    ]);
    return {
      nextEvent: upcoming[0] || null,
      moreEvents: upcoming.slice(1),
      covers: covers.map((c) => c.coverImageUrl),
      lastEvent,
      going: new Set(myRsvps.map((r) => r.eventId))
    };
  } catch (error) {
    console.error('Failed to load home page data, rendering fallback state.', error);
    return { nextEvent: null, moreEvents: [], covers: [], lastEvent: null, going: new Set() };
  }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);
  const [{ nextEvent, moreEvents, covers, lastEvent, going }, home] = await Promise.all([
    getHomeData(session?.user?.id),
    getHomeContent()
  ]);
  // Admins choose the hero photo; until then, the latest event cover.
  const heroPhoto = home.heroPhoto || (covers[0] ? { src: covers[0] } : null);
  // Gallery photos are for members only.
  const highlights = signedIn && lastEvent ? await getGalleryHighlights(lastEvent, 8) : [];

  return (
    <div className={styles.page}>
      <NavBar />
      <main>
        <HomeHero photo={heroPhoto} caption={home.heroPhoto ? home.heroCaption : null}>
          <h1 className={`heading-font ${styles.wordmark}`}>{home.headline}</h1>
          {home.lede ? <p className={styles.lede}>{home.lede}</p> : null}
          <div className={styles.actions}>
            {nextEvent ? (
              <Link href={`/events/${nextEvent.slug}`} className={styles.primary}>
                {going.has(nextEvent.id) ? 'You’re going: see details' : 'Reserve a spot'}
              </Link>
            ) : null}
            {!signedIn ? (
              <Link href="/register" className={styles.secondary}>
                Become a member
              </Link>
            ) : (
              <Link href="/chat" className={styles.secondary}>
                Open your chats
              </Link>
            )}
          </div>
        </HomeHero>
        {/* Photos from past socials for visitors (chosen in Admin → Home page). */}
        {!signedIn ? <PhotoMarquee photos={home.showcase} /> : null}

        <div className={styles.inner}>
          <section className={styles.section} aria-labelledby="next-social">
            <h2 id="next-social" className={styles.sectionTitle}>
              {nextEvent ? 'The next social' : 'The next social is on its way'}
            </h2>
            {nextEvent ? (
              <div className={styles.nextSocial}>
                <EventCard event={nextEvent} variant="feature" status={going.has(nextEvent.id) ? 'You’re going' : null} />
                <Link href={`/events/${nextEvent.slug}`} className={`${styles.primary} ${styles.nextAction}`}>
                  {going.has(nextEvent.id) ? 'See details and chat' : 'Reserve a spot'}
                </Link>
              </div>
            ) : (
              <p className={styles.empty}>
                Dates are announced to members first. {signedIn ? 'We’ll let you know.' : 'Join to hear when the next one opens.'}
              </p>
            )}
          </section>

          {moreEvents.length ? (
            <section className={styles.section} aria-labelledby="more-dates">
              <div className={styles.sectionHead}>
                <h2 id="more-dates" className={styles.sectionTitle}>More dates</h2>
                <Link href="/events" className={styles.textLink}>All events</Link>
              </div>
              <div className={styles.grid}>
                {moreEvents.map((event) => (
                  <EventCard key={event.id} event={event} status={going.has(event.id) ? 'You’re going' : null} />
                ))}
              </div>
            </section>
          ) : null}

          {highlights.length >= 5 ? (
            <section className={styles.section} aria-labelledby="last-social">
              <div className={styles.sectionHead}>
                <h2 id="last-social" className={styles.sectionTitle}>From {lastEvent.title}</h2>
                <Link href={`/events/${lastEvent.slug}/photos`} className={styles.textLink}>See every photo</Link>
              </div>
              <ul className={styles.mosaic}>
                {highlights.slice(0, highlights.length >= 9 ? 9 : 5).map((photo, i) => (
                  <li key={photo.id} className={i === 0 ? styles.mosaicLead : undefined}>
                    <Link href={`/events/${lastEvent.slug}/photos`} aria-label={`Open the ${lastEvent.title} gallery`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        srcSet={photo.srcSet}
                        sizes={i === 0 ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 25vw, 50vw'}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={`${styles.section} ${styles.evening}`} aria-labelledby="the-evening">
            <div className={styles.eveningPhoto}>
              {covers[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={covers[0]} alt="" loading="lazy" decoding="async" />
              ) : null}
            </div>
            <div className={styles.eveningText}>
              <h2 id="the-evening" className={styles.sectionTitle}>How an evening goes</h2>
              <p>
                We meet at The Lodge in Manchester. Dress sharp, grab a drink, and talk with gents who care
                about good tailoring as much as you do.
              </p>
              <dl className={styles.points}>
                <div>
                  <dt className="heading-font">Unscripted</dt>
                  <dd>No presentations and no agenda, just relaxed conversation in well-dressed company.</dd>
                </div>
                <div>
                  <dt className="heading-font">Familiar faces</dt>
                  <dd>Meet the people you know from Instagram, and new gents who share your taste.</dd>
                </div>
                <div>
                  <dt className="heading-font">Optional nightcaps</dt>
                  <dd>Stay for the full two hours, or carry on downstairs at The Eagle afterwards.</dd>
                </div>
              </dl>
              {!signedIn ? (
                <Link href="/register" className={styles.primary}>
                  Become a member
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

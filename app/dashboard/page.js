import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

async function getDashboardData(userId) {
  const [signups, recommended] = await Promise.all([
    prisma.eventSignup.findMany({
      where: { userId },
      include: {
        event: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.event.findMany({
      where: {
        published: true,
        attendees: {
          none: {
            userId
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 4
    })
  ]);

  return { signups, recommended };
}

export const metadata = {
  title: 'Dashboard | Manchester Gents'
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent('/dashboard')}`);
  }

  const { signups, recommended } = await getDashboardData(session.user.id);

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.dashboardMain}>
        <header className={styles.dashboardHeader}>
          <h1>
            Welcome back,
            {' '}
            {session.user.name || `@${session.user.instagramHandle}`}
          </h1>
          <p>See the Lodge socials you’ve RSVP’d for and claim your place at the next relaxed meetup.</p>
          <p className={styles.profileLink}>
            Need to review your consents? <Link href="/profile">Visit your profile</Link>.
          </p>
        </header>
        <section className={styles.dashboardSection}>
          <span className="heading-font">Your reservations</span>
          <div className={styles.dashboardGrid}>
            {signups.length === 0 ? (
              <div className={`${styles.dashboardEmpty} glass-panel`}>
                <h3>No events booked yet</h3>
                <p>Explore the calendar and reserve your place.</p>
              </div>
            ) : (
              signups.map((signup) => (
                <EventCard key={signup.id} event={signup.event} />
              ))
            )}
          </div>
        </section>
        <section className={styles.dashboardSection}>
          <span className="heading-font">Recently announced</span>
          <div className={styles.dashboardGrid}>
            {recommended.length === 0 ? (
              <div className={`${styles.dashboardEmpty} glass-panel`}>
                <h3>You’re caught up</h3>
                <p>Come back soon to catch fresh drops.</p>
              </div>
            ) : (
              recommended.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

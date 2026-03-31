import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EventAdminWorkspace from '@/components/EventAdminWorkspace';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

async function getEventWithRelations(slug) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              instagramHandle: true,
              firstName: true,
              lastName: true,
              preferredName: true,
              shareFirstName: true,
              isPlaceholder: true,
              eventsSignedUp: {
                where: { status: 'CONFIRMED' },
                select: {
                  status: true,
                  event: {
                    select: {
                      id: true,
                      slug: true,
                      title: true,
                      startTime: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });
}

async function getSelectableUsers() {
  return prisma.user.findMany({
    orderBy: [{ isPlaceholder: 'asc' }, { instagramHandle: 'asc' }],
    select: {
      id: true,
      instagramHandle: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      shareFirstName: true,
      isPlaceholder: true
    }
  });
}

export default async function EventAdminPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect(`/login?redirect=${encodeURIComponent(`/events/${params.slug}/admin`)}`);
  }

  const [event, users] = await Promise.all([
    getEventWithRelations(params.slug),
    getSelectableUsers()
  ]);

  if (!event) {
    notFound();
  }

  const attendees = event.attendees.map((attendee) => ({
    id: attendee.id,
    userId: attendee.user.id,
    user: attendee.user
  }));

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <Link href={`/events/${event.slug}`} className={styles.backLink}>
              ← Back to event
            </Link>
            <h1>Manage “{event.title}”</h1>
          </div>
          <p>Adjust event details and control the guest list from this control room.</p>
        </header>
        <EventAdminWorkspace
          event={event}
          users={users}
          attendees={attendees}
          eventAttendees={event.attendees}
          isAdmin={session.user.role === 'ADMIN'}
        />
      </main>
      <Footer />
    </div>
  );
}

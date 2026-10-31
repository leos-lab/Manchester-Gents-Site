import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications | Manchester Gents' };

// App screens a notification opens, and their website pages.
function webHref(path) {
  if (!path) return null;
  const [, kind, id] = path.split('/');
  if (kind === 'event') return null; // resolved to the event's slug below
  if (kind === 'chat') return `/chat?room=${encodeURIComponent(id)}`;
  if (kind === 'admin') {
    if (id === 'reports') return '/admin/chat-reports';
    if (id === 'event' || id === 'member') return '/admin';
    return '/admin';
  }
  return null;
}

// The notification inbox (as in the app). Opening it marks everything read.
export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?redirect=/notifications');
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 60
  });
  const eventIds = notifications.map((n) => n.path?.match(/^\/event\/(.+)$/)?.[1]).filter(Boolean);
  const events = eventIds.length
    ? await prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, slug: true } })
    : [];
  const slugs = Object.fromEntries(events.map((e) => [e.id, e.slug]));
  await prisma.notification.updateMany({ where: { userId: session.user.id, readAt: null }, data: { readAt: new Date() } });

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.main}>
        <h1 className="heading-font">Notifications</h1>
        {notifications.length ? (
          <ul className={styles.list}>
            {notifications.map((n) => {
              const eventId = n.path?.match(/^\/event\/(.+)$/)?.[1];
              const href = eventId && slugs[eventId] ? `/events/${slugs[eventId]}` : webHref(n.path);
              const body = (
                <>
                  <span className={styles.top}>
                    <strong className={n.readAt ? undefined : styles.unread}>{n.title}</strong>
                    <time dateTime={n.createdAt.toISOString()}>
                      {n.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </time>
                  </span>
                  <span className={styles.body}>{n.body}</span>
                </>
              );
              return (
                <li key={n.id} className={n.readAt ? undefined : styles.new}>
                  {href ? <Link href={href}>{body}</Link> : <div>{body}</div>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.empty}>Nothing yet. Announcements, reminders and new events will appear here.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}

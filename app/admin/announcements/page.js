import Link from 'next/link';
import prisma from '@/lib/prisma';
import AdminAnnouncements from '@/components/admin/AdminAnnouncements';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Announcements | Manchester Gents Admin' };

export default async function AdminAnnouncementsPage() {
  // Events from the last two weeks onwards, soonest first.
  const events = await prisma.event.findMany({
    where: { startTime: { gte: new Date(Date.now() - 14 * 24 * 3600 * 1000) } },
    orderBy: { startTime: 'asc' },
    select: { id: true, title: true }
  });
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin">Admin</Link>
        <h1>Announcements</h1>
        <p>Send a notification to all members, those going to an event, or those who haven’t RSVPed yet.</p>
      </header>
      <AdminAnnouncements events={events} />
    </main>
  );
}

import Link from 'next/link';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import OgPreviewClient from './OgPreviewClient';
import styles from './page.module.css';

export const metadata = {
  title: 'OG Preview | Manchester Gents Admin'
};

async function getEvents() {
  const events = await prisma.event.findMany({
    orderBy: { startTime: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      location: true,
      startTime: true,
      coverImageUrl: true,
      photosOgTitle: true,
      photosOgSubtitle: true,
      photosOgDetail: true
    }
  });

  return events.map((event) => ({
    ...event,
    startTime: event.startTime?.toISOString() || '',
    defaultDetail: event.startTime
      ? `${format(new Date(event.startTime), 'EEEE d MMM yyyy')} • ${event.location || 'The Lodge, Manchester'}`
      : event.location || 'Manchester, United Kingdom'
  }));
}

export default async function AdminOgPreviewPage() {
  const events = await getEvents();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to admin
        </Link>
        <h1>OG preview</h1>
        <p>
          Preview social share cards. Event pages use the standard Manchester Gents card; photo pages can use a
          gallery background and custom photo-share text.
        </p>
      </header>

      <OgPreviewClient events={events} />
    </main>
  );
}

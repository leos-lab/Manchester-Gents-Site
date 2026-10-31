import Link from 'next/link';
import { PINSTRIPE_SITE_SLUG } from '@/lib/pinstripe';
import AdminPhotoCurator from '@/components/admin/AdminPhotoCurator';
import { galleryEvents } from '@/lib/adminGallery';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photos | Manchester Gents Admin' };

export default async function AdminPhotosPage() {
  const events = await galleryEvents();
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin">Admin</Link>
        <h1>Photos</h1>
        <p>Choose which photos members see first for each event, on the home page and the event page. Hide any that shouldn’t be in the gallery.</p>
      </header>
      <AdminPhotoCurator
        events={events}
        apiBase={(process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '')}
        siteSlug={PINSTRIPE_SITE_SLUG}
      />
    </main>
  );
}

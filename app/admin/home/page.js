import Link from 'next/link';
import { getHomeContent } from '@/lib/homeContent';
import { PINSTRIPE_SITE_SLUG } from '@/lib/pinstripe';
import { galleryEvents } from '@/lib/adminGallery';
import AdminHomeEditor from '@/components/admin/AdminHomeEditor';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home page | Manchester Gents Admin' };

export default async function AdminHomePage() {
  const [content, events] = await Promise.all([getHomeContent(), galleryEvents()]);
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/admin">Admin</Link>
        <h1>Home page</h1>
        <p>The hero photo and its words, and the photos that scroll past for visitors who aren’t signed in.</p>
      </header>
      <AdminHomeEditor
        initial={content}
        events={events}
        apiBase={(process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '')}
        siteSlug={PINSTRIPE_SITE_SLUG}
      />
    </main>
  );
}

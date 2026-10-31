import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import EventPhotosClient from '../photos/EventPhotosClient';
import styles from '../photos/page.module.css';
import { getPinstripeAssetsSlug, PINSTRIPE_SITE_SLUG } from '@/lib/pinstripe';

export const metadata = { title: 'Event assets | Manchester Gents', robots: { index: false } };

// Admins only: an event's own gallery for the cover photo and promo material.
// It is a separate Pinstripe gallery, so nothing here shows in the members'
// gallery. Set any photo as the event cover from here.
export default async function EventAssetsPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent(`/events/${params.slug}/assets`)}`);
  if (session.user.role !== 'ADMIN') notFound();

  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, title: true, startTime: true, galleryUrl: true }
  });
  if (!event) notFound();

  return (
    <div className={styles.pageShell}>
      <NavBar />
      <main className={styles.photosMain}>
        <EventPhotosClient
          apiBase={(process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '')}
          siteSlug={PINSTRIPE_SITE_SLUG}
          eventSlug={getPinstripeAssetsSlug(event)}
          eventId={event.id}
          eventTitle={`${event.title} · Event assets`}
          eventDate={event.startTime?.toISOString() || ''}
          eventPageHref={`/events/${event.slug}`}
          assetsMode
        />
      </main>
      <Footer />
    </div>
  );
}

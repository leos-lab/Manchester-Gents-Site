import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EventPhotosClient from './EventPhotosClient';
import styles from './page.module.css';

const DEFAULT_SITE_SLUG = 'manchestergents';

function getPinstripeApiBase() {
  return (process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
}

function getPinstripeEventSlug(event) {
  if (!event.galleryUrl) {
    return event.slug;
  }

  try {
    const url = new URL(event.galleryUrl);
    const [, routeType, routeSlug] = url.pathname.split('/');
    if (routeType === 'event' && routeSlug) {
      return decodeURIComponent(routeSlug);
    }
  } catch {
    // Keep event.slug as the stable fallback when galleryUrl is not a URL.
  }

  return event.slug;
}

async function getEvent(slug) {
  return prisma.event.findUnique({
    where: { slug },
    select: {
      slug: true,
      id: true,
      title: true,
      description: true,
      startTime: true,
      galleryUrl: true,
      photosOgTitle: true,
      photosOgSubtitle: true,
      published: true
    }
  });
}

export async function generateMetadata({ params }) {
  const event = await getEvent(params.slug);

  if (!event || !event.published) {
    return { title: 'Gallery not found | Manchester Gents' };
  }

  const title = event.photosOgTitle || `${event.title} photos | Manchester Gents`;
  const description =
    event.photosOgSubtitle || event.description || 'Photos from a Manchester Gents event at The Lodge.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/events/${params.slug}/opengraph-image`]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/events/${params.slug}/opengraph-image`]
    }
  };
}

export default async function EventPhotosPage({ params }) {
  const event = await getEvent(params.slug);

  if (!event || !event.published) {
    notFound();
  }

  return (
    <div className={styles.pageShell}>
      <NavBar />
      <main className={styles.photosMain}>
        <EventPhotosClient
          apiBase={getPinstripeApiBase()}
          siteSlug={process.env.NEXT_PUBLIC_PINSTRIPE_SITE_SLUG || DEFAULT_SITE_SLUG}
          eventSlug={getPinstripeEventSlug(event)}
          eventId={event.id}
          eventTitle={event.title}
          eventDate={event.startTime?.toISOString() || ''}
          eventPageHref={`/events/${event.slug}`}
        />
      </main>
      <Footer />
    </div>
  );
}

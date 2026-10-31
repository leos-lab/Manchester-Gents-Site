import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { getDisplayName } from '@/lib/displayName';
import { getPinstripeEventSlug, PINSTRIPE_SITE_SLUG } from '@/lib/pinstripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Tells the app which Pinstripe gallery belongs to an event. The app then lists
// photos and uploads straight to Pinstripe, exactly as the website does.
export const GET = v1(async ({ params, user }) => {
  const apiBase = (process.env.NEXT_PUBLIC_PINSTRIPE_API_URL || '').replace(/\/+$/, '');
  if (!apiBase) throw new ApiError('Photo gallery is not configured.', 503);
  const [event, me] = await Promise.all([
    prisma.event.findFirst({
      where: { id: params.eventId, published: true },
      select: { id: true, slug: true, title: true, startTime: true, galleryUrl: true }
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, preferredName: true, shareFirstName: true, name: true, instagramHandle: true }
    })
  ]);
  if (!event) throw new ApiError('Event not found.', 404);
  const handle = me?.instagramHandle ? ` @${me.instagramHandle}` : '';
  return {
    gallery: {
      apiBase,
      siteSlug: PINSTRIPE_SITE_SLUG,
      eventSlug: getPinstripeEventSlug(event),
      eventTitle: event.title,
      eventDate: event.startTime.toISOString().slice(0, 10),
      // Pre-filled in the app instead of asking "who is uploading?" each time.
      uploaderName: `${getDisplayName(me || {})}${handle}`.trim(),
      canDelete: user.role === 'ADMIN'
    }
  };
});

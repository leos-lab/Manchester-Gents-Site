import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { termsChecklist, photographyNotice, privacyPolicy } from '@/lib/consentContent';
import { getPhotoNoticeConfig } from '@/lib/photoNoticeConfig';
import { getHomeContent } from '@/lib/homeContent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public copy the app shows natively: community guidelines (the terms members
// agree to), privacy policy and photography notice, plus cover photos for the
// signed-out welcome screen (the same ones the website's home page shows).
// `hero` is the website's hero photo (chosen in admin mode, with its focus
// point and caption), else the latest event cover.
export const GET = v1(
  async () => {
    const [notice, events, home] = await Promise.all([
      getPhotoNoticeConfig(),
      prisma.event.findMany({
        where: { published: true, coverImageUrl: { not: null } },
        orderBy: { startTime: 'desc' },
        take: 3,
        select: { coverImageUrl: true }
      }),
      getHomeContent()
    ]);
    const photo = home.heroPhoto;
    // The 2048px size from srcSet when there is one: it fills a phone screen.
    const large = photo?.srcSet?.split(',').pop()?.trim().split(' ')[0];
    const hero = photo
      ? { src: large || photo.src, focus: photo.focus || null, caption: home.heroCaption || null }
      : events[0]
        ? { src: events[0].coverImageUrl, focus: null, caption: null }
        : null;
    return {
      guidelines: termsChecklist,
      privacy: privacyPolicy,
      photographyNotice: {
        ...photographyNotice,
        required: Boolean(notice.enabled),
        updatedAt: notice.updatedAt ? notice.updatedAt.toISOString() : null
      },
      hero,
      // Older app builds show these instead of `hero`.
      covers: events.map((e) => e.coverImageUrl)
    };
  },
  { auth: 'public' }
);

import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { termsChecklist, photographyNotice, privacyPolicy } from '@/lib/consentContent';
import { getPhotoNoticeConfig } from '@/lib/photoNoticeConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public copy the app shows natively: community guidelines (the terms members
// agree to), privacy policy and photography notice, plus cover photos for the
// signed-out welcome screen (the same ones the website's home page shows).
export const GET = v1(
  async () => {
    const [notice, events] = await Promise.all([
      getPhotoNoticeConfig(),
      prisma.event.findMany({
        where: { published: true, coverImageUrl: { not: null } },
        orderBy: { startTime: 'desc' },
        take: 3,
        select: { coverImageUrl: true }
      })
    ]);
    return {
      guidelines: termsChecklist,
      privacy: privacyPolicy,
      photographyNotice: {
        ...photographyNotice,
        required: Boolean(notice.enabled),
        updatedAt: notice.updatedAt ? notice.updatedAt.toISOString() : null
      },
      covers: events.map((e) => e.coverImageUrl)
    };
  },
  { auth: 'public' }
);

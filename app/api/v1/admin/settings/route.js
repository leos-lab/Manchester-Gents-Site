import { v1 } from '@/lib/apiV1';
import { getComingSoonConfig } from '@/lib/comingSoonConfig';
import { getPhotoNoticeConfig } from '@/lib/photoNoticeConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Security screen state. Change with POST /api/admin/coming-soon,
// POST /api/admin/photo-notice and POST /api/admin/sessions/invalidate.
export const GET = v1(
  async () => {
    const [comingSoon, photoNotice] = await Promise.all([getComingSoonConfig(), getPhotoNoticeConfig()]);
    return {
      comingSoon: {
        enabled: Boolean(comingSoon.enabled),
        disableAt: comingSoon.disableAt ? new Date(comingSoon.disableAt).toISOString() : null
      },
      photoNotice: {
        enabled: Boolean(photoNotice.enabled),
        updatedAt: photoNotice.updatedAt ? photoNotice.updatedAt.toISOString() : null
      }
    };
  },
  { auth: 'admin' }
);

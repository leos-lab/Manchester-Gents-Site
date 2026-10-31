import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { ADMIN_MEMBER_SELECT, toAdminMember } from '@/lib/adminMembers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One member for admins, with every event they've signed up to. Edit with
// PATCH /api/admin/members/:id; unban from chat with DELETE …/chat-ban.
export const GET = v1(
  async ({ params }) => {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        ...ADMIN_MEMBER_SELECT,
        bio: true,
        termsAgreed: true,
        photoNoticeAgreedAt: true,
        eventsSignedUp: {
          orderBy: { event: { startTime: 'desc' } },
          select: {
            status: true,
            specialRequests: true,
            event: { select: { id: true, title: true, startTime: true } }
          }
        }
      }
    });
    if (!user) throw new ApiError('Member not found.', 404);
    return {
      member: toAdminMember(user, {
        bio: user.bio || null,
        termsAgreed: user.termsAgreed,
        photoNoticeAgreedAt: user.photoNoticeAgreedAt
      }),
      events: user.eventsSignedUp.map((s) => ({ ...s.event, status: s.status, specialRequests: s.specialRequests }))
    };
  },
  { auth: 'admin' }
);

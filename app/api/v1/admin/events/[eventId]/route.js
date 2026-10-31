import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { ADMIN_MEMBER_SELECT, toAdminMember } from '@/lib/adminMembers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One event with its guest list, for the app's event admin screen. Edit with
// PUT /api/events/:id; add or remove guests with /api/admin/events/:id/attendees.
export const GET = v1(
  async ({ params }) => {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      include: {
        attendees: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                ...ADMIN_MEMBER_SELECT,
                _count: { select: { eventsSignedUp: { where: { status: 'CONFIRMED' } } } }
              }
            }
          }
        }
      }
    });
    if (!event) throw new ApiError('Event not found.', 404);
    const { attendees, threadId, groupChatLink, ...fields } = event;
    return {
      event: fields,
      attendees: attendees.map((a) => ({
        status: a.status,
        specialRequests: a.specialRequests || null,
        signedUpAt: a.createdAt,
        member: toAdminMember(a.user, { eventsAttended: a.user._count.eventsSignedUp })
      }))
    };
  },
  { auth: 'admin' }
);

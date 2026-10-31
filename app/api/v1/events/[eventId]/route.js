import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { PUBLIC_MEMBER_SELECT, toPublicMember } from '@/lib/publicProfile';
import { EVENT_CARD_SELECT } from '@/lib/eventFields';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = v1(async ({ params, user }) => {
  // Both at once: the event and this member's RSVP.
  const [event, myRsvp] = await Promise.all([
    prisma.event.findFirst({
      where: { id: params.eventId, published: true },
      select: {
        ...EVENT_CARD_SELECT,
        description: true,
        chatEnabled: true,
        galleryUrl: true,
        attendees: {
          where: { status: 'CONFIRMED', user: { isPlaceholder: false } },
          orderBy: { createdAt: 'asc' },
          select: { userId: true, user: { select: PUBLIC_MEMBER_SELECT } }
        }
      }
    }),
    prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId: params.eventId, userId: user.id } },
      select: { status: true, specialRequests: true }
    })
  ]);
  if (!event) throw new ApiError('Event not found.', 404);
  const { attendees, galleryUrl, ...rest } = event;
  const isPast = event.startTime < new Date();
  return {
    event: {
      ...rest,
      isPast,
      attendeeCount: attendees.length,
      spotsLeft: event.capacity ? Math.max(0, event.capacity - attendees.length) : null,
      // Who's going is visible to people who are going (and admins), matching the chat.
      attendees:
        myRsvp?.status === 'CONFIRMED' || user.role === 'ADMIN' ? attendees.map((a) => toPublicMember(a.user)) : [],
      myRsvp,
      canChat: event.chatEnabled && (myRsvp?.status === 'CONFIRMED' || user.role === 'ADMIN'),
      hasGallery: isPast || Boolean(galleryUrl)
    }
  };
});

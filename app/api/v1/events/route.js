import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { EVENT_CARD_SELECT } from '@/lib/eventFields';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


// GET /api/v1/events?scope=upcoming|past
export const GET = v1(async ({ request, user }) => {
  const scope = new URL(request.url).searchParams.get('scope') === 'past' ? 'past' : 'upcoming';
  const now = new Date();
  const events = await prisma.event.findMany({
    where: { published: true, startTime: scope === 'past' ? { lt: now } : { gte: now } },
    orderBy: { startTime: scope === 'past' ? 'desc' : 'asc' },
    take: 50,
    select: {
      ...EVENT_CARD_SELECT,
      _count: { select: { attendees: { where: { status: 'CONFIRMED' } } } },
      attendees: { where: { userId: user.id }, select: { status: true } }
    }
  });
  return {
    events: events.map(({ _count, attendees, ...e }) => ({
      ...e,
      attendeeCount: _count.attendees,
      spotsLeft: e.capacity ? Math.max(0, e.capacity - _count.attendees) : null,
      myRsvp: attendees[0]?.status || null
    }))
  };
});

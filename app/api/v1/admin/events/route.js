import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Every event, drafts included, newest first. Create with POST /api/events.
export const GET = v1(
  async () => {
    const events = await prisma.event.findMany({
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        startTime: true,
        location: true,
        capacity: true,
        published: true,
        coverImageUrl: true,
        attendees: { select: { status: true } }
      }
    });
    return {
      events: events.map(({ attendees, ...event }) => ({
        ...event,
        confirmed: attendees.filter((a) => a.status === 'CONFIRMED').length,
        waitlisted: attendees.filter((a) => a.status === 'WAITLISTED').length
      }))
    };
  },
  { auth: 'admin' }
);

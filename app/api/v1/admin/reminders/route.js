import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { getDisplayName } from '@/lib/displayName';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Members who haven't RSVPed for the next published event (as on
// /admin/rsvp-reminders). Remind one with POST /api/admin/rsvp-reminders/send,
// which pushes to the app if they have it and emails them otherwise.
export const GET = v1(
  async () => {
    const event = await prisma.event.findFirst({
      where: { startTime: { gte: new Date() }, published: true },
      orderBy: { startTime: 'asc' },
      select: { id: true, title: true, startTime: true }
    });
    if (!event) return { event: null, members: [] };
    const members = await prisma.user.findMany({
      where: {
        isPlaceholder: false,
        role: 'MEMBER',
        eventsSignedUp: { none: { eventId: event.id, status: { in: ['CONFIRMED', 'WAITLISTED'] } } }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        instagramHandle: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        shareFirstName: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { eventsSignedUp: true, pushTokens: true } }
      }
    });
    return {
      event,
      members: members.map((m) => ({
        id: m.id,
        name: getDisplayName(m),
        avatarUrl: m.avatarUrl || null,
        memberSince: m.createdAt,
        eventsSignedUp: m._count.eventsSignedUp,
        hasApp: m._count.pushTokens > 0
      }))
    };
  },
  { auth: 'admin' }
);

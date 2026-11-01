import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { ADMIN_MEMBER_SELECT, toAdminMember } from '@/lib/adminMembers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NEW_MEMBER_DAYS = 14;

// The app's admin dashboard: what needs doing now.
export const GET = v1(
  async () => {
    const since = new Date(Date.now() - NEW_MEMBER_DAYS * 24 * 60 * 60 * 1000);
    const [openReports, upcoming, newMembers, memberCount, betaRequests] = await Promise.all([
      prisma.chatReport.groupBy({ by: ['messageId'], where: { status: 'OPEN' } }).then((rows) => rows.length),
      prisma.event.findMany({
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          startTime: true,
          capacity: true,
          published: true,
          coverImageUrl: true,
          coverFocus: true,
          attendees: { select: { status: true } }
        }
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: since }, isPlaceholder: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: ADMIN_MEMBER_SELECT
      }),
      prisma.user.count({ where: { isPlaceholder: false } }),
      prisma.betaRequest.count({ where: { status: 'PENDING' } })
    ]);
    return {
      openReports,
      memberCount,
      betaRequests,
      upcoming: upcoming.map(({ attendees, ...event }) => ({
        ...event,
        confirmed: attendees.filter((a) => a.status === 'CONFIRMED').length,
        waitlisted: attendees.filter((a) => a.status === 'WAITLISTED').length
      })),
      newMembers: newMembers.map((m) => toAdminMember(m))
    };
  },
  { auth: 'admin' }
);

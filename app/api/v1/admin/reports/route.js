import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';
import { getDisplayName } from '@/lib/displayName';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PERSON = {
  id: true,
  instagramHandle: true,
  firstName: true,
  lastName: true,
  preferredName: true,
  shareFirstName: true,
  name: true,
  chatBannedAt: true
};
const person = (u) => (u ? { id: u.id, name: getDisplayName(u), chatBanned: Boolean(u.chatBannedAt) } : null);

// Open chat reports grouped by message (as on /admin/chat-reports), plus
// members banned from chat. Act with POST /api/admin/chat-reports/:reportId.
export const GET = v1(
  async () => {
    const [open, banned] = await Promise.all([
      prisma.chatReport.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          reason: true,
          createdAt: true,
          reporter: { select: PERSON },
          message: {
            select: {
              id: true,
              body: true,
              createdAt: true,
              deletedAt: true,
              user: { select: PERSON },
              room: { select: { kind: true, event: { select: { title: true } } } }
            }
          }
        }
      }),
      prisma.user.findMany({ where: { chatBannedAt: { not: null } }, select: PERSON, orderBy: { chatBannedAt: 'desc' } })
    ]);
    const byMessage = new Map();
    for (const r of open) {
      const entry = byMessage.get(r.message.id) || {
        message: {
          id: r.message.id,
          body: r.message.deletedAt ? null : r.message.body,
          sentAt: r.message.createdAt,
          author: person(r.message.user),
          where: r.message.room.kind === 'EVENT' ? r.message.room.event?.title || 'Event chat' : 'Direct message'
        },
        reports: []
      };
      entry.reports.push({ id: r.id, reason: r.reason, reportedAt: r.createdAt, reporter: person(r.reporter) });
      byMessage.set(r.message.id, entry);
    }
    return { items: [...byMessage.values()], banned: banned.map(person) };
  },
  { auth: 'admin' }
);

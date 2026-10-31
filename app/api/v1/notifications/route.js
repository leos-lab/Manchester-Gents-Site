import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1 } from '@/lib/apiV1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The member's notification inbox, newest first, with the unread count.
export const GET = v1(async ({ user }) => {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, title: true, body: true, path: true, readAt: true, createdAt: true }
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } })
  ]);
  return { notifications, unread };
});

// POST { ids } marks those read; { all: true } marks everything read.
export const POST = v1(async ({ request, user }) => {
  const { ids, all } = z
    .object({ ids: z.array(z.string()).max(200).optional(), all: z.boolean().optional() })
    .parse(await request.json());
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(all ? {} : { id: { in: ids || [] } }) },
    data: { readAt: new Date() }
  });
  return { unread: await prisma.notification.count({ where: { userId: user.id, readAt: null } }) };
});

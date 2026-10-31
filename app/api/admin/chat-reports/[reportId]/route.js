import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notifyChat } from '@/lib/chatNotify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST { action: "dismiss" | "remove" | "remove_and_ban" }
// "remove" deletes the message for everyone (live in open chats) and resolves
// every open report on it; "remove_and_ban" also stops the author posting in
// any chat until unbanned.
export async function POST(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;

  const { action } = (await request.json().catch(() => ({}))) || {};
  if (!['dismiss', 'remove', 'remove_and_ban'].includes(action)) {
    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const report = await prisma.chatReport.findUnique({
    where: { id: params.reportId },
    select: { id: true, messageId: true, message: { select: { id: true, roomId: true, userId: true } } }
  });
  if (!report) return Response.json({ error: 'Report not found.' }, { status: 404 });

  const now = new Date();
  if (action === 'dismiss') {
    await prisma.chatReport.update({ where: { id: report.id }, data: { status: 'DISMISSED', resolvedAt: now } });
    return Response.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.chatMessage.update({ where: { id: report.messageId }, data: { deletedAt: now } }),
    prisma.chatReport.updateMany({
      where: { messageId: report.messageId, status: 'OPEN' },
      data: { status: 'ACTIONED', resolvedAt: now }
    }),
    ...(action === 'remove_and_ban' && report.message.userId
      ? [prisma.user.update({ where: { id: report.message.userId }, data: { chatBannedAt: now } })]
      : [])
  ]);
  await notifyChat({ type: 'message_deleted', roomId: report.message.roomId, messageId: report.messageId }).catch((e) =>
    console.error('Chat notify failed', e)
  );
  if (action === 'remove_and_ban' && report.message.userId) {
    await notifyChat({ type: 'user_changed', userId: report.message.userId }).catch(() => {});
  }
  return Response.json({ ok: true });
}

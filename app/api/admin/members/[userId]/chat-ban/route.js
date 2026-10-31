import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { notifyChat } from '@/lib/chatNotify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// DELETE: let a member post in chats again.
export async function DELETE(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;
  await prisma.user.update({ where: { id: params.userId }, data: { chatBannedAt: null } });
  await notifyChat({ type: 'user_changed', userId: params.userId }).catch(() => {});
  return Response.json({ ok: true });
}

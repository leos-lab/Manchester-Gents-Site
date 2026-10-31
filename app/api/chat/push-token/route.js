import prisma from '@/lib/prisma';
import { getRequestUser } from '@/lib/requestUser';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

// The app registers its Expo push token after sign-in, and removes it on sign-out.
export async function POST(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  const { token, platform } = (await request.json().catch(() => ({}))) || {};
  if (!EXPO_TOKEN.test(token || '') || !['ios', 'android'].includes(platform)) {
    return Response.json({ error: 'Invalid push token.' }, { status: 400 });
  }
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: user.id, platform },
    create: { token, userId: user.id, platform }
  });
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  const { token } = (await request.json().catch(() => ({}))) || {};
  if (token) await prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
  return Response.json({ ok: true });
}

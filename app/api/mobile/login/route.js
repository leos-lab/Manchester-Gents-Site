import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { getDisplayName } from '@/lib/displayName';
import { getSessionVersion } from '@/lib/sessionVersion';
import { signChatToken } from '@/lib/chatToken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APP_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days; "log everyone out" still works via session version

// Same login as the website (email or Instagram handle + password), returning a
// bearer token the app keeps in the iOS Keychain / Android Keystore.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const identifier = String(body?.identifier || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!identifier || !password) {
    return Response.json({ error: 'Enter your email or Instagram handle and password.' }, { status: 400 });
  }
  if (!process.env.CHAT_TOKEN_SECRET) {
    return Response.json({ error: 'App sign-in is not configured.' }, { status: 500 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { instagramHandle: identifier.replace(/^@/, '') }] }
  });
  const valid = user && !user.isPlaceholder && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    return Response.json({ error: 'Email, handle or password is incorrect.' }, { status: 401 });
  }

  const sv = await getSessionVersion();
  const token = signChatToken(
    { sub: user.id, role: user.role, sv, kind: 'app' },
    process.env.CHAT_TOKEN_SECRET,
    APP_TOKEN_TTL_SECONDS
  );

  return Response.json({
    token,
    user: {
      id: user.id,
      name: getDisplayName(user),
      instagramHandle: user.instagramHandle,
      profilePhotoUrl: user.profilePhotoUrl || null,
      isAdmin: user.role === 'ADMIN',
      termsAgreed: user.termsAgreed
    },
    chatUrl: process.env.CHAT_SERVER_URL || null
  });
}

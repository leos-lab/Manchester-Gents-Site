import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { getDisplayName } from '@/lib/displayName';
import { getSessionVersion } from '@/lib/sessionVersion';
import { signChatToken } from '@/lib/chatToken';
import { requestHost, stageFromHost } from '@/lib/stage';

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

  // Dev and UAT apps are test builds: only beta testers and admins sign in.
  const host = requestHost(request.headers);
  if (stageFromHost(host) !== 'prod' && user.role !== 'ADMIN' && !user.betaApprovedAt) {
    return Response.json(
      { error: `Your account isn’t in the beta yet. Ask to join at ${host}/get-the-app, then sign in once you’re approved.` },
      { status: 403 }
    );
  }

  const sv = await getSessionVersion();
  const token = signChatToken(
    { sub: user.id, role: user.role, sv, uv: user.sessionVersion, kind: 'app' },
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

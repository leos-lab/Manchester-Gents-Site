import { getRequestUser } from '@/lib/requestUser';
import { getSessionVersion } from '@/lib/sessionVersion';
import { signChatToken } from '@/lib/chatToken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Short-lived token the website's chat page uses to open the WebSocket.
export async function GET(request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  const token = signChatToken(
    { sub: user.id, role: user.role, sv: await getSessionVersion(), uv: user.sessionVersion, kind: 'chat' },
    process.env.CHAT_TOKEN_SECRET,
    60 * 60
  );
  return Response.json(
    { token, chatUrl: process.env.CHAT_SERVER_URL || null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

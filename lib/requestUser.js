import { getServerSession } from 'next-auth';
import prisma from './prisma';
import { authOptions } from './auth';
import { verifyChatToken } from './chatToken';
import { getSessionVersion } from './sessionVersion';

// The website signs in with a NextAuth cookie; the iOS/Android app sends
// "Authorization: Bearer <app token>". Routes that both use call this.
export async function getRequestUser(request) {
  const header = request?.headers?.get?.('authorization') || '';
  if (header.startsWith('Bearer ')) {
    const claims = verifyChatToken(header.slice(7), process.env.CHAT_TOKEN_SECRET);
    if (!claims || claims.kind !== 'app') return null;
    if (claims.sv !== (await getSessionVersion())) return null;
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true }
    });
    return user ? { id: user.id, role: user.role, via: 'app' } : null;
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role, via: 'web' };
}

import prisma from '@/lib/prisma';
import { getRequestUser } from '@/lib/requestUser';
import { canReadRoom } from '@/lib/chatAccess';
import { pinstripeRefId } from '@/lib/memberPhotoRef';
import { memberPhotoFileUrl } from '@/lib/pinstripeMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The photo in a chat message, for people who can read that chat only.
// ?v=thumb|medium|display (default display).
export async function GET(request, { params }) {
  const user = await getRequestUser(request);
  if (!user) return new Response('Not signed in', { status: 401 });
  const message = await prisma.chatMessage.findUnique({
    where: { id: params.messageId },
    select: { roomId: true, imageUrl: true, deletedAt: true }
  });
  const photoId = message && !message.deletedAt ? pinstripeRefId(message.imageUrl) : null;
  if (!photoId) return new Response('Not found', { status: 404 });
  if (!(await canReadRoom(user, message.roomId))) return new Response('Forbidden', { status: 403 });

  const asked = new URL(request.url).searchParams.get('v');
  const variant = ['thumb', 'medium'].includes(asked) ? asked : 'display';
  const upstream = await fetch(memberPhotoFileUrl(photoId, variant, 60), { cache: 'no-store' });
  if (!upstream.ok) return new Response('Photo unavailable', { status: 502 });
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

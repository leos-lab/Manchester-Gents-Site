import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PUT { photoIds }: the gallery photos shown first for this event (on the
// home page mosaic and the event page), in this order.
export async function PUT(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) return session;
  const parsed = z.object({ photoIds: z.array(z.string().min(1).max(64)).max(30) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid photo list.' }, { status: 400 });
  const event = await prisma.event
    .update({ where: { id: params.eventId }, data: { featuredPhotoIds: parsed.data.photoIds }, select: { featuredPhotoIds: true } })
    .catch(() => null);
  if (!event) return Response.json({ error: 'Event not found.' }, { status: 404 });
  return Response.json(event);
}

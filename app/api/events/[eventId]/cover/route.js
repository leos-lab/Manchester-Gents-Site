import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const coverSchema = z.object({
  coverImageUrl: z.string().url().nullable()
});

export async function PATCH(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  try {
    const body = await request.json();
    const { coverImageUrl } = coverSchema.parse(body);
    const event = await prisma.event.update({
      where: { id: params.eventId },
      data: { coverImageUrl },
      select: { id: true, coverImageUrl: true }
    });

    return Response.json({ event });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return Response.json({ error: 'A valid cover image URL or null is required.' }, { status: 400 });
    }
    console.error('Update event cover error:', error);
    return Response.json({ error: 'Unable to update event cover.' }, { status: 500 });
  }
}

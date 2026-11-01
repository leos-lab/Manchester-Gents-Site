import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// coverFocus: the point the 16:9 crop centres on, as percentages.
const focusSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
const coverSchema = z.object({
  coverImageUrl: z.string().url().nullable(),
  coverFocus: focusSchema.nullable().optional()
});

export async function PATCH(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  try {
    const body = await request.json();
    const { coverImageUrl, coverFocus } = coverSchema.parse(body);
    const event = await prisma.event.update({
      where: { id: params.eventId },
      // A new cover without a focus point is centred.
      data: { coverImageUrl, coverFocus: coverImageUrl ? coverFocus ?? Prisma.DbNull : Prisma.DbNull },
      select: { id: true, coverImageUrl: true, coverFocus: true }
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

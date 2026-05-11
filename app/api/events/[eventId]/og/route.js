import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const nullableText = (maxLength) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed || null;
    },
    z.string().max(maxLength).nullable().optional()
  );

const nullableUrl = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed || null;
  },
  z.string().url().nullable().optional()
);

const ogSchema = z.object({
  coverImageUrl: nullableUrl,
  photosOgTitle: nullableText(90),
  photosOgSubtitle: nullableText(160),
  photosOgDetail: nullableText(120)
});

export async function PATCH(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) {
    return session;
  }

  try {
    const parsed = ogSchema.parse(await request.json());
    const data = {};

    for (const key of ['coverImageUrl', 'photosOgTitle', 'photosOgSubtitle', 'photosOgDetail']) {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        data[key] = parsed[key];
      }
    }

    const event = await prisma.event.update({
      where: { id: params.eventId },
      data,
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        location: true,
        startTime: true,
        coverImageUrl: true,
        photosOgTitle: true,
        photosOgSubtitle: true,
        photosOgDetail: true
      }
    });

    return Response.json({ event });
  } catch (error) {
    if (error?.name === 'ZodError') {
      return Response.json({ error: 'Check the OG text lengths and background URL.' }, { status: 400 });
    }
    console.error('Update event OG error:', error);
    return Response.json({ error: 'Unable to update OG settings.' }, { status: 500 });
  }
}

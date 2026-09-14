import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  const { eventId, userId } = params;
  if (!eventId || !userId) {
    return Response.json({ error: 'Missing event or user.' }, { status: 400 });
  }

  try {
    const existing = await prisma.eventSignup.findFirst({
      where: {
        eventId,
        userId
      }
    });

    if (!existing) {
      return Response.json({ error: 'Attendee not found on this event.' }, { status: 404 });
    }

    await prisma.eventSignup.delete({ where: { id: existing.id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Remove attendee error:', error);
    return Response.json({ error: 'Unable to remove attendee.' }, { status: 500 });
  }
}

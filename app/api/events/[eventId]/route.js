import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { eventSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeEventInput(data) {
  const eventData = { ...data };
  if (eventData.startTime === '') {
    delete eventData.startTime;
  }
  if (eventData.startTime) {
    eventData.startTime = new Date(eventData.startTime);
  }
  if (Object.prototype.hasOwnProperty.call(eventData, 'endTime')) {
    if (eventData.endTime === '') {
      eventData.endTime = null;
    }
    eventData.endTime = eventData.endTime ? new Date(eventData.endTime) : null;
  }
  if (Object.prototype.hasOwnProperty.call(eventData, 'signupDeadline')) {
    if (eventData.signupDeadline === '') {
      eventData.signupDeadline = null;
    }
    eventData.signupDeadline = eventData.signupDeadline
      ? new Date(eventData.signupDeadline)
      : null;
  }
  return eventData;
}

export async function PUT(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }
  try {
    const body = await request.json();
    const parsed = eventSchema.partial().parse(body);
    const event = await prisma.event.update({
      where: { id: params.eventId },
      data: normalizeEventInput(parsed)
    });
    return Response.json({ event });
  } catch (error) {
    console.error('Update event error:', error);
    return Response.json({ error: 'Unable to update event.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }
  try {
    await prisma.event.delete({ where: { id: params.eventId } });
    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return Response.json({ error: 'Unable to delete event.' }, { status: 500 });
  }
}

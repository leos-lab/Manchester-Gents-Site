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

export async function GET() {
  const events = await prisma.event.findMany({
    where: { published: true },
    orderBy: { startTime: 'asc' }
  });
  return Response.json({ events });
}

export async function POST(request) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }
  try {
    const body = await request.json();
    const parsed = eventSchema.parse(body);
    const event = await prisma.event.create({
      data: normalizeEventInput(parsed)
    });
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    return Response.json({ error: 'Unable to create event.' }, { status: 500 });
  }
}

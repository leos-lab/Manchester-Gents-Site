import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { eventSchema } from '@/lib/validators';
import { pushToUsers } from '@/lib/expoPush';
import { format } from 'date-fns';

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
    // Every event has a group chat; members going are in it automatically.
    await prisma.chatRoom.create({ data: { id: `evt_${event.id}`, kind: 'EVENT', eventId: event.id } });
    await announceNewEvent(event).catch((error) => console.error('New event push failed', error));
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    return Response.json({ error: 'Unable to create event.' }, { status: 500 });
  }
}

// Lets every member with the app know a new event is open for RSVPs.
async function announceNewEvent(event) {
  if (!event.published || new Date(event.startTime) <= new Date()) return;
  const members = await prisma.pushToken.findMany({ distinct: ['userId'], select: { userId: true } });
  await pushToUsers(
    members.map((m) => m.userId),
    {
      title: 'New Manchester Gents event',
      body: `${event.title} · ${format(new Date(event.startTime), 'EEE d MMM')}. Tap to reserve your spot.`,
      data: { eventId: event.id, url: `mcrgents://event/${event.id}` }
    }
  );
}

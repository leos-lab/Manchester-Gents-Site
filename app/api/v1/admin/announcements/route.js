import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v1, ApiError } from '@/lib/apiV1';
import { pushToUsers } from '@/lib/expoPush';
import { notifyChat } from '@/lib/chatNotify';
import { getDisplayName } from '@/lib/displayName';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COMMUNITY_ROOM_ID = 'community'; // chat-server/src/store.js

const schema = z
  .object({
    title: z.string().trim().min(2, 'Add a title.').max(80),
    body: z.string().trim().min(2, 'Add a message.').max(1000),
    // What it's about: an event, or null for general news.
    eventId: z.string().min(1).nullable().optional(),
    // ALL members, members GOING to the event, or members who have NOT_RSVPED to it.
    audience: z.enum(['ALL', 'GOING', 'NOT_RSVPED'])
  })
  .refine((a) => a.audience === 'ALL' || a.eventId, {
    message: 'Choose the event this is about.',
    path: ['eventId']
  });

async function audienceIds(audience, eventId) {
  const members = { isPlaceholder: false };
  if (audience === 'GOING') {
    const going = await prisma.eventSignup.findMany({
      where: { eventId, status: 'CONFIRMED', user: members },
      select: { userId: true }
    });
    return going.map((s) => s.userId);
  }
  const users = await prisma.user.findMany({
    where:
      audience === 'NOT_RSVPED'
        ? { ...members, eventsSignedUp: { none: { eventId, status: { in: ['CONFIRMED', 'WAITLISTED'] } } } }
        : members,
    select: { id: true }
  });
  return users.map((u) => u.id);
}

// Recent announcements, newest first.
export const GET = v1(
  async () => {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        event: { select: { id: true, title: true } },
        createdBy: { select: { firstName: true, lastName: true, preferredName: true, shareFirstName: true, name: true, instagramHandle: true } }
      }
    });
    return {
      announcements: announcements.map(({ createdBy, ...a }) => ({ ...a, createdBy: createdBy ? getDisplayName(createdBy) : null }))
    };
  },
  { auth: 'admin' }
);

// Push to the audience, and post it in the chat they'll see it in: the
// community chat for everyone, the event chat for those going. (Members who
// haven't RSVPed get the push only.)
export const POST = v1(
  async ({ request, user }) => {
    const data = schema.parse(await request.json());
    const event = data.eventId
      ? await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true, title: true } })
      : null;
    if (data.eventId && !event) throw new ApiError('Event not found.', 404);

    const userIds = await audienceIds(data.audience, event?.id);
    const delivered = await pushToUsers(userIds, {
      title: `📣 ${data.title}`,
      body: data.body,
      data: event ? { eventId: event.id, path: `/event/${event.id}` } : { roomId: COMMUNITY_ROOM_ID }
    });

    const roomId =
      data.audience === 'ALL'
        ? (
            await prisma.chatRoom.upsert({
              where: { id: COMMUNITY_ROOM_ID },
              update: {},
              create: { id: COMMUNITY_ROOM_ID, kind: 'COMMUNITY' }
            })
          ).id
        : data.audience === 'GOING'
          ? (
              await prisma.chatRoom.upsert({
                where: { eventId: event.id },
                update: {},
                create: { id: `evt_${event.id}`, kind: 'EVENT', eventId: event.id }
              })
            ).id
          : null;
    if (roomId) {
      const message = await prisma.chatMessage.create({
        data: {
          roomId,
          userId: user.id,
          kind: 'ANNOUNCEMENT',
          body: `${data.title}\n${data.body}${event && data.audience === 'ALL' ? `\nAbout: ${event.title}` : ''}`
        }
      });
      await prisma.chatRoom.update({ where: { id: roomId }, data: { lastMessageAt: message.createdAt } });
      await notifyChat({ type: 'message_created', roomId, messageId: message.id }).catch((e) =>
        console.error('Chat notify failed', e)
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        eventId: event?.id || null,
        audience: data.audience,
        createdById: user.id,
        recipients: userIds.length
      }
    });
    return { announcement, recipients: userIds.length, delivered };
  },
  { auth: 'admin' }
);

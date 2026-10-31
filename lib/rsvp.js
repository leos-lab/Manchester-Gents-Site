import prisma from './prisma';
import { getDisplayName } from './displayName';
import { sendMakeWebhook, buildEventSignupPayload } from './makeWebhook';

export class RsvpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Shared by the website and the app. Confirming an RSVP is what puts a member
// in the event's group chat (the chat server reads EventSignup directly).
export async function createRsvp({ userId, eventId, specialRequests = null }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      termsAgreed: true,
      instagramHandle: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      shareFirstName: true,
      name: true
    }
  });
  if (!user || !user.termsAgreed) {
    throw new RsvpError(
      'Please review and accept the latest Manchester Gents terms from your profile before reserving a spot.'
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      signupDeadline: true,
      capacity: true,
      attendees: { where: { status: 'CONFIRMED' }, select: { userId: true } }
    }
  });
  if (!event || !event.published) throw new RsvpError('Event not found.', 404);
  if (event.signupDeadline && new Date(event.signupDeadline) < new Date()) {
    throw new RsvpError('Signups are closed for this event.');
  }
  if (event.attendees.some((a) => a.userId === userId)) {
    throw new RsvpError('You have already booked this event.');
  }
  if (event.capacity && event.attendees.length >= event.capacity) {
    throw new RsvpError('The event has reached capacity.');
  }

  // Upsert so a member who cancelled (or was waitlisted) can book again.
  const signup = await prisma.eventSignup.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status: 'CONFIRMED', specialRequests },
    create: { eventId, userId, specialRequests }
  });

  // Admin notification via Make.com (unchanged); no Instagram group-chat calls.
  await sendMakeWebhook(
    buildEventSignupPayload({
      action: 'event-sign-up',
      memberId: userId,
      memberSlug: user.instagramHandle || userId,
      memberName: getDisplayName(user),
      instagramHandle: user.instagramHandle || null,
      eventSignupId: signup.id,
      eventSlug: event.slug,
      eventName: event.title,
      groupChatLink: null,
      specialRequests,
      actionRequiredMessageId: null
    })
  );

  return signup;
}

export async function cancelRsvp({ userId, eventId }) {
  const deleted = await prisma.eventSignup.deleteMany({ where: { eventId, userId } });
  if (deleted.count === 0) throw new RsvpError('No registration found to cancel.', 404);
}

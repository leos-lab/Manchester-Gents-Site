import { v1, ApiError } from '@/lib/apiV1';
import { eventSignupSchema } from '@/lib/validators';
import { createRsvp, cancelRsvp, RsvpError } from '@/lib/rsvp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const rethrow = (error) => {
  if (error instanceof RsvpError) throw new ApiError(error.message, error.status);
  throw error;
};

export const POST = v1(async ({ request, params, user }) => {
  const form = eventSignupSchema.parse((await request.json().catch(() => ({}))) || {});
  const signup = await createRsvp({
    userId: user.id,
    eventId: params.eventId,
    specialRequests: form.specialRequests ?? null
  }).catch(rethrow);
  return { rsvp: { status: signup.status, specialRequests: signup.specialRequests } };
});

export const DELETE = v1(async ({ params, user }) => {
  await cancelRsvp({ userId: user.id, eventId: params.eventId }).catch(rethrow);
  return { rsvp: null };
});

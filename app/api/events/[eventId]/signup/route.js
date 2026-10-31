import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eventSignupSchema } from '@/lib/validators';
import { createRsvp, cancelRsvp, RsvpError } from '@/lib/rsvp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) || {};
    const form = eventSignupSchema.parse(body);
    const signup = await createRsvp({
      userId: session.user.id,
      eventId: params.eventId,
      specialRequests: form.specialRequests ?? null
    });
    return Response.json({ signup }, { status: 201 });
  } catch (error) {
    if (error instanceof RsvpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error?.name === 'ZodError') {
      return Response.json({ error: error.issues?.[0]?.message || 'Invalid form submission.' }, { status: 400 });
    }
    console.error('Event signup error:', error);
    return Response.json({ error: 'Unable to sign up for event.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  try {
    await cancelRsvp({ userId: session.user.id, eventId: params.eventId });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RsvpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Event signup cancel error:', error);
    return Response.json({ error: 'Unable to cancel your spot right now.' }, { status: 500 });
  }
}

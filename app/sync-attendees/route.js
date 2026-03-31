import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { syncAttendeesToInstagramThread } from '@/lib/instagramAutomation';

const syncAttendeesSchema = z.object({
  threadId: z.string().trim().min(1, 'No Instagram thread linked to this event.'),
  attendees: z.array(z.string()).default([]),
  addMissing: z.boolean().optional().default(false)
});

function normaliseUsername(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/^@+/, '').toLowerCase();
}

export async function POST(request) {
  const session = await requireAuth('ADMIN');
  if (session instanceof Response) {
    return session;
  }

  try {
    const payload = await request.json();
    const parsed = syncAttendeesSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid attendee sync payload.' },
        { status: 400 }
      );
    }

    const attendees = Array.from(
      new Set(parsed.data.attendees.map((attendee) => normaliseUsername(attendee)).filter(Boolean))
    );

    if (attendees.length === 0) {
      return NextResponse.json(
        { error: 'No attendee usernames available to sync.' },
        { status: 400 }
      );
    }

    const result = await syncAttendeesToInstagramThread({
      threadId: parsed.data.threadId.trim(),
      attendees,
      addMissing: parsed.data.addMissing
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error?.message || 'Unable to sync attendees right now.';
    if (Number.isFinite(error?.status)) {
      return NextResponse.json(error.body || { error: message }, { status: error.status });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

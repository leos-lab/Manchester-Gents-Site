import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getComingSoonConfig, upsertComingSoonConfig } from '@/lib/comingSoonConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseDisableAt(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function responsePayload(config) {
  const disableAtMs = config.disableAt ? config.disableAt.getTime() : null;
  const isExpired = disableAtMs !== null && Date.now() >= disableAtMs;
  const active = Boolean(config.enabled) && !isExpired;
  return {
    enabled: Boolean(config.enabled),
    disableAt: config.disableAt ? config.disableAt.toISOString() : null,
    active,
    source: config.source || 'db'
  };
}

export async function GET() {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  const config = await getComingSoonConfig();
  return NextResponse.json(responsePayload(config));
}

export async function POST(req) {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  let payload = {};
  try {
    payload = await req.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (typeof payload.enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing or invalid "enabled" boolean in request body.' },
      { status: 400 }
    );
  }

  const disableAt = parseDisableAt(payload.disableAt);
  if (payload.disableAt && !disableAt) {
    return NextResponse.json(
      { error: 'Invalid "disableAt" timestamp. Use an ISO string or leave blank.' },
      { status: 400 }
    );
  }

  try {
    const updated = await upsertComingSoonConfig({
      enabled: payload.enabled,
      disableAt
    });
    return NextResponse.json(responsePayload({ ...updated, source: 'db' }));
  } catch (error) {
    console.error('Error updating coming-soon config:', error);
    return NextResponse.json(
      { error: 'Unable to save coming-soon settings right now.' },
      { status: 500 }
    );
  }
}

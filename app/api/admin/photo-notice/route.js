import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPhotoNoticeConfig, upsertPhotoNoticeConfig } from '@/lib/photoNoticeConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function responsePayload(config) {
  return {
    enabled: Boolean(config.enabled),
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null
  };
}

export async function GET() {
  const session = await requireAuth('ADMIN');
  if (!session.user) {
    return session;
  }

  const config = await getPhotoNoticeConfig();
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

  try {
    const updated = await upsertPhotoNoticeConfig({ enabled: payload.enabled });
    return NextResponse.json(responsePayload(updated));
  } catch (error) {
    console.error('Error updating photo-notice config:', error);
    return NextResponse.json(
      { error: 'Unable to save photography notice settings right now.' },
      { status: 500 }
    );
  }
}

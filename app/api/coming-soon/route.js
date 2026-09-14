import { NextResponse } from 'next/server';
import { getComingSoonConfig } from '@/lib/comingSoonConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const config = await getComingSoonConfig();
  const disableAtMs = config.disableAt ? config.disableAt.getTime() : null;
  const isExpired = disableAtMs !== null && Date.now() >= disableAtMs;

  return NextResponse.json({
    enabled: Boolean(config.enabled),
    disableAt: config.disableAt ? config.disableAt.toISOString() : null,
    active: Boolean(config.enabled) && !isExpired,
    source: config.source
  });
}

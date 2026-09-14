import { NextResponse } from 'next/server';
import { getSessionVersion } from '@/lib/sessionVersion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const version = await getSessionVersion();
  return NextResponse.json({ version });
}
